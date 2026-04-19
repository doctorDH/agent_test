/**
 * GameScene.ts - 游戏主场景
 * 深青/墨绿背景 + 顶栏 + 棋盘 + 底栏
 * 完整的牌选择、匹配、消除、连击、通关逻辑
 */

import type { IEventBus, IScene, BoardState, GameSession, LevelStats, LevelDefinition } from '../types';
import { SceneType, TileState } from '../types';
import { TileRenderer } from '../rendering/TileRenderer';
import { BoardRenderer, type BoardLayout } from '../rendering/BoardRenderer';
import { UIRenderer, type Rect } from '../rendering/UIRenderer';
import { AnimationManager, Easings } from '../rendering/AnimationManager';
import { ParticleSystem } from '../rendering/ParticleSystem';
import { createBoard, removeTilePair } from '../logic/BoardEngine';
import { isFreeTile, findAllFreePairs } from '../logic/MatchingEngine';
import { calculateMatchScore, isInComboWindow, calculateTimeBonus } from '../logic/ScoreEngine';
import { shuffleBoard } from '../logic/ShuffleEngine';
import { getLevel, getLevelCount } from '../levels/LevelManager';
import type { ProgressManager, SerializedGameSave } from '../core/ProgressManager';
import type { SoundManager } from '../audio/SoundManager';
import { SettingsPanel } from './SettingsPanel';
import { AgentOrchestrator } from '../agents/AgentOrchestrator';
import { HintAgent } from '../agents/HintAgent';
import { DifficultyAgent } from '../agents/DifficultyAgent';
import type { AgentEvent } from '../types/agents';
import { AgentEventType } from '../types/agents';

/** 设计宽度 */
const DESIGN_WIDTH = 750;

/** 顶栏高度 */
const TOP_BAR_HEIGHT = 80;

/** 底栏区域高度 */
const BOTTOM_BAR_HEIGHT = 120;

/** 消除动画时长 ms */
const MATCH_ANIM_DURATION = 250;

/** 连击提示显示时长 ms */
const COMBO_SHOW_DURATION = 1200;

/** 浮动消息显示时长 ms */
const FLOAT_MSG_DURATION = 1000;

/** 分数飘字持续时长 ms */
const SCORE_FLOAT_DURATION = 800;

/** 分数飘字上浮距离 px */
const SCORE_FLOAT_RISE = 40;

/** 分数飘字信息 */
interface ScoreFloat {
  text: string;
  x: number;
  y: number;
  timeLeft: number;
  maxTime: number;
  isCombo: boolean;
}

export class GameScene implements IScene {
  private eventBus: IEventBus;
  private getDesignHeight: () => number;
  private progressManager: ProgressManager;
  private soundManager: SoundManager;

  // ── 渲染器实例 ─────────────────────────────────
  private tileRenderer: TileRenderer;
  private boardRenderer: BoardRenderer;
  private uiRenderer: UIRenderer;
  private animManager: AnimationManager;
  private particleSystem: ParticleSystem;

  // ── 游戏状态 ───────────────────────────────────
  private session: GameSession | null = null;
  private levelDef: LevelDefinition | null = null;
  private boardLayout: BoardLayout = { offsetX: 0, offsetY: 0, scale: 1 };
  private freeTileIds: Set<number> = new Set();

  // ── 按钮区域 ───────────────────────────────────
  private backBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private menuBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private shuffleBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private hintBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // ── 连击判定 ───────────────────────────────────
  private lastMatchTime = 0;

  // ── 消除动画中锁定交互 ─────────────────────────
  private animating = false;

  // ── 待消除的牌对（动画结束后真正移除） ─────────
  private pendingRemoval: { id1: number; id2: number } | null = null;

  // ── 浮动提示消息 ──────────────────────────────
  private floatingMsg: { text: string; timeLeft: number } | null = null;

  // ── 连击显示（定时淡出） ──────────────────────
  private comboShowTime = 0;
  private comboDisplayValue = 0;

  // ── 死锁标记（无可用配对但还有牌未消除） ─────
  private deadlocked = false;

  // ── 后台暂停 ──────────────────────────────────
  private pauseTimestamp = 0;

  // ── 分数飘字 ──────────────────────────────────
  private scoreFloats: ScoreFloat[] = [];

  // ── 中途存档对话框 ───────────────────────────────
  private showResumeDialog = false;
  private pendingSave: SerializedGameSave | null = null;
  private resumeBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private restartBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // ── 设置面板 ──────────────────────────────────
  private settingsPanel: SettingsPanel;

  // ── Agent 编排器 ──────────────────────────────
  private orchestrator: AgentOrchestrator | null = null;

  constructor(eventBus: IEventBus, getDesignHeight: () => number, progressManager: ProgressManager, soundManager: SoundManager) {
    this.eventBus = eventBus;
    this.getDesignHeight = getDesignHeight;
    this.progressManager = progressManager;
    this.soundManager = soundManager;

    this.tileRenderer = new TileRenderer();
    this.boardRenderer = new BoardRenderer(this.tileRenderer);
    this.uiRenderer = new UIRenderer();
    this.animManager = new AnimationManager();
    this.particleSystem = new ParticleSystem();
    this.settingsPanel = new SettingsPanel(progressManager, soundManager);
    this.settingsPanel.setOnRestart(() => {
      if (this.session) {
        this.progressManager.clearGameSave();
        this.startFreshLevel(this.session.levelId);
      }
    });
  }

  enter(data?: unknown): void {
    // 1. 获取 levelId
    let levelId = 1;
    if (data && typeof data === 'object' && 'levelId' in data) {
      const id = (data as { levelId: number }).levelId;
      if (typeof id === 'number' && id >= 1) {
        levelId = id;
      }
    }

    // 限制关卡范围
    if (levelId > getLevelCount()) {
      levelId = 1;
    }

    // 检查是否有中途存档
    const save = this.progressManager.loadGameSave(levelId);
    if (save) {
      this.pendingSave = save;
      this.showResumeDialog = true;
      this.levelDef = getLevel(levelId);
      // 注册后台暂停监听
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      return;
    }

    this.startFreshLevel(levelId);
  }

  /** 以全新状态开始指定关卡 */
  private startFreshLevel(levelId: number): void {
    // 2. 获取关卡定义
    this.levelDef = getLevel(levelId);
    const { layout, tilePool, difficulty } = this.levelDef;

    // 3. 创建棋盘
    const board = createBoard(layout, tilePool);

    // 4. 初始化 GameSession
    this.session = {
      levelId,
      board,
      score: 0,
      matchCount: 0,
      comboChain: 0,
      maxCombo: 0,
      startTime: Date.now(),
      elapsedMs: 0,
      shufflesRemaining: difficulty.initialShuffles,
      hintsRemaining: difficulty.initialHints,
      status: 'playing',
    };

    // 5. 计算棋盘布局（居中在顶栏和底栏之间的区域）
    this.recalculateBoardLayout();

    // 6. 缓存自由牌
    this.refreshFreeTiles();

    // 重置状态
    this.resetInternalState();

    // 注册后台暂停监听
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 启动背景音乐
    this.soundManager.startBGM();

    // 初始化 Agent 编排器
    this.initAgentOrchestrator();
  }

  /** 从存档恢复游戏 */
  private restoreFromSave(save: SerializedGameSave): void {
    // 重建 tiles Map
    const tilesMap = new Map<number, import('../types').Tile>();
    for (const t of save.tiles) {
      tilesMap.set(t.id, {
        id: t.id,
        type: t.type,
        position: t.position,
        state: t.state,
      });
    }

    const board: BoardState = {
      config: save.boardConfig,
      tiles: tilesMap,
      selectedTileId: save.selectedTileId,
      removedCount: save.removedCount,
      totalCount: save.totalCount,
      moveHistory: [],
    };

    this.session = {
      levelId: save.levelId,
      board,
      score: save.score,
      matchCount: save.matchCount,
      comboChain: save.comboChain,
      maxCombo: save.maxCombo,
      startTime: Date.now() - save.elapsedMs,
      elapsedMs: save.elapsedMs,
      shufflesRemaining: save.shufflesRemaining,
      hintsRemaining: save.hintsRemaining,
      status: 'playing',
    };

    this.levelDef = getLevel(save.levelId);
    this.recalculateBoardLayout();
    this.refreshFreeTiles();
    this.resetInternalState();

    // 启动背景音乐
    this.soundManager.startBGM();

    // 从存档恢复也初始化 Agent 编排器
    this.initAgentOrchestrator();
  }

  /** 重置内部状态变量 */
  private resetInternalState(): void {
    this.lastMatchTime = 0;
    this.animating = false;
    this.pendingRemoval = null;
    this.floatingMsg = null;
    this.comboShowTime = 0;
    this.comboDisplayValue = 0;
    this.deadlocked = false;
    this.pauseTimestamp = 0;
    this.scoreFloats = [];
    this.showResumeDialog = false;
    this.pendingSave = null;
    this.animManager.cancelAll();
  }

  /** 初始化 Agent 编排器 */
  private initAgentOrchestrator(): void {
    // 销毁旧编排器
    this.orchestrator?.disposeAll();

    this.orchestrator = new AgentOrchestrator();
    this.orchestrator.registerAgent(new HintAgent());
    this.orchestrator.registerAgent(new DifficultyAgent());
    this.orchestrator.initializeAll({
      session: this.session!,
      emitEvent: (event: AgentEvent) => this.handleAgentEvent(event),
    });
  }

  /** 处理 Agent 发出的事件 */
  private handleAgentEvent(event: AgentEvent): void {
    if (event.type === AgentEventType.HintSuggestion) {
      // Agent 建议提示：高亮配对牌 + 浮动消息
      const payload = event.payload as { pair: [number, number]; totalAvailable: number };
      if (payload && this.session?.status === 'playing') {
        this.clearSelections();
        const [id1, id2] = payload.pair;
        const tile1 = this.session.board.tiles.get(id1);
        const tile2 = this.session.board.tiles.get(id2);
        if (tile1) tile1.state = TileState.Highlighted;
        if (tile2) tile2.state = TileState.Highlighted;
        this.floatingMsg = { text: `💡 试试这对牌？(共${payload.totalAvailable}对可消)`, timeLeft: FLOAT_MSG_DURATION * 2 };
      }
    } else if (event.type === AgentEventType.DifficultyAdjustment) {
      // Agent 难度评估：记录到控制台（后续可扩展为动态调难度）
      const payload = event.payload as { difficulty: string; reason: string };
      if (payload) {
        console.log(`[DifficultyAgent] ${payload.difficulty}: ${payload.reason}`);
      }
    }
  }

  exit(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.soundManager.stopBGM();
    this.animManager.cancelAll();
    this.orchestrator?.disposeAll();
    this.orchestrator = null;
    this.session = null;
    this.levelDef = null;
  }

  update(dt: number): void {
    if (!this.session) return;

    // 更新动画管理器
    this.animManager.update(dt);

    // 更新粒子系统
    this.particleSystem.update(dt);

    // 更新高亮脉冲
    this.tileRenderer.updateHighlight(dt);

    // 更新计时器
    if (this.session.status === 'playing') {
      this.session.elapsedMs = Date.now() - this.session.startTime;
    }

    // 更新浮动提示倒计时
    if (this.floatingMsg) {
      this.floatingMsg.timeLeft -= dt;
      if (this.floatingMsg.timeLeft <= 0) this.floatingMsg = null;
    }

    // 更新连击显示倒计时
    if (this.comboShowTime > 0) {
      this.comboShowTime -= dt;
    }

    // 更新分数飘字倒计时
    for (let i = this.scoreFloats.length - 1; i >= 0; i--) {
      this.scoreFloats[i].timeLeft -= dt;
      if (this.scoreFloats[i].timeLeft <= 0) {
        this.scoreFloats.splice(i, 1);
      }
    }

    // 更新 Agent 编排器
    if (this.orchestrator && this.session) {
      this.orchestrator.updateAll(this.session, dt);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = DESIGN_WIDTH;
    const h = this.getDesignHeight();

    // ── 存档恢复对话框 ──────────────────────────────
    if (this.showResumeDialog) {
      this.renderResumeDialog(ctx, w, h);
      return;
    }

    if (!this.session) return;

    const { board } = this.session;

    // 1. 背景（深青/墨绿渐变）
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#004D40');
    bgGrad.addColorStop(1, '#00695C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. 顶栏
    const topBarResult = this.uiRenderer.drawGameTopBar(
      ctx,
      w,
      this.session.levelId,
      this.session.score,
      this.session.matchCount,
    );
    this.backBtn = topBarResult.backBtn;
    this.menuBtn = topBarResult.menuBtn;

    // 3. 棋盘
    this.boardRenderer.drawBoard(ctx, board, this.freeTileIds, this.boardLayout);

    // 3.5 粒子特效（棋盘之上）
    this.particleSystem.render(ctx);

    // 3.6 分数飘字
    for (const sf of this.scoreFloats) {
      const progress = 1 - sf.timeLeft / sf.maxTime;
      const alpha = 1 - progress;
      const offsetY = -SCORE_FLOAT_RISE * progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = sf.isCombo ? '#FFD700' : '#FFFFFF';
      ctx.font = sf.isCombo ? 'bold 22px sans-serif' : 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(sf.text, sf.x, sf.y + offsetY);
      ctx.restore();
    }

    // 4. 底栏
    const bottomBarResult = this.uiRenderer.drawGameBottomBar(
      ctx,
      w,
      h,
      this.session.shufflesRemaining,
      this.session.hintsRemaining,
    );
    this.shuffleBtn = bottomBarResult.shuffleBtn;
    this.hintBtn = bottomBarResult.hintBtn;

    // 5. 连击提示（小号气泡，定时淡出，含加成倍数）
    if (this.comboShowTime > 0 && this.comboDisplayValue > 1) {
      const alpha = Math.min(1, this.comboShowTime / 300); // 最后 300ms 淡出
      ctx.save();
      ctx.globalAlpha = alpha;

      // 气泡背景（双行：连击 + 加成倍数）
      const comboText = `${this.comboDisplayValue} 连击!`;
      const bonusText = `加成 x${this.comboDisplayValue}`;
      ctx.font = 'bold 20px sans-serif';
      const mainWidth = ctx.measureText(comboText).width;
      ctx.font = '14px sans-serif';
      const subWidth = ctx.measureText(bonusText).width;
      const bubbleW = Math.max(mainWidth, subWidth) + 28;
      const bubbleH = 50;
      const bubbleX = w / 2 - bubbleW / 2;
      const bubbleY = TOP_BAR_HEIGHT + 4;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.fillRoundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 16);

      // 主文本：连击数
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comboText, w / 2, bubbleY + 18);

      // 副文本：加成倍数
      ctx.fillStyle = 'rgba(255,215,0,0.7)';
      ctx.font = '14px sans-serif';
      ctx.fillText(bonusText, w / 2, bubbleY + 38);

      ctx.restore();
    }

    // 6. 浮动提示消息（居中半透明气泡）
    if (this.floatingMsg) {
      const alpha = Math.min(1, this.floatingMsg.timeLeft / 200); // 最后 200ms 淡出
      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.font = '18px sans-serif';
      const msgW = ctx.measureText(this.floatingMsg.text).width + 32;
      const msgH = 36;
      const msgX = w / 2 - msgW / 2;
      const msgY = h / 2 - msgH / 2;

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.fillRoundRect(ctx, msgX, msgY, msgW, msgH, 18);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.floatingMsg.text, w / 2, h / 2);

      ctx.restore();
    }

    // 7. 暂停遮罩
    if (this.session.status === 'paused') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('已暂停', w / 2, h / 2);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('返回游戏自动继续', w / 2, h / 2 + 40);
      ctx.restore();
    }

    // 8. 设置面板（最上层）
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.render(ctx, w, h);
    }
  }

  onPointerDown(x: number, y: number): void {
    // ── 存档恢复对话框交互 ────────────────────────
    if (this.showResumeDialog) {
      this.handleResumeDialogClick(x, y);
      return;
    }

    // ── 设置面板交互 ──────────────────────────────
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.onPointerDown(x, y);
      return;
    }

    if (!this.session || this.session.status !== 'playing') return;
    if (this.animating) return;

    // 1. 检查顶栏返回按钮 → 保存进度后退出
    if (this.hitTest(x, y, this.backBtn)) {
      // 游戏进行中时保存存档
      if (this.session.status === 'playing' || this.session.status === 'paused') {
        this.progressManager.saveGameSession(this.session);
      }
      this.eventBus.emit({
        type: 'scene_change',
        from: SceneType.Game,
        to: SceneType.Begin,
        data: { levelId: this.session.levelId },
      });
      return;
    }

    // 2. 检查顶栏菜单按钮 → 打开设置面板
    if (this.hitTest(x, y, this.menuBtn)) {
      this.settingsPanel.open();
      return;
    }

    // 3. 检查底栏打乱按钮
    if (this.hitTest(x, y, this.shuffleBtn)) {
      this.handleShuffle();
      return;
    }

    // 4. 检查底栏提示按钮
    if (this.hitTest(x, y, this.hintBtn)) {
      this.handleHint();
      return;
    }

    // 5. 检查棋盘命中
    this.handleBoardClick(x, y);
  }

  onPointerUp(_x: number, _y: number): void {
    // 无需处理
  }

  // ═══════════════════════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════════════════════

  /** 浏览器可见性变化处理（切后台暂停计时） */
  private handleVisibilityChange = (): void => {
    if (!this.session || this.session.status === 'won' || this.session.status === 'lost') return;

    if (document.hidden) {
      this.pauseTimestamp = Date.now();
      this.session.status = 'paused';
      this.soundManager.pauseBGM();
    } else {
      if (this.pauseTimestamp > 0) {
        const pausedDuration = Date.now() - this.pauseTimestamp;
        this.session.startTime += pausedDuration;
        this.pauseTimestamp = 0;
      }
      this.session.status = 'playing';
      this.soundManager.resumeBGM();
    }
  };

  /** 重新计算棋盘布局（居中在顶栏与底栏之间） */
  private recalculateBoardLayout(): void {
    if (!this.session) return;
    const h = this.getDesignHeight();
    const areaX = 10;
    const areaY = TOP_BAR_HEIGHT + 10;
    const areaW = DESIGN_WIDTH - 20;
    const areaH = h - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT - 20;

    this.boardLayout = this.boardRenderer.calculateLayout(
      this.session.board.config,
      areaX,
      areaY,
      areaW,
      areaH,
    );
  }

  /** 刷新自由牌缓存 */
  private refreshFreeTiles(): void {
    if (!this.session) return;
    this.freeTileIds.clear();
    for (const tile of this.session.board.tiles.values()) {
      if (tile.state !== TileState.Removed && isFreeTile(this.session.board, tile.id)) {
        this.freeTileIds.add(tile.id);
      }
    }
  }

  /** 矩形命中检测 */
  private hitTest(x: number, y: number, rect: Rect): boolean {
    return x >= rect.x && x <= rect.x + rect.w &&
           y >= rect.y && y <= rect.y + rect.h;
  }

  /** 计算牌的屏幕中心坐标（用于粒子发射） */
  private getTileScreenCenter(pos: { col: number; row: number; layer: number }): { x: number; y: number } {
    const HALF_CELL_W = (TileRenderer.TILE_WIDTH + 8) / 2; // 30
    const HALF_CELL_H = (TileRenderer.TILE_HEIGHT + 8) / 2; // 38
    const { offsetX, offsetY, scale } = this.boardLayout;
    const x = offsetX + pos.col * HALF_CELL_W * scale - pos.layer * TileRenderer.DEPTH_OFFSET * scale
              + TileRenderer.TILE_WIDTH * scale / 2;
    const y = offsetY + pos.row * HALF_CELL_H * scale - pos.layer * TileRenderer.DEPTH_OFFSET * scale
              + TileRenderer.TILE_HEIGHT * scale / 2;
    return { x, y };
  }

  /** 处理打乱按钮 */
  private handleShuffle(): void {
    if (!this.session) return;
    if (this.session.shufflesRemaining <= 0) return;

    // 清除所有非 Normal 状态（除了 Removed）
    this.clearSelections();

    this.session.board = shuffleBoard(this.session.board);
    this.session.shufflesRemaining--;
    this.refreshFreeTiles();
    this.checkDeadlock();
  }

  /** 处理提示按钮 */
  private handleHint(): void {
    if (!this.session) return;
    if (this.session.hintsRemaining <= 0) return;

    const pairs = findAllFreePairs(this.session.board);
    if (pairs.length === 0) {
      // 死锁：提示无解
      this.showDeadlockMsg();
      return;
    }

    // 清除之前的选中/高亮状态
    this.clearSelections();

    const [id1, id2] = pairs[0];

    // 设置为高亮状态
    const tile1 = this.session.board.tiles.get(id1);
    const tile2 = this.session.board.tiles.get(id2);
    if (tile1) tile1.state = TileState.Highlighted;
    if (tile2) tile2.state = TileState.Highlighted;

    this.session.hintsRemaining--;
  }

  /** 清除所有选中/高亮状态 */
  private clearSelections(): void {
    if (!this.session) return;
    for (const tile of this.session.board.tiles.values()) {
      if (tile.state === TileState.Selected || tile.state === TileState.Highlighted) {
        tile.state = TileState.Normal;
      }
    }
    this.session.board.selectedTileId = null;
  }

  /** 处理棋盘点击 */
  private handleBoardClick(x: number, y: number): void {
    if (!this.session) return;

    // 死锁时点击任何牌都提示使用重排
    if (this.deadlocked) {
      this.showDeadlockMsg();
      return;
    }

    const hitId = this.boardRenderer.hitTest(
      this.session.board,
      x,
      y,
      this.boardLayout,
    );

    if (hitId === null) return;

    const hitTile = this.session.board.tiles.get(hitId);
    if (!hitTile) return;

    // 已移除的牌忽略
    if (hitTile.state === TileState.Removed) return;

    const selectedId = this.session.board.selectedTileId;

    // ─── 没有已选中的牌 ────────────────────────
    if (selectedId === null) {
      if (this.freeTileIds.has(hitId)) {
        // 自由牌 → 选中
        this.clearSelections();
        hitTile.state = TileState.Selected;
        this.session.board.selectedTileId = hitId;
        this.soundManager.playClick();
      } else {
        // 非自由牌 → 提示被锁住，断连击
        this.showLockedTileMsg();
      }
      return;
    }

    // ─── 点击同一张牌：取消选中 ────────────────
    if (hitId === selectedId) {
      hitTile.state = TileState.Normal;
      this.session.board.selectedTileId = null;
      return;
    }

    // ─── 点击另一张牌 ──────────────────────────
    const selectedTile = this.session.board.tiles.get(selectedId);
    if (!selectedTile) return;

    // 不是自由牌 → 提示被锁住，断连击，保持原选中
    if (!this.freeTileIds.has(hitId)) {
      this.showLockedTileMsg();
      return;
    }

    // 检查是否匹配
    if (
      hitTile.type.suit === selectedTile.type.suit &&
      hitTile.type.value === selectedTile.type.value
    ) {
      // ── 匹配成功：执行消除 ────────────────
      this.executeMatch(selectedId, hitId);
    } else {
      // ── 不匹配：取消原选择，选中新牌，断连击 ──
      selectedTile.state = TileState.Normal;
      hitTile.state = TileState.Selected;
      this.session.board.selectedTileId = hitId;
      this.session.comboChain = 0;
      this.lastMatchTime = 0;
      this.soundManager.playError();
    }
  }

  /** 执行消除（含动画） */
  private executeMatch(id1: number, id2: number): void {
    if (!this.session || !this.levelDef) return;

    const tile1 = this.session.board.tiles.get(id1);
    const tile2 = this.session.board.tiles.get(id2);
    if (!tile1 || !tile2) return;

    // 设为 Matched 状态
    tile1.state = TileState.Matched;
    tile2.state = TileState.Matched;
    this.session.board.selectedTileId = null;
    this.animating = true;
    this.pendingRemoval = { id1, id2 };

    // 创建消除动画（缩放效果，在 TileRenderer 中 Matched 状态已有放大+淡出效果）
    this.animManager.tween(
      0,
      1,
      MATCH_ANIM_DURATION,
      () => {
        // 动画中不做额外操作，TileRenderer 通过 Matched 状态渲染效果
      },
      () => {
        // 动画完成后真正移除并更新状态
        this.completeMatch();
      },
      Easings.easeOutQuad,
    );
  }

  /** 消除动画完成后的处理 */
  private completeMatch(): void {
    if (!this.session || !this.levelDef || !this.pendingRemoval) return;

    const { id1, id2 } = this.pendingRemoval;
    this.pendingRemoval = null;
    this.animating = false;

    // 0. 在移除前计算牌的屏幕中心坐标，用于发射粒子
    const tile1 = this.session.board.tiles.get(id1);
    const tile2 = this.session.board.tiles.get(id2);
    if (tile1) {
      const pos1 = this.getTileScreenCenter(tile1.position);
      this.particleSystem.emitMatchSparks(pos1.x, pos1.y);
    }
    if (tile2) {
      const pos2 = this.getTileScreenCenter(tile2.position);
      this.particleSystem.emitMatchSparks(pos2.x, pos2.y);
    }

    // 1. 真正移除牌对
    this.session.board = removeTilePair(this.session.board, id1, id2);

    // 2. 计算连击
    const now = Date.now();
    const comboWindowMs = this.levelDef.difficulty.comboWindowMs;

    if (isInComboWindow(this.lastMatchTime, now, comboWindowMs)) {
      this.session.comboChain++;
    } else {
      this.session.comboChain = 1;
    }
    this.lastMatchTime = now;

    // 3. 更新分数
    const matchScore = calculateMatchScore(this.session.comboChain);
    this.session.score += matchScore;

    // 3.5 创建分数飘字
    if (tile1 && tile2) {
      const p1 = this.getTileScreenCenter(tile1.position);
      const p2 = this.getTileScreenCenter(tile2.position);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const isCombo = this.session.comboChain > 1;
      const text = isCombo
        ? `+${matchScore} x${this.session.comboChain}`
        : `+${matchScore}`;
      this.scoreFloats.push({
        text, x: cx, y: cy,
        timeLeft: SCORE_FLOAT_DURATION,
        maxTime: SCORE_FLOAT_DURATION,
        isCombo,
      });
    }

    // 3.6 播放音效
    if (this.session.comboChain > 1) {
      this.soundManager.playCombo(this.session.comboChain);
    } else {
      this.soundManager.playMatch();
    }

    // 4. 触发连击显示
    if (this.session.comboChain > 1) {
      this.comboDisplayValue = this.session.comboChain;
      this.comboShowTime = COMBO_SHOW_DURATION;
    }

    // 5. 更新匹配数和最大连击
    this.session.matchCount++;
    if (this.session.comboChain > this.session.maxCombo) {
      this.session.maxCombo = this.session.comboChain;
    }

    // 5. 刷新自由牌缓存
    this.refreshFreeTiles();

    // 6. 检查通关
    if (this.session.board.removedCount >= this.session.board.totalCount) {
      this.session.status = 'won';
      this.progressManager.clearGameSave();
      this.soundManager.playComplete();
      const timeBonus = calculateTimeBonus(
        this.session.elapsedMs,
        this.levelDef.difficulty.bonusTimeThreshold,
      );
      const stats: LevelStats = {
        levelId: this.session.levelId,
        time: this.session.elapsedMs,
        score: this.session.score + timeBonus,
        matchCount: this.session.matchCount,
        maxCombo: this.session.maxCombo,
        hintsUsed: this.levelDef.difficulty.initialHints - this.session.hintsRemaining,
        shufflesUsed: this.levelDef.difficulty.initialShuffles - this.session.shufflesRemaining,
        timeBonus,
      };
      // 延迟一小段时间让玩家看到最后一对消除效果
      setTimeout(() => {
        this.eventBus.emit({
          type: 'scene_change',
          from: SceneType.Game,
          to: SceneType.Complete,
          data: stats,
        });
      }, 300);
      return;
    }

    // 7. 检查死锁（无可用配对）
    this.checkDeadlock();
  }

  /** 检查死锁（无可用配对但还有牌未消除） */
  private checkDeadlock(): void {
    if (!this.session) return;

    // 已通关不检查
    if (this.session.board.removedCount >= this.session.board.totalCount) {
      this.deadlocked = false;
      return;
    }

    const pairs = findAllFreePairs(this.session.board);
    if (pairs.length > 0) {
      this.deadlocked = false;
      return;
    }

    // 无可用配对 → 死锁
    this.deadlocked = true;

    if (this.session.shufflesRemaining <= 0) {
      // 无打乱次数 → 游戏失败
      this.session.status = 'lost';
      this.progressManager.clearGameSave();
      this.floatingMsg = { text: '无解且无重排次数，游戏结束', timeLeft: FLOAT_MSG_DURATION * 2 };
      setTimeout(() => {
        this.eventBus.emit({
          type: 'scene_change',
          from: SceneType.Game,
          to: SceneType.Begin,
          data: { levelId: this.session?.levelId },
        });
      }, 1500);
    } else {
      this.showDeadlockMsg();
    }
  }

  /** 显示"无解，请使用重排"提示 */
  private showDeadlockMsg(): void {
    this.floatingMsg = { text: '无解，请使用重排', timeLeft: FLOAT_MSG_DURATION };
  }

  /** 显示"牌被锁住"提示并断连击 */
  private showLockedTileMsg(): void {
    this.floatingMsg = { text: '这张牌被锁住了', timeLeft: FLOAT_MSG_DURATION };
    this.soundManager.playError();
    // 断连击
    if (this.session) {
      this.session.comboChain = 0;
      this.lastMatchTime = 0;
    }
  }

  /** 绘制填充圆角矩形（兼容旧浏览器） */
  // ─── 存档恢复对话框 ─────────────────────────────

  /** 渲染存档恢复对话框 */
  private renderResumeDialog(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // 深色背景
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#004D40');
    bgGrad.addColorStop(1, '#00695C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, w, h);

    // 卡片
    const cardW = 340;
    const cardH = 220;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    ctx.fillStyle = 'rgba(30,30,50,0.95)';
    this.fillRoundRect(ctx, cardX, cardY, cardW, cardH, 16);

    // 边框
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const r = 16;
    ctx.moveTo(cardX + r, cardY);
    ctx.lineTo(cardX + cardW - r, cardY);
    ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + r, r);
    ctx.lineTo(cardX + cardW, cardY + cardH - r);
    ctx.arcTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH, r);
    ctx.lineTo(cardX + r, cardY + cardH);
    ctx.arcTo(cardX, cardY + cardH, cardX, cardY + cardH - r, r);
    ctx.lineTo(cardX, cardY + r);
    ctx.arcTo(cardX, cardY, cardX + r, cardY, r);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 标题
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('发现存档', w / 2, cardY + 45);
    ctx.restore();

    // 副标题
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('是否继续上次的进度？', w / 2, cardY + 85);
    ctx.restore();

    // 两个按钮
    const btnW = 130;
    const btnH = 50;
    const btnGap = 20;
    const btnY = cardY + cardH - 75;

    // 继续按钮（绿色）
    const resumeX = w / 2 - btnW - btnGap / 2;
    this.resumeBtn = { x: resumeX, y: btnY, w: btnW, h: btnH };
    const rGrad = ctx.createLinearGradient(resumeX, btnY, resumeX, btnY + btnH);
    rGrad.addColorStop(0, '#4CAF50');
    rGrad.addColorStop(1, '#388E3C');
    ctx.fillStyle = rGrad;
    this.fillRoundRect(ctx, resumeX, btnY, btnW, btnH, 12);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('继续', resumeX + btnW / 2, btnY + btnH / 2);
    ctx.restore();

    // 重新开始按钮（灰色）
    const restartX = w / 2 + btnGap / 2;
    this.restartBtn = { x: restartX, y: btnY, w: btnW, h: btnH };
    const sGrad = ctx.createLinearGradient(restartX, btnY, restartX, btnY + btnH);
    sGrad.addColorStop(0, '#616161');
    sGrad.addColorStop(1, '#424242');
    ctx.fillStyle = sGrad;
    this.fillRoundRect(ctx, restartX, btnY, btnW, btnH, 12);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', restartX + btnW / 2, btnY + btnH / 2);
    ctx.restore();
  }

  /** 处理存档恢复对话框点击 */
  private handleResumeDialogClick(x: number, y: number): void {
    if (this.hitTest(x, y, this.resumeBtn) && this.pendingSave) {
      // 继续存档
      this.restoreFromSave(this.pendingSave);
      this.progressManager.clearGameSave();
      return;
    }
    if (this.hitTest(x, y, this.restartBtn) && this.levelDef) {
      // 重新开始
      this.progressManager.clearGameSave();
      this.startFreshLevel(this.levelDef.levelId);
      return;
    }
  }

  private fillRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }
}
