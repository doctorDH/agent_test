/**
 * UIRenderer.ts - HUD 渲染器（顶栏 + 底栏）
 *
 * 绘制游戏页面的 UI 元素：
 * - 顶栏：返回按钮、关卡信息、分数、匹配数、菜单按钮
 * - 底栏：打乱按钮、提示按钮（带剩余次数指示）
 *
 * 所有尺寸基于 750px 设计宽度。
 */

// ─── 矩形区域（用于按钮命中检测） ─────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── 颜色和尺寸常量 ──────────────────────────────────

/** 顶栏高度 */
const TOP_BAR_HEIGHT = 80;
/** 底栏按钮直径 */
const BOTTOM_BTN_SIZE = 70;
/** 底栏距底部距离 */
const BOTTOM_MARGIN = 30;
/** 按钮圆形背景颜色 */
const BTN_BG_COLOR = 'rgba(30, 30, 30, 0.6)';
/** 按钮文字颜色 */
const BTN_TEXT_COLOR = '#FFFFFF';
/** 顶栏背景颜色 */
const TOP_BAR_BG = 'rgba(20, 40, 35, 0.85)';
/** 剩余次数小圆圈颜色 */
const BADGE_BG_COLOR = '#E85050';
/** 信息文字颜色 */
const INFO_TEXT_COLOR = '#FFFFFF';
/** 信息标签颜色 */
const LABEL_TEXT_COLOR = 'rgba(255, 255, 255, 0.6)';

// ─── UI 渲染器 ───────────────────────────────────────

export class UIRenderer {
  /**
   * 绘制游戏页面顶栏
   *
   * 布局：
   * [← 返回]  关卡 | 分数 | 匹配数  [≡ 菜单]
   *
   * @param ctx - Canvas 2D 上下文
   * @param designWidth - 设计宽度（750）
   * @param level - 当前关卡编号
   * @param score - 当前分数
   * @param matchCount - 已匹配对数
   * @returns 各按钮的点击区域
   */
  drawGameTopBar(
    ctx: CanvasRenderingContext2D,
    designWidth: number,
    level: number,
    score: number,
    matchCount: number,
  ): { backBtn: Rect; menuBtn: Rect } {
    const barH = TOP_BAR_HEIGHT;

    // ── 顶栏背景 ──────────────────────────────────
    ctx.fillStyle = TOP_BAR_BG;
    ctx.fillRect(0, 0, designWidth, barH);

    // 底部分隔线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barH);
    ctx.lineTo(designWidth, barH);
    ctx.stroke();

    // ── 返回按钮（左侧） ──────────────────────────
    const btnMargin = 15;
    const btnRadius = 22;
    const backCx = btnMargin + btnRadius;
    const backCy = barH / 2;
    const backBtn: Rect = {
      x: backCx - btnRadius,
      y: backCy - btnRadius,
      w: btnRadius * 2,
      h: btnRadius * 2,
    };

    // 圆形背景
    ctx.fillStyle = BTN_BG_COLOR;
    ctx.beginPath();
    ctx.arc(backCx, backCy, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    // 箭头符号
    ctx.fillStyle = BTN_TEXT_COLOR;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', backCx, backCy);

    // ── 菜单按钮（右侧） ─────────────────────────
    const menuCx = designWidth - btnMargin - btnRadius;
    const menuCy = barH / 2;
    const menuBtn: Rect = {
      x: menuCx - btnRadius,
      y: menuCy - btnRadius,
      w: btnRadius * 2,
      h: btnRadius * 2,
    };

    ctx.fillStyle = BTN_BG_COLOR;
    ctx.beginPath();
    ctx.arc(menuCx, menuCy, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = BTN_TEXT_COLOR;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('≡', menuCx, menuCy);

    // ── 中间信息区域 ─────────────────────────────
    // 三组数据均匀分布在中间区域
    const infoLeft = backCx + btnRadius + 20;
    const infoRight = menuCx - btnRadius - 20;
    const infoWidth = infoRight - infoLeft;
    const infoCenters = [
      infoLeft + infoWidth * (1 / 6),
      infoLeft + infoWidth * (3 / 6),
      infoLeft + infoWidth * (5 / 6),
    ];

    // 关卡
    this.drawInfoItem(ctx, infoCenters[0], barH, '关卡', `${level}`);
    // 分数
    this.drawInfoItem(ctx, infoCenters[1], barH, '分数', `${score}`);
    // 匹配
    this.drawInfoItem(ctx, infoCenters[2], barH, '匹配', `${matchCount}`);

    return { backBtn, menuBtn };
  }

  /**
   * 绘制游戏页面底栏
   *
   * 布局：
   * [⟳ 打乱]        [? 提示]
   *   (N)              (N)
   *
   * @param ctx - Canvas 2D 上下文
   * @param designWidth - 设计宽度（750）
   * @param designHeight - 设计高度
   * @param shufflesRemaining - 剩余打乱次数
   * @param hintsRemaining - 剩余提示次数
   * @returns 各按钮的点击区域
   */
  drawGameBottomBar(
    ctx: CanvasRenderingContext2D,
    designWidth: number,
    designHeight: number,
    shufflesRemaining: number,
    hintsRemaining: number,
  ): { shuffleBtn: Rect; hintBtn: Rect } {
    const btnR = BOTTOM_BTN_SIZE / 2;
    const btnY = designHeight - BOTTOM_MARGIN - btnR;

    // 两个按钮左右对称分布
    const shuffleCx = designWidth * 0.3;
    const hintCx = designWidth * 0.7;

    // ── 打乱按钮 ──────────────────────────────────
    const shuffleBtn = this.drawBottomButton(
      ctx,
      shuffleCx,
      btnY,
      btnR,
      '⟳',
      shufflesRemaining,
    );

    // ── 提示按钮 ──────────────────────────────────
    const hintBtn = this.drawBottomButton(
      ctx,
      hintCx,
      btnY,
      btnR,
      '?',
      hintsRemaining,
    );

    return { shuffleBtn, hintBtn };
  }

  // ─── 内部方法 ─────────────────────────────────────

  /**
   * 绘制顶栏中的一组信息（标签 + 数值）
   */
  private drawInfoItem(
    ctx: CanvasRenderingContext2D,
    cx: number,
    barH: number,
    label: string,
    value: string,
  ): void {
    ctx.textAlign = 'center';

    // 数值（大字）
    ctx.fillStyle = INFO_TEXT_COLOR;
    ctx.font = 'bold 22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, cx, barH / 2 - 8);

    // 标签（小字）
    ctx.fillStyle = LABEL_TEXT_COLOR;
    ctx.font = '13px sans-serif';
    ctx.fillText(label, cx, barH / 2 + 16);
  }

  /**
   * 绘制底栏圆形按钮 + 剩余次数标记
   *
   * @returns 按钮的点击区域
   */
  private drawBottomButton(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    icon: string,
    remaining: number,
  ): Rect {
    // 圆形背景
    ctx.fillStyle = BTN_BG_COLOR;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 按钮图标
    ctx.fillStyle = BTN_TEXT_COLOR;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy);

    // 剩余次数标记（右上角小圆圈）
    const badgeR = 11;
    const badgeCx = cx + r * 0.65;
    const badgeCy = cy - r * 0.65;

    ctx.fillStyle = BADGE_BG_COLOR;
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(String(remaining), badgeCx, badgeCy);

    // 返回点击区域
    return {
      x: cx - r,
      y: cy - r,
      w: r * 2,
      h: r * 2,
    };
  }
}
