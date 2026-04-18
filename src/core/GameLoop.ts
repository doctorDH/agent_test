/**
 * GameLoop.ts - 游戏主循环
 * 固定逻辑步长 + 可变渲染帧率
 */

/** 固定逻辑步长约 60fps */
const FIXED_STEP = 1000 / 60;

export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;

  /** 调试用 FPS 信息 */
  fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;

  constructor(
    /** 逻辑更新回调，dt 单位 ms */
    private onUpdate: (dt: number) => void,
    /** 渲染回调 */
    private onRender: () => void,
  ) {}

  /** 启动循环 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** 停止循环 */
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** 每帧执行 */
  private tick = (now: number): void => {
    if (!this.running) return;

    const delta = now - this.lastTime;
    this.lastTime = now;

    // 防止长时间挂起导致的巨大 delta
    this.accumulator += Math.min(delta, 200);

    // 固定步长逻辑更新
    while (this.accumulator >= FIXED_STEP) {
      this.onUpdate(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    // 每帧渲染
    this.onRender();

    // FPS 统计
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1000;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
