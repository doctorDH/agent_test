/**
 * AvatarRenderer.ts - 头像与头像框 Canvas 绘制
 * 8 种内置简笔画头像 + 6 种头像框样式，纯几何绘制
 */

export class AvatarRenderer {
  /**
   * 绘制内置头像（8 种简笔画图案）
   * @param avatarId 0-7
   */
  static drawBuiltinAvatar(
    ctx: CanvasRenderingContext2D,
    avatarId: number,
    x: number, y: number, size: number,
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2;

    // 背景圆
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 背景色（每个头像不同底色）
    const bgColors = ['#E8D5B7', '#B3E5FC', '#C8E6C9', '#FFE0B2', '#F8BBD0', '#FFF9C4', '#D1C4E9', '#FFCCBC'];
    ctx.fillStyle = bgColors[avatarId % 8];
    ctx.fillRect(x, y, size, size);

    const s = size / 50; // 缩放因子（基准 50）

    switch (avatarId % 8) {
      case 0: // 笑脸
        AvatarRenderer.drawSmiley(ctx, cx, cy, s);
        break;
      case 1: // 猫
        AvatarRenderer.drawCat(ctx, cx, cy, s);
        break;
      case 2: // 熊猫
        AvatarRenderer.drawPanda(ctx, cx, cy, s);
        break;
      case 3: // 兔子
        AvatarRenderer.drawBunny(ctx, cx, cy, s);
        break;
      case 4: // 太阳
        AvatarRenderer.drawSun(ctx, cx, cy, s);
        break;
      case 5: // 星星
        AvatarRenderer.drawStar(ctx, cx, cy, s);
        break;
      case 6: // 花
        AvatarRenderer.drawFlower(ctx, cx, cy, s);
        break;
      case 7: // 麻将牌
        AvatarRenderer.drawMahjong(ctx, cx, cy, s);
        break;
    }

    ctx.restore();
  }

  /**
   * 绘制头像框（6 种边框样式）
   * @param frameId 0-5
   */
  static drawAvatarFrame(
    ctx: CanvasRenderingContext2D,
    frameId: number,
    x: number, y: number, size: number,
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2;

    ctx.save();

    switch (frameId % 6) {
      case 0: // 无框
        break;
      case 1: // 金色圆框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 2: { // 彩虹渐变
        const grad = ctx.createConicGradient(0, cx, cy);
        grad.addColorStop(0, '#FF0000');
        grad.addColorStop(0.17, '#FF8800');
        grad.addColorStop(0.33, '#FFFF00');
        grad.addColorStop(0.5, '#00FF00');
        grad.addColorStop(0.67, '#0088FF');
        grad.addColorStop(0.83, '#8800FF');
        grad.addColorStop(1, '#FF0000');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 3: // 虚线框
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      case 4: // 双线框
        ctx.strokeStyle = '#64B5F6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#1565C0';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 5: // 菱形
        ctx.strokeStyle = '#E040FB';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r - 5);
        ctx.lineTo(cx + r + 5, cy);
        ctx.lineTo(cx, cy + r + 5);
        ctx.lineTo(cx - r - 5, cy);
        ctx.closePath();
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  // ─── 8 种头像绘制 ─────────────────────────────

  private static drawSmiley(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    // 眼睛
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 4 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 8 * s, cy - 4 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    // 嘴巴
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(cx, cy + 2 * s, 10 * s, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  private static drawCat(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    // 耳朵
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(cx - 14 * s, cy - 10 * s);
    ctx.lineTo(cx - 6 * s, cy - 20 * s);
    ctx.lineTo(cx - 2 * s, cy - 8 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 14 * s, cy - 10 * s);
    ctx.lineTo(cx + 6 * s, cy - 20 * s);
    ctx.lineTo(cx + 2 * s, cy - 8 * s);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(cx - 7 * s, cy - 2 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, cy - 2 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // 鼻子
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(cx, cy + 4 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    // 胡须
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 18 * s, cy + 2 * s); ctx.lineTo(cx - 5 * s, cy + 4 * s);
    ctx.moveTo(cx - 18 * s, cy + 6 * s); ctx.lineTo(cx - 5 * s, cy + 6 * s);
    ctx.moveTo(cx + 18 * s, cy + 2 * s); ctx.lineTo(cx + 5 * s, cy + 4 * s);
    ctx.moveTo(cx + 18 * s, cy + 6 * s); ctx.lineTo(cx + 5 * s, cy + 6 * s);
    ctx.stroke();
  }

  private static drawPanda(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    // 眼圈
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(cx - 8 * s, cy - 3 * s, 7 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 3 * s, 7 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眼白
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 3 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 8 * s, cy - 3 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    // 鼻子
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private static drawBunny(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    // 耳朵
    ctx.fillStyle = '#F8BBD0';
    ctx.beginPath();
    ctx.ellipse(cx - 7 * s, cy - 18 * s, 5 * s, 12 * s, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, cy - 18 * s, 5 * s, 12 * s, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.arc(cx - 7 * s, cy - 2 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 7 * s, cy - 2 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    // 鼻子
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.arc(cx, cy + 4 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  private static drawSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    // 光芒
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 12 * s, cy + Math.sin(angle) * 12 * s);
      ctx.lineTo(cx + Math.cos(angle) * 20 * s, cy + Math.sin(angle) * 20 * s);
      ctx.stroke();
    }
    // 太阳
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.arc(cx, cy, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    // 表情
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx - 4 * s, cy - 2 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4 * s, cy - 2 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.arc(cx, cy + 1 * s, 5 * s, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  private static drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const outerR = 18 * s;
      const innerR = 8 * s;
      if (i === 0) {
        ctx.moveTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
      } else {
        ctx.lineTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
      }
      ctx.lineTo(cx + Math.cos(innerAngle) * innerR, cy + Math.sin(innerAngle) * innerR);
    }
    ctx.closePath();
    ctx.fill();
    // 小脸
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx - 4 * s, cy - 2 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4 * s, cy - 2 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  private static drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    // 5 片花瓣
    const petalColors = ['#F48FB1', '#CE93D8', '#90CAF9', '#80CBC4', '#FFF59D'];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * 10 * s;
      const py = cy + Math.sin(angle) * 10 * s;
      ctx.fillStyle = petalColors[i];
      ctx.beginPath();
      ctx.arc(px, py, 8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // 花心
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.arc(cx, cy, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  private static drawMahjong(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    // 麻将牌轮廓
    const tw = 24 * s;
    const th = 30 * s;
    ctx.fillStyle = '#F5F5DC';
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 2 * s;
    const rx = cx - tw / 2;
    const ry = cy - th / 2;
    ctx.beginPath();
    ctx.moveTo(rx + 3 * s, ry);
    ctx.lineTo(rx + tw - 3 * s, ry);
    ctx.arcTo(rx + tw, ry, rx + tw, ry + 3 * s, 3 * s);
    ctx.lineTo(rx + tw, ry + th - 3 * s);
    ctx.arcTo(rx + tw, ry + th, rx + tw - 3 * s, ry + th, 3 * s);
    ctx.lineTo(rx + 3 * s, ry + th);
    ctx.arcTo(rx, ry + th, rx, ry + th - 3 * s, 3 * s);
    ctx.lineTo(rx, ry + 3 * s);
    ctx.arcTo(rx, ry, rx + 3 * s, ry, 3 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // "中" 字
    ctx.fillStyle = '#D32F2F';
    ctx.font = `bold ${14 * s}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u4E2D', cx, cy);
  }
}
