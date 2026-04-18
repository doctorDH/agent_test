/**
 * InputManager.ts - 输入管理器
 * 统一 touch/mouse 事件，转换为逻辑坐标并发布事件
 */

import type { IEventBus } from '../types';

/** 设计宽度 */
const DESIGN_WIDTH = 750;

export class InputManager {
  private canvas!: HTMLCanvasElement;
  private eventBus!: IEventBus;
  /** 标记本帧是否已由 touch 处理，防止双触发 */
  private touchHandled = false;

  /** 初始化，绑定事件 */
  init(canvas: HTMLCanvasElement, eventBus: IEventBus): void {
    this.canvas = canvas;
    this.eventBus = eventBus;

    // touch 事件
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });

    // mouse 事件
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }

  /** 销毁，移除事件 */
  destroy(): void {
    const c = this.canvas;
    if (!c) return;
    c.removeEventListener('touchstart', this.onTouchStart);
    c.removeEventListener('touchend', this.onTouchEnd);
    c.removeEventListener('mousedown', this.onMouseDown);
    c.removeEventListener('mouseup', this.onMouseUp);
  }

  /** 屏幕坐标 -> 逻辑坐标 */
  private toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scale = DESIGN_WIDTH / rect.width;
    return {
      x: (clientX - rect.left) * scale,
      y: (clientY - rect.top) * scale,
    };
  }

  // ─── touch 处理 ───────────────────────────────

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.touchHandled = true;
    const t = e.changedTouches[0];
    const pos = this.toLogical(t.clientX, t.clientY);
    this.eventBus.emit({ type: 'pointer_down', x: pos.x, y: pos.y });
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const pos = this.toLogical(t.clientX, t.clientY);
    this.eventBus.emit({ type: 'pointer_up', x: pos.x, y: pos.y });
  };

  // ─── mouse 处理（touch 后跳过以防双触发）────────

  private onMouseDown = (e: MouseEvent): void => {
    if (this.touchHandled) {
      this.touchHandled = false;
      return;
    }
    const pos = this.toLogical(e.clientX, e.clientY);
    this.eventBus.emit({ type: 'pointer_down', x: pos.x, y: pos.y });
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (this.touchHandled) return;
    const pos = this.toLogical(e.clientX, e.clientY);
    this.eventBus.emit({ type: 'pointer_up', x: pos.x, y: pos.y });
  };
}
