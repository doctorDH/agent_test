/**
 * TileRenderer.ts - 单张麻将牌的 Canvas 渲染器
 *
 * 负责在给定屏幕坐标处绘制一张牌，包括：
 * - 牌身（圆角矩形 + 3D 深度效果）
 * - 牌面内容（中文/数字字符）
 * - 状态效果（选中边框、高亮脉冲、匹配淡出）
 */

import type { Tile } from '../types/tile';
import { TileSuit, TileState } from '../types/tile';

// ─── 牌面常量 ─────────────────────────────────────────

/** 牌的逻辑尺寸（设计像素，基于 750px 宽度） */
export class TileRenderer {
  /** 每张牌的显示宽度 */
  static readonly TILE_WIDTH = 52;
  /** 每张牌的显示高度 */
  static readonly TILE_HEIGHT = 68;
  /** 每层的位置偏移像素（上层牌相对下层的平移量） */
  static readonly DEPTH_OFFSET = 8;
  /** 每张牌的 3D 深度边条厚度（固定值，所有牌一致） */
  static readonly TILE_DEPTH = 4;

  /** 圆角半径 */
  private static readonly CORNER_RADIUS = 5;

  /** 自由牌底色 */
  private static readonly COLOR_FREE = '#F5F0E8';
  /** 非自由牌底色（暗淡） */
  private static readonly COLOR_BLOCKED = '#C0B8A8';
  /** 3D 深度边条颜色 */
  private static readonly COLOR_DEPTH = '#8B7355';
  /** 选中边框颜色 */
  private static readonly COLOR_SELECTED = '#FFD700';

  /** 万数字映射表：1-9 → 中文大写 */
  private static readonly CHARACTER_MAP: Record<number, string> = {
    1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
    6: '六', 7: '七', 8: '八', 9: '九',
  };

  /** 风牌映射表 */
  private static readonly WIND_MAP: Record<number, string> = {
    1: '东', 2: '南', 3: '西', 4: '北',
  };

  /** 龙/箭牌映射表 */
  private static readonly DRAGON_MAP: Record<number, { text: string; color: string }> = {
    1: { text: '中', color: '#CC0000' },
    2: { text: '發', color: '#008800' },
    3: { text: '白', color: '#666666' },
  };

  /** 高亮动画计时器（全局共享） */
  private highlightPhase = 0;

  /**
   * 更新高亮脉冲相位（每帧调用）
   * @param dt - 帧时间增量（ms）
   */
  updateHighlight(dt: number): void {
    this.highlightPhase += dt * 0.005;
    if (this.highlightPhase > Math.PI * 2) {
      this.highlightPhase -= Math.PI * 2;
    }
  }

  /**
   * 绘制一张牌
   *
   * @param ctx - Canvas 2D 上下文
   * @param tile - 牌数据
   * @param screenX - 牌左上角的屏幕 X 坐标
   * @param screenY - 牌左上角的屏幕 Y 坐标
   * @param isFree - 该牌是否为自由牌
   */
  drawTile(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    screenX: number,
    screenY: number,
    isFree: boolean,
  ): void {
    const W = TileRenderer.TILE_WIDTH;
    const H = TileRenderer.TILE_HEIGHT;
    const R = TileRenderer.CORNER_RADIUS;
    const depthPx = TileRenderer.TILE_DEPTH;

    ctx.save();

    // ── 匹配状态特效：放大 + 淡出 ──────────────────
    if (tile.state === TileState.Matched) {
      ctx.globalAlpha = 0.5;
      const scale = 1.1;
      const cx = screenX + W / 2;
      const cy = screenY + H / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }

    // ── 3D 深度效果：右侧和底部边条 ────────────────
    if (depthPx > 0) {
      ctx.fillStyle = TileRenderer.COLOR_DEPTH;

      // 右侧边条
      this.drawRoundedRectPath(ctx, screenX + W, screenY + depthPx, depthPx, H, 2);
      ctx.fill();

      // 底部边条
      this.drawRoundedRectPath(ctx, screenX + depthPx, screenY + H, W, depthPx, 2);
      ctx.fill();

      // 右下角填充块
      ctx.fillRect(screenX + W, screenY + H, depthPx, depthPx);
    }

    // ── 牌身：圆角矩形 ─────────────────────────────
    const baseColor = isFree ? TileRenderer.COLOR_FREE : TileRenderer.COLOR_BLOCKED;
    ctx.fillStyle = baseColor;
    this.drawRoundedRectPath(ctx, screenX, screenY, W, H, R);
    ctx.fill();

    // 牌身描边
    ctx.strokeStyle = '#A09080';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── 牌面内容 ────────────────────────────────────
    this.drawTileContent(ctx, tile, screenX, screenY, W, H);

    // ── 状态效果 ────────────────────────────────────

    // 选中状态：金色边框
    if (tile.state === TileState.Selected) {
      ctx.strokeStyle = TileRenderer.COLOR_SELECTED;
      ctx.lineWidth = 3;
      this.drawRoundedRectPath(ctx, screenX - 1, screenY - 1, W + 2, H + 2, R + 1);
      ctx.stroke();
    }

    // 高亮状态：脉冲黄色边框
    if (tile.state === TileState.Highlighted) {
      const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.highlightPhase));
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = 3;
      this.drawRoundedRectPath(ctx, screenX - 1, screenY - 1, W + 2, H + 2, R + 1);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── 牌面内容绘制 ───────────────────────────────────

  /**
   * 根据牌的花色和面值绘制牌面文字
   */
  private drawTileContent(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const { suit, value, displayId } = tile.type;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    switch (suit) {
      case TileSuit.Bamboo:
        // 条：数字 + 小字"条"
        ctx.fillStyle = '#006633';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(String(value), cx, cy - 6);
        ctx.font = '12px sans-serif';
        ctx.fillText('条', cx, cy + 14);
        break;

      case TileSuit.Character:
        // 万：中文大写 + 小字"万"
        ctx.fillStyle = '#CC0000';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(TileRenderer.CHARACTER_MAP[value] || String(value), cx, cy - 6);
        ctx.font = '12px sans-serif';
        ctx.fillText('万', cx, cy + 14);
        break;

      case TileSuit.Circle:
        // 筒：数字 + 小字"筒"
        ctx.fillStyle = '#0055AA';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(String(value), cx, cy - 6);
        ctx.font = '12px sans-serif';
        ctx.fillText('筒', cx, cy + 14);
        break;

      case TileSuit.Wind: {
        // 风牌：单个大字
        const windText = TileRenderer.WIND_MAP[value] || '?';
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(windText, cx, cy);
        break;
      }

      case TileSuit.Dragon: {
        // 龙/箭牌：带颜色的大字
        const dragon = TileRenderer.DRAGON_MAP[value];
        if (dragon) {
          ctx.fillStyle = dragon.color;
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText(dragon.text, cx, cy);
        }
        break;
      }

      case TileSuit.Flower:
      case TileSuit.Season:
      case TileSuit.Zodiac:
        // 花/季/星座：使用 displayId
        ctx.fillStyle = '#996633';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(displayId, cx, cy);
        break;
    }
  }

  // ─── 圆角矩形路径 ──────────────────────────────────

  /**
   * 绘制圆角矩形路径（不 fill/stroke，仅定义路径）
   */
  private drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    // 确保圆角不超过矩形尺寸的一半
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
  }
}
