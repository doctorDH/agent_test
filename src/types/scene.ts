/**
 * scene.ts - 场景系统类型定义
 * 定义场景枚举、场景接口和场景切换过渡
 */

/** 场景类型枚举 */
export enum SceneType {
  /** 开始界面 */
  Begin = 'begin',
  /** 游戏主场景 */
  Game = 'game',
  /** 结算界面 */
  Complete = 'complete',
}

/** 场景接口：所有场景必须实现 */
export interface IScene {
  /** 进入场景时调用，可携带传入数据 */
  enter(data?: unknown): void;
  /** 离开场景时调用，用于资源清理 */
  exit(): void;
  /** 每帧更新逻辑 */
  update(dt: number): void;
  /** 每帧渲染 */
  render(ctx: CanvasRenderingContext2D): void;
  /** 指针按下事件 */
  onPointerDown(x: number, y: number): void;
  /** 指针抬起事件 */
  onPointerUp(x: number, y: number): void;
}

/** 场景切换过渡状态 */
export interface SceneTransition {
  /** 来源场景 */
  from: SceneType;
  /** 目标场景 */
  to: SceneType;
  /** 过渡总时长（ms） */
  duration: number;
  /** 已经过时间（ms） */
  elapsed: number;
  /** 过渡是否正在进行 */
  active: boolean;
}
