/**
 * SceneManager.ts - 场景管理器
 * 管理场景注册、切换及过渡效果
 */

import type { IScene, SceneTransition } from '../types';
import { SceneType } from '../types';

/** 默认过渡时长 ms */
const TRANSITION_DURATION = 400;

export class SceneManager {
  private scenes = new Map<SceneType, IScene>();
  private currentType: SceneType | null = null;
  private currentScene: IScene | null = null;

  /** 过渡状态 */
  private transition: SceneTransition | null = null;
  /** 过渡期间即将进入的场景数据 */
  private pendingData: unknown = undefined;

  /** 注册场景 */
  registerScene(type: SceneType, scene: IScene): void {
    this.scenes.set(type, scene);
  }

  /** 切换场景，自动调用 exit / enter */
  changeScene(type: SceneType, data?: unknown): void {
    const next = this.scenes.get(type);
    if (!next) return;

    // 如果有当前场景，启动过渡
    if (this.currentScene && this.currentType !== null) {
      this.transition = {
        from: this.currentType,
        to: type,
        duration: TRANSITION_DURATION,
        elapsed: 0,
        active: true,
      };
      this.pendingData = data;
    } else {
      // 首次进入场景，无过渡
      this.currentType = type;
      this.currentScene = next;
      next.enter(data);
    }
  }

  /** 获取当前活动场景 */
  getCurrentScene(): IScene | null {
    return this.currentScene;
  }

  /** 每帧更新，委派给当前场景 */
  update(dt: number): void {
    // 更新过渡
    if (this.transition?.active) {
      this.transition.elapsed += dt;

      // 过渡过半时执行真正的场景切换
      if (this.transition.elapsed >= this.transition.duration / 2 && this.currentType !== this.transition.to) {
        this.currentScene?.exit();
        const next = this.scenes.get(this.transition.to)!;
        this.currentType = this.transition.to;
        this.currentScene = next;
        next.enter(this.pendingData);
        this.pendingData = undefined;
      }

      // 过渡结束
      if (this.transition.elapsed >= this.transition.duration) {
        this.transition.active = false;
        this.transition = null;
      }
    }

    this.currentScene?.update(dt);
  }

  /** 每帧渲染，委派给当前场景并绘制过渡遮罩 */
  render(ctx: CanvasRenderingContext2D): void {
    this.currentScene?.render(ctx);

    // 过渡遮罩：淡入淡出黑色半透明
    if (this.transition?.active) {
      const { elapsed, duration } = this.transition;
      const half = duration / 2;
      // 前半段渐黑，后半段渐亮
      const alpha = elapsed < half
        ? elapsed / half
        : 1 - (elapsed - half) / half;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }

  /** 指针按下事件委派 */
  onPointerDown(x: number, y: number): void {
    if (this.transition?.active) return;
    this.currentScene?.onPointerDown(x, y);
  }

  /** 指针抬起事件委派 */
  onPointerUp(x: number, y: number): void {
    if (this.transition?.active) return;
    this.currentScene?.onPointerUp(x, y);
  }
}
