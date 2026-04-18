/**
 * Game.ts - 顶层游戏类
 * 组装所有核心模块，启动游戏循环
 */

import { EventBus } from './core/EventBus';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { SceneManager } from './core/SceneManager';
import { ProgressManager } from './core/ProgressManager';
import { SoundManager } from './audio/SoundManager';
import { SceneType } from './types';
import type { IEventBus } from './types';
import { BeginScene } from './scenes/BeginScene';
import { GameScene } from './scenes/GameScene';
import { CompleteScene } from './scenes/CompleteScene';

/** 设计宽度（所有坐标基于此） */
const DESIGN_WIDTH = 750;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private eventBus: IEventBus;
  private sceneManager: SceneManager;
  private progressManager: ProgressManager;
  private soundManager: SoundManager;
  private inputManager: InputManager;
  private gameLoop: GameLoop;

  /** 当前设计高度（根据屏幕比例动态计算） */
  private designHeight = 0;

  constructor() {
    // 1. 获取 canvas 元素
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('找不到 #game-canvas 元素');
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 2D 上下文');
    }
    this.ctx = ctx;

    // 2. 设置 canvas 尺寸
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // 3. 创建 EventBus
    this.eventBus = new EventBus();

    // 4. 创建 InputManager 并初始化
    this.inputManager = new InputManager();
    this.inputManager.init(this.canvas, this.eventBus);

    // 5. 创建 SceneManager 并注册三个场景
    this.sceneManager = new SceneManager();
    this.progressManager = new ProgressManager();
    this.soundManager = new SoundManager();

    // 从玩家设置初始化音效/音乐状态
    const settings = this.progressManager.getSettings();
    this.soundManager.enabled = settings.soundEnabled;
    this.soundManager.musicEnabled = settings.musicEnabled;

    const getDesignHeight = () => this.designHeight;

    this.sceneManager.registerScene(
      SceneType.Begin,
      new BeginScene(this.eventBus, getDesignHeight, this.progressManager, this.soundManager, this.canvas),
    );
    this.sceneManager.registerScene(
      SceneType.Game,
      new GameScene(this.eventBus, getDesignHeight, this.progressManager, this.soundManager),
    );
    this.sceneManager.registerScene(
      SceneType.Complete,
      new CompleteScene(this.eventBus, getDesignHeight, this.progressManager, this.soundManager),
    );

    // 6. 监听场景切换事件
    this.eventBus.on('scene_change', (event) => {
      this.sceneManager.changeScene(event.to, event.data);
    });

    // 7. 监听输入事件，委派给 SceneManager
    this.eventBus.on('pointer_down', (event) => {
      // 首次交互时恢复 AudioContext
      this.soundManager.resume();
      this.sceneManager.onPointerDown(event.x, event.y);
    });
    this.eventBus.on('pointer_up', (event) => {
      this.sceneManager.onPointerUp(event.x, event.y);
    });

    // 8. 创建 GameLoop
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render(),
    );
  }

  /** 调整 canvas 尺寸以适应窗口 */
  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    // 物理像素尺寸
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;

    // CSS 显示尺寸
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // 计算设计高度（基于 750 设计宽度）
    this.designHeight = DESIGN_WIDTH * (displayHeight / displayWidth);

    // 设置 ctx 缩放：将设计坐标映射到物理像素
    const scale = this.canvas.width / DESIGN_WIDTH;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  /** 逻辑更新 */
  private update(dt: number): void {
    this.sceneManager.update(dt);
  }

  /** 渲染 */
  private render(): void {
    const w = DESIGN_WIDTH;
    const h = this.designHeight;

    // 清屏
    this.ctx.clearRect(0, 0, w, h);

    // 委派给场景管理器
    this.sceneManager.render(this.ctx);
  }

  /** 启动游戏 */
  start(): void {
    // 切换到 Begin 场景
    this.sceneManager.changeScene(SceneType.Begin);
    // 启动主循环
    this.gameLoop.start();
  }
}
