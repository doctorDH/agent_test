/**
 * AnimationManager.ts - 轻量补间动画引擎
 *
 * 管理所有运行中的补间动画，支持自定义缓动函数。
 * 每帧由主循环调用 update(dt) 推进所有活动动画。
 */

// ─── 补间动画数据结构 ─────────────────────────────────

interface Tween {
  /** 唯一标识 */
  id: number;
  /** 起始值 */
  from: number;
  /** 目标值 */
  to: number;
  /** 动画时长（ms） */
  duration: number;
  /** 已经过时间（ms） */
  elapsed: number;
  /** 缓动函数，输入 [0,1] 输出 [0,1] */
  easing: (t: number) => number;
  /** 每帧回调，接收当前插值 */
  onUpdate: (value: number) => void;
  /** 动画完成回调 */
  onComplete?: () => void;
}

// ─── 内置缓动函数 ─────────────────────────────────────

export const Easings = {
  /** 线性 */
  linear: (t: number): number => t,

  /** 缓入缓出（二次） */
  easeInOut: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  /** 缓出回弹 */
  easeOutBack: (t: number): number => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },

  /** 缓出二次 */
  easeOutQuad: (t: number): number => t * (2 - t),
};

// ─── 动画管理器 ───────────────────────────────────────

export class AnimationManager {
  /** 自增 ID 计数器 */
  private nextId = 1;

  /** 所有活动的补间动画 */
  private tweens: Map<number, Tween> = new Map();

  /**
   * 创建一个补间动画
   *
   * @param from - 起始值
   * @param to - 目标值
   * @param duration - 动画时长（ms）
   * @param onUpdate - 每帧回调，接收当前插值
   * @param onComplete - 动画完成时的回调
   * @param easing - 缓动函数，默认 easeOutQuad
   * @returns 动画 ID，可用于取消
   */
  tween(
    from: number,
    to: number,
    duration: number,
    onUpdate: (v: number) => void,
    onComplete?: () => void,
    easing: (t: number) => number = Easings.easeOutQuad,
  ): number {
    const id = this.nextId++;
    this.tweens.set(id, {
      id,
      from,
      to,
      duration: Math.max(duration, 1), // 防止零时长
      elapsed: 0,
      easing,
      onUpdate,
      onComplete,
    });

    // 立即发送初始值
    onUpdate(from);

    return id;
  }

  /**
   * 每帧更新所有活动的补间动画
   *
   * @param dt - 距上一帧的时间增量（ms）
   */
  update(dt: number): void {
    const completed: number[] = [];

    for (const [id, tw] of this.tweens) {
      tw.elapsed += dt;

      // 计算归一化进度 [0, 1]
      const rawProgress = Math.min(tw.elapsed / tw.duration, 1);
      const easedProgress = tw.easing(rawProgress);

      // 插值计算当前值
      const value = tw.from + (tw.to - tw.from) * easedProgress;
      tw.onUpdate(value);

      // 动画完成
      if (rawProgress >= 1) {
        completed.push(id);
      }
    }

    // 移除已完成的动画并触发完成回调
    for (const id of completed) {
      const tw = this.tweens.get(id);
      this.tweens.delete(id);
      tw?.onComplete?.();
    }
  }

  /**
   * 取消指定动画
   *
   * @param id - 要取消的动画 ID
   */
  cancel(id: number): void {
    this.tweens.delete(id);
  }

  /**
   * 取消所有动画
   */
  cancelAll(): void {
    this.tweens.clear();
  }

  /**
   * 获取当前活动的动画数量（用于调试）
   */
  get activeCount(): number {
    return this.tweens.size;
  }
}
