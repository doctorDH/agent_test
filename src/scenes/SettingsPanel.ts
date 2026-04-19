/**
 * SettingsPanel.ts - 游戏设置浮层面板
 * 全屏遮罩 + 居中卡片，音乐/音效开关接入实际功能，其余占位
 * 自适应横屏/竖屏布局
 */

import type { ProgressManager } from '../core/ProgressManager';
import type { SoundManager } from '../audio/SoundManager';

/** 矩形区域 */
interface PRect {
  x: number; y: number; w: number; h: number;
}

/** 开关项定义 */
interface ToggleItem {
  rect: PRect;
  isOn: boolean;
  /** 'music' | 'sound' | 'placeholder' */
  action: string;
}

export class SettingsPanel {
  private progressManager: ProgressManager;
  private soundManager: SoundManager;
  private visible = false;

  // 按钮区域（每帧 render 时更新）
  private closeBtn: PRect = { x: 0, y: 0, w: 0, h: 0 };
  private iconToggles: ToggleItem[] = [];
  private rowToggles: ToggleItem[] = [];
  private listItems: PRect[] = [];
  private onRestart: (() => void) | null = null;

  constructor(progressManager: ProgressManager, soundManager: SoundManager) {
    this.progressManager = progressManager;
    this.soundManager = soundManager;
  }

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
  }

  /** 设置重新开始回调 */
  setOnRestart(cb: () => void): void {
    this.onRestart = cb;
  }

  isVisible(): boolean {
    return this.visible;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.visible) return;

    // ── 全屏遮罩 ──────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // ── 自适应卡片 ─────────────────────────────
    const cardW = Math.min(560, w - 24);
    const cardH = Math.min(580, h - 16);
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;
    const compact = cardH < 450;

    // 卡片背景
    ctx.save();
    ctx.fillStyle = '#F5F0E1';
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(139,90,43,0.4)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();
    ctx.restore();

    // ── 布局 ──────────────────────────────────
    let curY = cardY + 6;
    const padX = cardX + 20;
    const innerW = cardW - 40;

    // ── 标题栏 ─────────────────────────────────
    const titleH = compact ? 32 : 40;
    // 标题背景条
    ctx.save();
    ctx.fillStyle = '#8B5A2B';
    this.roundRect(ctx, cardX + 8, curY, cardW - 16, titleH, 10);
    ctx.fill();
    ctx.fillStyle = '#FFF8DC';
    ctx.font = `bold ${compact ? 18 : 22}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u9009\u9879', w / 2, curY + titleH / 2);
    ctx.restore();

    // 关闭按钮
    const closeSize = compact ? 28 : 34;
    const closeX = cardX + cardW - closeSize - 4;
    const closeY2 = curY + (titleH - closeSize) / 2;
    this.closeBtn = { x: closeX, y: closeY2, w: closeSize, h: closeSize };
    ctx.save();
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.arc(closeX + closeSize / 2, closeY2 + closeSize / 2, closeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${compact ? 16 : 20}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2715', closeX + closeSize / 2, closeY2 + closeSize / 2);
    ctx.restore();

    curY += titleH + (compact ? 8 : 14);

    // ── 第一行：4 个图标开关 ────────────────────
    const toggleRowH = compact ? 60 : 75;
    const iconCount = 4;
    const iconW = Math.floor((innerW - (iconCount - 1) * 8) / iconCount);
    const icons = ['\u266A', '\uD83D\uDD0A', '\uD83D\uDCF3', '\uD83D\uDCF1'];
    const iconLabels = ['\u97F3\u4E50', '\u97F3\u6548', '\u632F\u52A8', '\u901A\u77E5'];
    const iconActions = ['music', 'sound', 'placeholder', 'placeholder'];

    this.iconToggles = [];

    // 图标开关卡片背景
    for (let i = 0; i < iconCount; i++) {
      const ix = padX + i * (iconW + 8);
      const iy = curY;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, ix, iy, iconW, toggleRowH, 10);
      ctx.fill();
      this.roundRect(ctx, ix, iy, iconW, toggleRowH, 10);
      ctx.stroke();
      ctx.restore();

      // 图标
      ctx.save();
      ctx.fillStyle = '#5D4037';
      ctx.font = `${compact ? 20 : 26}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icons[i], ix + iconW / 2, iy + (compact ? 18 : 24));
      ctx.restore();

      // 获取开关状态
      let isOn = true;
      if (iconActions[i] === 'music') isOn = this.soundManager.musicEnabled;
      else if (iconActions[i] === 'sound') isOn = this.soundManager.enabled;

      // 开关滑块
      const toggleW = compact ? 50 : 58;
      const toggleH = compact ? 22 : 26;
      const toggleX = ix + (iconW - toggleW) / 2;
      const toggleY = iy + toggleRowH - toggleH - (compact ? 6 : 10);
      this.drawToggle(ctx, toggleX, toggleY, toggleW, toggleH, isOn);

      this.iconToggles.push({
        rect: { x: ix, y: iy, w: iconW, h: toggleRowH },
        isOn,
        action: iconActions[i],
      });
    }

    curY += toggleRowH + (compact ? 6 : 12);

    // ── 分隔线 ─────────────────────────────────
    this.drawDivider(ctx, padX, curY, innerW);
    curY += 2;

    // ── 开关行：自动匹配、自动完成 ─────────────
    const switchRowH = compact ? 36 : 44;
    const switchLabels = ['\u81EA\u52A8\u5339\u914D', '\u81EA\u52A8\u5B8C\u6210'];
    const switchIcons = ['\uD83C\uDCCF', '\u2714'];
    this.rowToggles = [];

    for (let i = 0; i < switchLabels.length; i++) {
      const ry = curY;

      // 行背景
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, padX, ry, innerW, switchRowH, 8);
      ctx.fill();
      this.roundRect(ctx, padX, ry, innerW, switchRowH, 8);
      ctx.stroke();
      ctx.restore();

      // 图标 + 标签
      ctx.save();
      ctx.fillStyle = '#5D4037';
      ctx.font = `${compact ? 16 : 20}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${switchIcons[i]}  ${switchLabels[i]}`, padX + 12, ry + switchRowH / 2);
      ctx.restore();

      // 开关（占位，始终 ON）
      const tW = compact ? 48 : 56;
      const tH = compact ? 22 : 26;
      const tX = padX + innerW - tW - 12;
      const tY = ry + (switchRowH - tH) / 2;
      this.drawToggle(ctx, tX, tY, tW, tH, true);

      this.rowToggles.push({
        rect: { x: padX, y: ry, w: innerW, h: switchRowH },
        isOn: true,
        action: 'placeholder',
      });

      curY += switchRowH + 4;
    }

    curY += (compact ? 2 : 6);

    // ── 分隔线 ─────────────────────────────────
    this.drawDivider(ctx, padX, curY, innerW);
    curY += 4;

    // ── 列表项 ──────────────────────────────────
    const listRowH = compact ? 34 : 42;
    const listLabels = ['\u4E3B\u9898', '\u600E\u4E48\u73A9', '\u65E0\u5E7F\u544A', '\u91CD\u65B0\u5F00\u59CB'];
    const listIcons = ['\uD83C\uDFA8', '\u2139\uFE0F', '\uD83D\uDC51', '\uD83D\uDD04'];
    this.listItems = [];

    for (let i = 0; i < listLabels.length; i++) {
      const ly = curY;
      const isLast = i === listLabels.length - 1;

      this.listItems.push({ x: padX, y: ly, w: innerW, h: listRowH });

      // 图标 + 标签
      ctx.save();
      ctx.fillStyle = '#5D4037';
      ctx.font = `${compact ? 16 : 20}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${listIcons[i]}  ${listLabels[i]}`, padX + 8, ly + listRowH / 2);
      ctx.restore();

      // 右侧：最后一项是绿色按钮，其余是箭头
      if (isLast) {
        const rbW = compact ? 70 : 90;
        const rbH = compact ? 24 : 30;
        const rbX = padX + innerW - rbW - 8;
        const rbY = ly + (listRowH - rbH) / 2;
        ctx.save();
        ctx.fillStyle = '#4CAF50';
        this.roundRect(ctx, rbX, rbY, rbW, rbH, 6);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${compact ? 12 : 14}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u91CD\u65B0\u5F00\u59CB', rbX + rbW / 2, rbY + rbH / 2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = '#8B5A2B';
        ctx.font = `bold ${compact ? 18 : 22}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u203A', padX + innerW - 8, ly + listRowH / 2);
        ctx.restore();
      }

      // 行间分隔线（非最后一项）
      if (!isLast) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padX + 8, ly + listRowH);
        ctx.lineTo(padX + innerW - 8, ly + listRowH);
        ctx.stroke();
        ctx.restore();
      }

      curY += listRowH;
    }
  }

  onPointerDown(x: number, y: number): boolean {
    if (!this.visible) return false;

    // 关闭按钮
    if (this.hitTest(x, y, this.closeBtn)) {
      this.close();
      return true;
    }

    // 图标开关
    for (const toggle of this.iconToggles) {
      if (this.hitTest(x, y, toggle.rect)) {
        if (toggle.action === 'music') {
          const newVal = !this.soundManager.musicEnabled;
          this.soundManager.musicEnabled = newVal;
          this.progressManager.updateSettings({ musicEnabled: newVal });
          // musicEnabled setter 会自动 stopBGM，但开启时需要手动 startBGM
          if (newVal) this.soundManager.startBGM();
        } else if (toggle.action === 'sound') {
          const newVal = !this.soundManager.enabled;
          this.soundManager.enabled = newVal;
          this.progressManager.updateSettings({ soundEnabled: newVal });
        }
        // placeholder 不做处理
        return true;
      }
    }

    // 开关行（占位，不做处理）
    for (const toggle of this.rowToggles) {
      if (this.hitTest(x, y, toggle.rect)) {
        return true;
      }
    }

    // 列表项
    for (let i = 0; i < this.listItems.length; i++) {
      if (this.hitTest(x, y, this.listItems[i])) {
        // 最后一项"重新开始"
        if (i === this.listItems.length - 1 && this.onRestart) {
          this.onRestart();
          this.close();
        }
        return true;
      }
    }

    // 消费事件防穿透
    return true;
  }

  // ─── 绘制工具方法 ─────────────────────────────

  /** 绘制 ON/OFF 开关滑块 */
  private drawToggle(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    isOn: boolean,
  ): void {
    const r = h / 2;

    // 轨道
    ctx.save();
    ctx.fillStyle = isOn ? '#4CAF50' : '#BDBDBD';
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + w - r, y + r, r, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();

    // ON/OFF 文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(h * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isOn) {
      ctx.fillText('ON', x + r + 2, y + r);
    } else {
      ctx.fillText('OFF', x + w - r - 2, y + r);
    }

    // 滑块
    const knobR = r - 2;
    const knobX = isOn ? x + w - r : x + r;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.beginPath();
    ctx.arc(knobX, y + r, knobR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 绘制分隔线 */
  private drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(139,90,43,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.restore();
  }

  private hitTest(x: number, y: number, rect: PRect): boolean {
    return x >= rect.x && x <= rect.x + rect.w &&
           y >= rect.y && y <= rect.y + rect.h;
  }

  private roundRect(
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
  }
}
