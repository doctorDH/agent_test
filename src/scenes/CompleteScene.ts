/**
 * CompleteScene.ts - 结算页面场景
 * 深色到金色渐变 + 标题辉光 + 三统计框 + 下一关按钮
 */

import type { IEventBus, IScene, LevelStats } from '../types';
import { SceneType } from '../types';
import { getLevelCount } from '../levels/LevelManager';
import type { ProgressManager } from '../core/ProgressManager';
import type { SoundManager } from '../audio/SoundManager';
import { ParticleSystem } from '../rendering/ParticleSystem';

/** 设计宽度 */
const DESIGN_WIDTH = 750;

/** 按钮区域 */
interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class CompleteScene implements IScene {
  private eventBus: IEventBus;
  private getDesignHeight: () => number;
  private progressManager: ProgressManager;
  private soundManager: SoundManager;
  private particleSystem: ParticleSystem;

  /** 下一关按钮区域 */
  private nextBtn: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };

  /** 结算统计数据 */
  private stats: LevelStats = {
    levelId: 1,
    time: 0,
    score: 0,
    matchCount: 0,
    maxCombo: 0,
    hintsUsed: 0,
    shufflesUsed: 0,
    timeBonus: 0,
  };

  constructor(eventBus: IEventBus, getDesignHeight: () => number, progressManager: ProgressManager, soundManager: SoundManager) {
    this.eventBus = eventBus;
    this.getDesignHeight = getDesignHeight;
    this.progressManager = progressManager;
    this.soundManager = soundManager;
    this.particleSystem = new ParticleSystem();
  }

  enter(data?: unknown): void {
    if (data && typeof data === 'object' && 'levelId' in data) {
      this.stats = data as LevelStats;
      // 记录通关进度
      this.progressManager.recordLevelComplete(
        this.stats.levelId,
        this.stats.score,
        this.stats.time,
      );
    }
    // 发射庆祝金雨
    this.particleSystem.emitConfetti(DESIGN_WIDTH, this.getDesignHeight());
  }

  exit(): void {
    // 无需清理
  }

  update(dt: number): void {
    this.particleSystem.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = DESIGN_WIDTH;
    const h = this.getDesignHeight();

    // ─── 背景：深色到深蓝渐变 ────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1A1A2E');
    bgGrad.addColorStop(0.5, '#16213E');
    bgGrad.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ─── 顶部发光区域 ──────────────────────────
    ctx.save();
    const glow = ctx.createRadialGradient(w / 2, h * 0.22, 0, w / 2, h * 0.22, 300);
    glow.addColorStop(0, 'rgba(255,215,0,0.15)');
    glow.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h * 0.5);
    ctx.restore();

    // ─── 顶部 1/3：大字 "智慧超群" + 辉光效果 ────
    const titleY = h * 0.18;

    // 辉光层（多次绘制更大、更淡的文字做发光效果）
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 第三层辉光（最外层，最大最淡）
    ctx.fillStyle = 'rgba(255,215,0,0.08)';
    ctx.font = 'bold 62px sans-serif';
    ctx.fillText('\u667A\u6167\u8D85\u7FA4', w / 2, titleY);

    // 第二层辉光
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('\u667A\u6167\u8D85\u7FA4', w / 2, titleY);

    // 主文字
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 52px sans-serif';
    ctx.shadowColor = 'rgba(255,215,0,0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText('\u667A\u6167\u8D85\u7FA4', w / 2, titleY);
    ctx.restore();

    // 副标题
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`\u5173\u5361 ${this.stats.levelId} \u5B8C\u6210`, w / 2, titleY + 50);
    ctx.restore();

    // ─── 中间：三个统计框并排 ────────────────────
    const statY = h * 0.38;
    const statW = 190;
    const statH = 130;
    const statGap = 20;
    const totalW = statW * 3 + statGap * 2;
    const startX = (w - totalW) / 2;

    // 格式化时间 MM:SS
    const totalSeconds = Math.floor(this.stats.time / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const statItems = [
      { label: '\u65F6\u95F4', value: timeStr },
      { label: '\u5206\u6570', value: String(this.stats.score) },
      { label: '\u8FDE\u51FB', value: String(this.stats.maxCombo) },
    ];

    statItems.forEach((stat, i) => {
      const sx = startX + i * (statW + statGap);

      // 统计框背景
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.roundRect(ctx, sx, statY, statW, statH, 12);
      ctx.fill();

      // 统计框边框
      ctx.strokeStyle = 'rgba(255,215,0,0.25)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, sx, statY, statW, statH, 12);
      ctx.stroke();
      ctx.restore();

      // 标签
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stat.label, sx + statW / 2, statY + 38);
      ctx.restore();

      // 数值
      ctx.save();
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 38px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stat.value, sx + statW / 2, statY + 88);
      ctx.restore();
    });

    // ─── 时间奖励提示（如果有） ──────────────────
    if (this.stats.timeBonus > 0) {
      ctx.save();
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `\u2B50 \u65F6\u95F4\u5956\u52B1 +${this.stats.timeBonus}`,
        w / 2,
        statY + statH + 20,
      );
      ctx.restore();
    }

    // ─── 底部：绿色大按钮 "关卡 N+1" ────────────
    const nextLevel = this.stats.levelId + 1;
    const hasNextLevel = nextLevel <= getLevelCount();
    const btnLabel = hasNextLevel
      ? `\u5173\u5361 ${nextLevel}`
      : '\u8FD4\u56DE\u4E3B\u9875';

    const btnW = 320;
    const btnH = 70;
    const btnX = (w - btnW) / 2;
    const btnY = h * 0.68;
    this.nextBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    // 按钮背景（绿色渐变）
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, '#4CAF50');
    btnGrad.addColorStop(1, '#388E3C');
    ctx.save();
    ctx.fillStyle = btnGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 16);
    ctx.fill();
    ctx.restore();

    // 按钮文字
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btnLabel, btnX + btnW / 2, btnY + btnH / 2);
    ctx.restore();

    // 底部小提示
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      hasNextLevel ? '\u70B9\u51FB\u8FDB\u5165\u4E0B\u4E00\u5173' : '\u70B9\u51FB\u8FD4\u56DE\u4E3B\u9875',
      w / 2,
      h * 0.78,
    );
    ctx.restore();

    // 粒子特效（最上层）
    this.particleSystem.render(ctx);
  }

  onPointerDown(x: number, y: number): void {
    const btn = this.nextBtn;
    if (
      x >= btn.x && x <= btn.x + btn.w &&
      y >= btn.y && y <= btn.y + btn.h
    ) {
      this.soundManager.playClick();
      const nextLevel = this.stats.levelId + 1;
      const hasNextLevel = nextLevel <= getLevelCount();

      if (hasNextLevel) {
        this.eventBus.emit({
          type: 'scene_change',
          from: SceneType.Complete,
          to: SceneType.Game,
          data: { levelId: nextLevel },
        });
      } else {
        this.eventBus.emit({
          type: 'scene_change',
          from: SceneType.Complete,
          to: SceneType.Begin,
          data: { levelId: 1 },
        });
      }
    }
  }

  onPointerUp(_x: number, _y: number): void {
    // 无需处理
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
