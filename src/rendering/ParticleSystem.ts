/**
 * ParticleSystem.ts - 轻量粒子特效系统
 *
 * 对象池设计，预分配避免 GC 抖动。
 * 两种效果：消除火花（小范围金色）和通关金雨（全屏多色飘落）。
 */

/** 单个粒子 */
interface Particle {
  /** 是否存活 */
  alive: boolean;
  /** 当前位置 */
  x: number;
  y: number;
  /** 速度 */
  vx: number;
  vy: number;
  /** 剩余寿命 ms */
  life: number;
  /** 总寿命 ms（用于计算 alpha） */
  maxLife: number;
  /** 颜色 */
  color: string;
  /** 半径 */
  radius: number;
  /** 重力加速度 */
  gravity: number;
}

/** 最大粒子数 */
const MAX_PARTICLES = 80;

/** 火花颜色池 */
const SPARK_COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#FFE066', '#FFEC80'];

/** 金雨/庆祝颜色池 */
const CONFETTI_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
];

export class ParticleSystem {
  private pool: Particle[] = [];

  constructor() {
    // 预分配对象池
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        alive: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: '#FFF',
        radius: 2,
        gravity: 0,
      });
    }
  }

  /**
   * 消除火花：在指定位置发射 8-12 个金色/橙色小粒子
   * @param cx - 中心 X（设计坐标）
   * @param cy - 中心 Y（设计坐标）
   */
  emitMatchSparks(cx: number, cy: number): void {
    const count = 8 + Math.floor(Math.random() * 5); // 8-12
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 80; // px/s

      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 350 + Math.random() * 150; // 350-500ms
      p.maxLife = p.life;
      p.color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      p.radius = 2 + Math.random() * 2;
      p.gravity = 80; // 轻微下坠
    }
  }

  /**
   * 通关金雨：在屏幕顶部发射 30-40 个彩色飘落粒子
   * @param width - 屏幕宽度（设计坐标）
   * @param height - 屏幕高度（设计坐标）
   */
  emitConfetti(width: number, height: number): void {
    const count = 30 + Math.floor(Math.random() * 11); // 30-40
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;

      p.x = Math.random() * width;
      p.y = -10 - Math.random() * 50; // 屏幕上方起始
      p.vx = (Math.random() - 0.5) * 60; // 轻微横向飘动
      p.vy = 40 + Math.random() * 60; // 向下飘落
      p.life = 1800 + Math.random() * 700; // 1800-2500ms
      p.maxLife = p.life;
      p.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      p.radius = 3 + Math.random() * 3;
      p.gravity = 20; // 缓慢加速下落
    }
  }

  /**
   * 更新所有存活粒子
   * @param dt - 帧时间增量 ms
   */
  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const p of this.pool) {
      if (!p.alive) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }

      p.vy += p.gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
    }
  }

  /**
   * 渲染所有存活粒子
   * @param ctx - Canvas 2D 上下文
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.pool) {
      if (!p.alive) continue;

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 是否有存活粒子 */
  hasAlive(): boolean {
    return this.pool.some((p) => p.alive);
  }

  // ─── 内部方法 ─────────────────────────────────────

  /** 从对象池获取一个空闲粒子 */
  private acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.alive) {
        p.alive = true;
        return p;
      }
    }
    return null; // 池满
  }
}
