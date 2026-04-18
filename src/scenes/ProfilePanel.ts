/**
 * ProfilePanel.ts - 个人信息浮层面板
 * 全屏遮罩 + 居中卡片，头像预览/切换/改名/照片上传/保存
 * 自适应横屏/竖屏布局
 */

import { AvatarRenderer } from '../rendering/AvatarRenderer';
import type { ProgressManager } from '../core/ProgressManager';

/** 面板内 Tab 页 */
type PanelTab = 'avatar' | 'frame';

/** 矩形区域 */
interface PRect {
  x: number; y: number; w: number; h: number;
}

/** 设计宽度 */
const DESIGN_WIDTH = 750;

export class ProfilePanel {
  private progressManager: ProgressManager;
  private canvas: HTMLCanvasElement;

  private visible = false;
  private activeTab: PanelTab = 'avatar';

  // 当前编辑值（保存前不写入 ProgressManager）
  private editNickname = '';
  private editAvatarId = 0;
  private editFrameId = 0;
  private editCustomDataUrl = '';

  // 按钮区域（每帧 render 时更新）
  private closeBtn: PRect = { x: 0, y: 0, w: 0, h: 0 };
  private saveBtn: PRect = { x: 0, y: 0, w: 0, h: 0 };
  private avatarTabBtn: PRect = { x: 0, y: 0, w: 0, h: 0 };
  private frameTabBtn: PRect = { x: 0, y: 0, w: 0, h: 0 };
  private nicknameBtn: PRect = { x: 0, y: 0, w: 0, h: 0 };
  private photoBtn: PRect = { x: 0, y: 0, w: 0, h: 0 };
  private gridItems: PRect[] = [];

  // 自定义头像图片缓存
  private cachedAvatarImage: HTMLImageElement | null = null;
  private cachedDataUrl = '';

  constructor(progressManager: ProgressManager, canvas: HTMLCanvasElement) {
    this.progressManager = progressManager;
    this.canvas = canvas;
  }

  open(): void {
    const p = this.progressManager.getProgress();
    this.editNickname = p.nickname || this.progressManager.generateDefaultNickname();
    this.editAvatarId = p.avatarId;
    this.editFrameId = p.frameId;
    this.editCustomDataUrl = p.customAvatarDataUrl;
    this.activeTab = 'avatar';
    this.visible = true;
    this.updateCachedImage();
  }

  close(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** 渲染面板（在最上层绘制），自适应屏幕高度 */
  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.visible) return;

    // ── 全屏遮罩 ──────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // ── 自适应卡片尺寸 ──────────────────────────
    const cardW = Math.min(600, w - 30);
    const cardH = Math.min(680, h - 16);
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    // 紧凑模式：高度不够时缩小间距和元素
    const compact = cardH < 500;
    const veryCompact = cardH < 380;

    ctx.save();
    ctx.fillStyle = '#1E1E32';
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();
    ctx.restore();

    // ── 布局计算：从上到下分配空间 ───────────────
    let curY = cardY + 8;

    // 标题 + 关闭按钮（同一行）
    const titleH = compact ? 28 : 36;
    curY += titleH / 2;

    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${compact ? 20 : 26}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u4E2A\u4EBA\u4FE1\u606F', w / 2, curY);
    ctx.restore();

    // 关闭按钮
    const closeSize = compact ? 26 : 30;
    const closeX = cardX + cardW - closeSize - 8;
    const closeY = curY - closeSize / 2;
    this.closeBtn = { x: closeX, y: closeY, w: closeSize, h: closeSize };
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(closeX + 6, closeY + 6);
    ctx.lineTo(closeX + closeSize - 6, closeY + closeSize - 6);
    ctx.moveTo(closeX + closeSize - 6, closeY + 6);
    ctx.lineTo(closeX + 6, closeY + closeSize - 6);
    ctx.stroke();
    ctx.restore();

    curY += titleH / 2 + (compact ? 4 : 10);

    // ── 头像 + 昵称（水平排列以节省空间） ─────────
    const avatarSize = veryCompact ? 40 : compact ? 50 : 70;
    const avatarX = cardX + 30;
    const avatarCenterY = curY + avatarSize / 2;

    if (this.editCustomDataUrl && this.cachedAvatarImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(this.cachedAvatarImage, avatarX, curY, avatarSize, avatarSize);
      ctx.restore();
    } else {
      AvatarRenderer.drawBuiltinAvatar(ctx, this.editAvatarId, avatarX, curY, avatarSize);
    }
    AvatarRenderer.drawAvatarFrame(ctx, this.editFrameId, avatarX, curY, avatarSize);

    // 昵称（头像右侧）
    const nickX = avatarX + avatarSize + 16;
    const nickFontSize = compact ? 18 : 22;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${nickFontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const nickText = this.editNickname || '\u70B9\u51FB\u8BBE\u7F6E\u6635\u79F0';
    ctx.fillText(nickText, nickX, avatarCenterY);
    const nickW = ctx.measureText(nickText).width;
    ctx.fillStyle = 'rgba(255,215,0,0.6)';
    ctx.font = `${compact ? 14 : 16}px sans-serif`;
    ctx.fillText('\u270E', nickX + nickW + 8, avatarCenterY);
    ctx.restore();
    this.nicknameBtn = { x: nickX - 5, y: avatarCenterY - 15, w: nickW + 35, h: 30 };

    curY += avatarSize + (compact ? 6 : 14);

    // ── Tab 切换（头像/头像框） ──────────────────
    const tabH = compact ? 28 : 34;
    const tabW = compact ? 80 : 100;
    const tabGap = 12;
    const tabStartX = w / 2 - (tabW * 2 + tabGap) / 2;
    const tabFontSize = compact ? 14 : 16;

    this.avatarTabBtn = { x: tabStartX, y: curY, w: tabW, h: tabH };
    ctx.save();
    ctx.fillStyle = this.activeTab === 'avatar' ? '#FFD700' : 'rgba(255,255,255,0.15)';
    this.roundRect(ctx, tabStartX, curY, tabW, tabH, 8);
    ctx.fill();
    ctx.fillStyle = this.activeTab === 'avatar' ? '#1E1E32' : '#FFFFFF';
    ctx.font = `bold ${tabFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u5934\u50CF', tabStartX + tabW / 2, curY + tabH / 2);
    ctx.restore();

    const frameTabX = tabStartX + tabW + tabGap;
    this.frameTabBtn = { x: frameTabX, y: curY, w: tabW, h: tabH };
    ctx.save();
    ctx.fillStyle = this.activeTab === 'frame' ? '#FFD700' : 'rgba(255,255,255,0.15)';
    this.roundRect(ctx, frameTabX, curY, tabW, tabH, 8);
    ctx.fill();
    ctx.fillStyle = this.activeTab === 'frame' ? '#1E1E32' : '#FFFFFF';
    ctx.font = `bold ${tabFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u5934\u50CF\u6846', frameTabX + tabW / 2, curY + tabH / 2);
    ctx.restore();

    curY += tabH + (compact ? 6 : 14);

    // ── 底部按钮区域预留空间 ────────────────────
    const saveBtnH = compact ? 38 : 48;
    const bottomPadding = compact ? 8 : 14;
    const photoRowH = this.activeTab === 'avatar' ? (compact ? 28 : 34) : 0;
    const bottomReserved = saveBtnH + bottomPadding + (photoRowH > 0 ? photoRowH + 6 : 0) + 8;

    // ── 网格区域：填充剩余空间 ──────────────────
    const gridAvailH = (cardY + cardH) - curY - bottomReserved;
    const cols = 4;
    const rows = 2;
    // 计算能容纳的格子大小
    const maxItemByH = Math.floor((gridAvailH - (rows - 1) * 8) / rows);
    const maxItemByW = Math.floor((cardW - 40 - (cols - 1) * 10) / cols);
    const gridItemSize = Math.min(70, maxItemByH, maxItemByW);
    const gridGap = Math.min(12, Math.floor((gridAvailH - rows * gridItemSize) / (rows + 1)));
    const gridTotalW = cols * gridItemSize + (cols - 1) * gridGap;
    const gridStartX = (w - gridTotalW) / 2;

    this.gridItems = [];
    const totalItems = this.activeTab === 'avatar' ? 8 : 6;
    const selectedId = this.activeTab === 'avatar' ? this.editAvatarId : this.editFrameId;

    for (let i = 0; i < totalItems; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = gridStartX + col * (gridItemSize + gridGap);
      const iy = curY + row * (gridItemSize + gridGap);

      this.gridItems.push({ x: ix, y: iy, w: gridItemSize, h: gridItemSize });

      // 选中高亮
      if (i === selectedId) {
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        this.roundRect(ctx, ix - 2, iy - 2, gridItemSize + 4, gridItemSize + 4, 8);
        ctx.stroke();
        ctx.restore();
      }

      // 绘制内容
      const innerPad = Math.max(3, Math.floor(gridItemSize * 0.08));
      if (this.activeTab === 'avatar') {
        AvatarRenderer.drawBuiltinAvatar(ctx, i, ix + innerPad, iy + innerPad, gridItemSize - innerPad * 2);
      } else {
        const framePad = Math.max(6, Math.floor(gridItemSize * 0.14));
        AvatarRenderer.drawBuiltinAvatar(ctx, 0, ix + framePad, iy + framePad, gridItemSize - framePad * 2);
        AvatarRenderer.drawAvatarFrame(ctx, i, ix + framePad, iy + framePad, gridItemSize - framePad * 2);
      }
    }

    // 网格底部
    const gridBottom = curY + rows * (gridItemSize + gridGap);

    // ── 照片按钮（仅在头像 Tab 显示） ─────────
    let photoBtnBottom = gridBottom;
    if (this.activeTab === 'avatar') {
      const photoBtnW = compact ? 80 : 100;
      const photoBtnH2 = compact ? 26 : 32;
      const photoBtnX = w / 2 - photoBtnW / 2;
      const photoBtnY = gridBottom + 3;
      this.photoBtn = { x: photoBtnX, y: photoBtnY, w: photoBtnW, h: photoBtnH2 };

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      this.roundRect(ctx, photoBtnX, photoBtnY, photoBtnW, photoBtnH2, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${compact ? 13 : 15}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\uD83D\uDCF7 \u7167\u7247', photoBtnX + photoBtnW / 2, photoBtnY + photoBtnH2 / 2);
      ctx.restore();
      photoBtnBottom = photoBtnY + photoBtnH2;
    } else {
      this.photoBtn = { x: 0, y: 0, w: 0, h: 0 };
    }

    // ── 保存按钮（始终在卡片底部） ──────────────
    const saveBtnW = compact ? 160 : 200;
    const saveBtnX = (w - saveBtnW) / 2;
    const saveBtnY = cardY + cardH - saveBtnH - bottomPadding;
    this.saveBtn = { x: saveBtnX, y: saveBtnY, w: saveBtnW, h: saveBtnH };

    const btnGrad = ctx.createLinearGradient(saveBtnX, saveBtnY, saveBtnX, saveBtnY + saveBtnH);
    btnGrad.addColorStop(0, '#4CAF50');
    btnGrad.addColorStop(1, '#388E3C');
    ctx.save();
    ctx.fillStyle = btnGrad;
    this.roundRect(ctx, saveBtnX, saveBtnY, saveBtnW, saveBtnH, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${compact ? 18 : 22}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u4FDD\u5B58', saveBtnX + saveBtnW / 2, saveBtnY + saveBtnH / 2);
    ctx.restore();
  }

  /**
   * 处理点击事件
   * @returns true 如果面板消费了该事件
   */
  onPointerDown(x: number, y: number): boolean {
    if (!this.visible) return false;

    // 关闭按钮
    if (this.hitTest(x, y, this.closeBtn)) {
      this.close();
      return true;
    }

    // 保存按钮
    if (this.hitTest(x, y, this.saveBtn)) {
      this.progressManager.updateProfile({
        nickname: this.editNickname,
        avatarId: this.editAvatarId,
        frameId: this.editFrameId,
        customAvatarDataUrl: this.editCustomDataUrl,
      });
      this.close();
      return true;
    }

    // Tab 切换
    if (this.hitTest(x, y, this.avatarTabBtn)) {
      this.activeTab = 'avatar';
      return true;
    }
    if (this.hitTest(x, y, this.frameTabBtn)) {
      this.activeTab = 'frame';
      return true;
    }

    // 昵称编辑
    if (this.hitTest(x, y, this.nicknameBtn)) {
      this.showNicknameInput();
      return true;
    }

    // 照片按钮
    if (this.hitTest(x, y, this.photoBtn)) {
      this.showPhotoInput();
      return true;
    }

    // 网格项目
    for (let i = 0; i < this.gridItems.length; i++) {
      if (this.hitTest(x, y, this.gridItems[i])) {
        if (this.activeTab === 'avatar') {
          this.editAvatarId = i;
          this.editCustomDataUrl = '';
          this.cachedAvatarImage = null;
        } else {
          this.editFrameId = i;
        }
        return true;
      }
    }

    // 面板内点击但不在任何按钮上：消费事件防穿透
    return true;
  }

  // ─── 内部方法 ─────────────────────────────

  /** 弹出昵称输入框（DOM 覆盖） */
  private showNicknameInput(): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 12;
    input.value = this.editNickname;
    input.placeholder = '\u8F93\u5165\u6635\u79F0';

    // 定位到画布上的昵称位置
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / DESIGN_WIDTH;
    const cssX = rect.left + this.nicknameBtn.x * scaleX;
    const cssY = rect.top + this.nicknameBtn.y * scaleX;
    const cssW = Math.max(160, this.nicknameBtn.w) * scaleX;
    const cssH = this.nicknameBtn.h * scaleX;

    input.style.cssText = `
      position: fixed;
      left: ${cssX}px;
      top: ${cssY}px;
      width: ${cssW}px;
      height: ${Math.max(cssH, 28)}px;
      font-size: ${Math.max(14, 16 * scaleX)}px;
      text-align: center;
      border: 2px solid #FFD700;
      border-radius: 6px;
      background: #1E1E32;
      color: #FFFFFF;
      outline: none;
      z-index: 9999;
      padding: 2px 6px;
      box-sizing: border-box;
    `;

    document.body.appendChild(input);

    // 延迟 focus 确保浏览器在手势链之后正确响应
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const val = input.value.trim();
      if (val) this.editNickname = val;
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    input.addEventListener('blur', () => {
      // 延迟移除，防止 blur 与 enter 冲突
      setTimeout(finish, 100);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    });
  }

  /** 弹出照片选择器 */
  private showPhotoInput(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = 200;
          tmpCanvas.height = 200;
          const tmpCtx = tmpCanvas.getContext('2d')!;

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          tmpCtx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 200, 200);

          this.editCustomDataUrl = tmpCanvas.toDataURL('image/jpeg', 0.8);
          this.updateCachedImage();
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    setTimeout(() => {
      if (fileInput.parentNode) fileInput.parentNode.removeChild(fileInput);
    }, 60000);
  }

  /** 更新自定义头像图片缓存 */
  private updateCachedImage(): void {
    if (this.editCustomDataUrl && this.editCustomDataUrl !== this.cachedDataUrl) {
      const img = new Image();
      img.onload = () => {
        this.cachedAvatarImage = img;
        this.cachedDataUrl = this.editCustomDataUrl;
      };
      img.src = this.editCustomDataUrl;
    } else if (!this.editCustomDataUrl) {
      this.cachedAvatarImage = null;
      this.cachedDataUrl = '';
    }
  }

  private hitTest(x: number, y: number, rect: PRect): boolean {
    return x >= rect.x && x <= rect.x + rect.w &&
           y >= rect.y && y <= rect.y + rect.h;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
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
