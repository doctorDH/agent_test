/**
 * Storage.ts - 本地存储封装
 * 类型安全的 localStorage 读写，错误时静默失败
 */

export class Storage {
  /** 保存数据 */
  save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // 静默失败（可能满或被禁用）
    }
  }

  /** 读取数据，失败时返回默认值 */
  load<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  /** 删除数据 */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // 静默失败
    }
  }
}
