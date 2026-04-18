/**
 * BeginScene.ts - 开始页面场景
 * 中国风木质背景 + 标题 + 5x2 关卡选择网格
 */

import type { IEventBus, IScene } from '../types';
import { SceneType } from '../types';
import { getLevelCount } from '../levels/LevelManager';
import type { ProgressManager } from '../core/ProgressManager';
import type { SoundManager } from '../audio/SoundManager';
import { AvatarRenderer } from '../rendering/AvatarRenderer';
import { ProfilePanel } from './ProfilePanel';
import { SettingsPanel } from './SettingsPanel';

/** 设计宽度 */
const DESIGN_WIDTH = 750;

/** 网格配置 */
const GRID_COLS = 5;
const GRID_ROWS = 2;
const BTN_SIZE = 110;
const BTN_GAP = 15;

/** 关卡按钮信息 */
interface LevelButton {
  x: number;
  y: number;
  w: number;
  h: number;
  levelId: number;
}

export class BeginScene implements IScene {
  private eventBus: IEventBus;
  private getDesignHeight: () => number;
  private progressManager: ProgressManager;
  private profilePanel: ProfilePanel;
  private settingsPanel: SettingsPanel;

  /** 关卡按钮位置列表 */
  private levelButtons: LevelButton[] = [];

  /** 头像区域（点击打开面板） */
  private avatarBtn = { x: 0, y: 0, w: 0, h: 0 };

  /** 齿轮按钮区域 */
  private gearBtn = { x: 0, y: 0, w: 0, h: 0 };

  /** 自定义头像图片缓存 */
  private cachedAvatarImage: HTMLImageElement | null = null;
  private cachedDataUrl = '';

  constructor(eventBus: IEventBus, getDesignHeight: () => number, progressManager: ProgressManager, soundManager: SoundManager, canvas: HTMLCanvasElement) {
    this.eventBus = eventBus;
    this.getDesignHeight = getDesignHeight;
    this.progressManager = progressManager;
    this.profilePanel = new ProfilePanel(progressManager, canvas);
    this.settingsPanel = new SettingsPanel(progressManager, soundManager);
  }

  enter(_data?: unknown): void {
    // 无需特殊初始化
  }

  exit(): void {
    // 无需清理
  }

  update(_dt: number): void {
    // 无动画逻辑
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = DESIGN_WIDTH;
    const h = this.getDesignHeight();

    // ─── 背景：深棕色渐变（木质感） ─────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#3E2723');
    bgGrad.addColorStop(0.5, '#5D4037');
    bgGrad.addColorStop(1, '#4E342E');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ─── 左上角头像 + 昵称 ─────────────────────────
    const avatarSize = 50;
    const avatarX = 30;
    const avatarY = 40;
    this.avatarBtn = { x: avatarX - 5, y: avatarY - 5, w: avatarSize + 100, h: avatarSize + 10 };

    const progress = this.progressManager.getProgress();

    // 绘制头像
    if (progress.customAvatarDataUrl) {
      this.ensureCachedImage(progress.customAvatarDataUrl);
      if (this.cachedAvatarImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(this.cachedAvatarImage, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
      } else {
        AvatarRenderer.drawBuiltinAvatar(ctx, progress.avatarId, avatarX, avatarY, avatarSize);
      }
    } else {
      AvatarRenderer.drawBuiltinAvatar(ctx, progress.avatarId, avatarX, avatarY, avatarSize);
    }
    AvatarRenderer.drawAvatarFrame(ctx, progress.frameId, avatarX, avatarY, avatarSize);

    // 昵称
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const nickname = progress.nickname || '\u70B9\u51FB\u8BBE\u7F6E';
    ctx.fillText(nickname, avatarX + avatarSize + 10, avatarY + avatarSize / 2);
    ctx.restore();

    // ─── 右上角菜单按钮 ─────────────────────────
    ctx.save();
    const gearR = 20;
    const gearX = w - 50;
    const gearY = 60;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(gearX, gearY, gearR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2261', gearX, gearY);
    ctx.restore();
    this.gearBtn = { x: gearX - gearR, y: gearY - gearR, w: gearR * 2, h: gearR * 2 };

    // ─── 标题 "Vita Mahjong" ────────────────────
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillText('Vita Mahjong', w / 2, h * 0.12);
    ctx.restore();

    // ─── 副标题 ────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u9009\u62E9\u5173\u5361', w / 2, h * 0.12 + 45);
    ctx.restore();

    // ─── 关卡选择网格 5x2 ──────────────────────
    this.renderLevelGrid(ctx, w, h);

    // ─── 个人信息面板（最上层） ───────────────────
    if (this.profilePanel.isVisible()) {
      this.profilePanel.render(ctx, w, h);
    }

    // ─── 设置面板（最上层） ─────────────────────
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.render(ctx, w, h);
    }
  }

  onPointerDown(x: number, y: number): void {
    // 设置面板优先消费事件
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.onPointerDown(x, y);
      return;
    }

    // 个人信息面板优先消费事件
    if (this.profilePanel.isVisible()) {
      this.profilePanel.onPointerDown(x, y);
      return;
    }

    // 齿轮按钮：打开设置面板
    if (
      x >= this.gearBtn.x && x <= this.gearBtn.x + this.gearBtn.w &&
      y >= this.gearBtn.y && y <= this.gearBtn.y + this.gearBtn.h
    ) {
      this.settingsPanel.open();
      return;
    }

    // 头像区域点击：打开面板
    if (
      x >= this.avatarBtn.x && x <= this.avatarBtn.x + this.avatarBtn.w &&
      y >= this.avatarBtn.y && y <= this.avatarBtn.y + this.avatarBtn.h
    ) {
      this.profilePanel.open();
      return;
    }

    for (const btn of this.levelButtons) {
      if (
        x >= btn.x && x <= btn.x + btn.w &&
        y >= btn.y && y <= btn.y + btn.h
      ) {
        // 只有解锁的关卡才能点击
        if (this.progressManager.isLevelUnlocked(btn.levelId)) {
          this.eventBus.emit({
            type: 'scene_change',
            from: SceneType.Begin,
            to: SceneType.Game,
            data: { levelId: btn.levelId },
          });
        }
        return;
      }
    }
  }

  onPointerUp(_x: number, _y: number): void {
    // 无需处理
  }

  // ═══════════════════════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════════════════════

  /** 渲染关卡选择网格 */
  private renderLevelGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const totalCount = getLevelCount();
    const gridW = GRID_COLS * BTN_SIZE + (GRID_COLS - 1) * BTN_GAP;
    const gridH = GRID_ROWS * BTN_SIZE + (GRID_ROWS - 1) * BTN_GAP;
    const startX = (w - gridW) / 2;
    const startY = h * 0.32;

    this.levelButtons = [];

    for (let i = 0; i < totalCount && i < GRID_COLS * GRID_ROWS; i++) {
      const levelId = i + 1;
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);

      const bx = startX + col * (BTN_SIZE + BTN_GAP);
      const by = startY + row * (BTN_SIZE + BTN_GAP);

      this.levelButtons.push({ x: bx, y: by, w: BTN_SIZE, h: BTN_SIZE, levelId });

      const unlocked = this.progressManager.isLevelUnlocked(levelId);
      const completed = this.progressManager.isLevelCompleted(levelId);

      this.renderLevelButton(ctx, bx, by, levelId, unlocked, completed);
    }

    // 底部统计信息
    const progress = this.progressManager.getProgress();
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const statsY = startY + gridH + 40;
    ctx.fillText(
      `\u5DF2\u80DC ${progress.totalGamesWon} \u5C40  |  \u603B\u8BA1 ${progress.totalGamesPlayed} \u5C40`,
      w / 2,
      statsY,
    );
    ctx.restore();
  }

  /** 渲染单个关卡按钮 */
  private renderLevelButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    levelId: number,
    unlocked: boolean,
    completed: boolean,
  ): void {
    const size = BTN_SIZE;
    const r = 14;

    ctx.save();

    if (!unlocked) {
      // ── 锁定状态：灰色暗淡 ──────────────────
      ctx.fillStyle = 'rgba(60, 50, 40, 0.7)';
      this.roundRect(ctx, x, y, size, size, r);
      ctx.fill();

      // 锁图标
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\uD83D\uDD12', x + size / 2, y + size / 2);

    } else if (completed) {
      // ── 已通关：绿色调 + 关卡号 + 勾 ────────
      const grad = ctx.createLinearGradient(x, y, x, y + size);
      grad.addColorStop(0, '#2E7D32');
      grad.addColorStop(1, '#1B5E20');
      ctx.fillStyle = grad;
      this.roundRect(ctx, x, y, size, size, r);
      ctx.fill();

      // 金色边框
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, size, size, r);
      ctx.stroke();

      // 关卡号
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(levelId), x + size / 2, y + size / 2 - 10);

      // 勾号
      ctx.fillStyle = '#FFD700';
      ctx.font = '18px sans-serif';
      ctx.fillText('\u2713', x + size / 2, y + size / 2 + 22);

      //
      const highScore = this.progressManager.getHighScore(levelId);
      if (highScore > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px sans-serif';
        ctx.fillText(String(highScore), x + size / 2, y + size / 2 + 38);
      }

    } else {
      // ── 可玩未通关：金色调 ────────────────────
      const grad = ctx.createLinearGradient(x, y, x, y + size);
      grad.addColorStop(0, '#F9A825');
      grad.addColorStop(1, '#FF8F00');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      this.roundRect(ctx, x, y, size, size, r);
      ctx.fill();

      // 关卡号
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(levelId), x + size / 2, y + size / 2);
    }

    ctx.restore();
  }

  /** 确保自定义头像图片已缓存 */
  private ensureCachedImage(dataUrl: string): void {
    if (dataUrl && dataUrl !== this.cachedDataUrl) {
      this.cachedDataUrl = dataUrl;
      this.cachedAvatarImage = null;
      const img = new Image();
      img.onload = () => {
        this.cachedAvatarImage = img;
      };
      img.src = dataUrl;
    }
  }

  /** 绘制圆角矩形路径 */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
