/**
 * EventBus.ts - 类型安全的事件总线
 */

import type {
  GameEventType,
  EventByType,
  EventListener,
  IEventBus,
} from '../types';

export class EventBus implements IEventBus {
  /** 事件类型 -> 监听器集合 */
  private listeners = new Map<GameEventType, Set<Function>>();

  /** 订阅事件 */
  on<T extends GameEventType>(type: T, listener: EventListener<T>): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  /** 取消订阅 */
  off<T extends GameEventType>(type: T, listener: EventListener<T>): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener);
    }
  }

  /** 发布事件，触发该类型的所有监听器 */
  emit<T extends GameEventType>(event: EventByType<T>): void {
    const set = this.listeners.get(event.type);
    if (set) {
      set.forEach((fn) => fn(event));
    }
  }
}
