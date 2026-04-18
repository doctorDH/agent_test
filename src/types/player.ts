/**
 * player.ts - 玩家数据类型定义
 * 定义玩家进度、成就和偏好设置
 */

/** 支持的语言 */
export type Language = 'zh' | 'en';

/** 玩家偏好设置 */
export interface PlayerSettings {
  /** 是否开启背景音乐 */
  musicEnabled: boolean;
  /** 是否开启音效 */
  soundEnabled: boolean;
  /** 界面语言 */
  language: Language;
}

/** 玩家整体进度 */
export interface PlayerProgress {
  /** 当前解锁到的关卡 */
  currentLevel: number;
  /** 各关卡最高分：key 为 levelId */
  highScores: Record<number, number>;
  /** 各关卡最佳用时（ms）：key 为 levelId */
  bestTimes: Record<number, number>;
  /** 累计游戏局数 */
  totalGamesPlayed: number;
  /** 累计胜利局数 */
  totalGamesWon: number;
  /** 玩家设置 */
  settings: PlayerSettings;
  /** 昵称 */
  nickname: string;
  /** 内置头像编号（0-7） */
  avatarId: number;
  /** 头像框编号（0-5） */
  frameId: number;
  /** 自定义头像 Data URL */
  customAvatarDataUrl: string;
}
