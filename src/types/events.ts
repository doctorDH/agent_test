/**
 * events.ts - 事件系统类型定义
 * 使用 TypeScript discriminated union 实现类型安全的发布/订阅事件
 */

import type { LevelStats } from './session';
import type { SceneType } from './scene';

/** 所有游戏事件的联合类型（discriminated union） */
export type GameEvent =
  | TileSelectedEvent
  | TileDeselectedEvent
  | MatchMadeEvent
  | MatchFailedEvent
  | ComboUpdatedEvent
  | BoardChangedEvent
  | ShuffleUsedEvent
  | HintUsedEvent
  | LevelCompleteEvent
  | LevelFailedEvent
  | SceneChangeEvent
  | PointerDownEvent
  | PointerUpEvent;

/** 事件类型字面量联合 */
export type GameEventType = GameEvent['type'];

// ─── 牌操作事件 ─────────────────────────────────

export interface TileSelectedEvent {
  type: 'tile_selected';
  tileId: number;
}

export interface TileDeselectedEvent {
  type: 'tile_deselected';
  tileId: number;
}

export interface MatchMadeEvent {
  type: 'match_made';
  tile1Id: number;
  tile2Id: number;
  score: number;
}

export interface MatchFailedEvent {
  type: 'match_failed';
  tile1Id: number;
  tile2Id: number;
}

// ─── 连击事件 ───────────────────────────────────

export interface ComboUpdatedEvent {
  type: 'combo_updated';
  chain: number;
  multiplier: number;
}

// ─── 棋盘事件 ───────────────────────────────────

export interface BoardChangedEvent {
  type: 'board_changed';
}

export interface ShuffleUsedEvent {
  type: 'shuffle_used';
  remaining: number;
}

export interface HintUsedEvent {
  type: 'hint_used';
  remaining: number;
  tile1Id: number;
  tile2Id: number;
}

// ─── 关卡事件 ───────────────────────────────────

export interface LevelCompleteEvent {
  type: 'level_complete';
  stats: LevelStats;
}

export interface LevelFailedEvent {
  type: 'level_failed';
}

// ─── 场景事件 ───────────────────────────────────

export interface SceneChangeEvent {
  type: 'scene_change';
  from: SceneType;
  to: SceneType;
  data?: unknown;
}

// ─── 输入事件 ───────────────────────────────────

export interface PointerDownEvent {
  type: 'pointer_down';
  x: number;
  y: number;
}

export interface PointerUpEvent {
  type: 'pointer_up';
  x: number;
  y: number;
}

// ─── 事件订阅辅助类型 ──────────────────────────

/** 根据事件类型字面量提取对应的事件接口 */
export type EventByType<T extends GameEventType> = Extract<GameEvent, { type: T }>;

/** 事件监听器回调签名 */
export type EventListener<T extends GameEventType> = (event: EventByType<T>) => void;

/** 事件总线接口 */
export interface IEventBus {
  /** 订阅事件 */
  on<T extends GameEventType>(type: T, listener: EventListener<T>): void;
  /** 取消订阅 */
  off<T extends GameEventType>(type: T, listener: EventListener<T>): void;
  /** 发布事件 */
  emit<T extends GameEventType>(event: EventByType<T>): void;
}
