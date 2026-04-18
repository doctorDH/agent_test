/**
 * session.ts - 游戏会话类型定义
 * 定义一局游戏的完整运行时状态和结算统计
 */

import type { BoardState } from './board';

/** 游戏进行状态 */
export type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

/** 一局游戏的完整会话状态 */
export interface GameSession {
  /** 当前关卡 id */
  levelId: number;
  /** 棋盘状态 */
  board: BoardState;
  /** 当前得分 */
  score: number;
  /** 已匹配对数 */
  matchCount: number;
  /** 当前连击链长度 */
  comboChain: number;
  /** 本局最大连击数 */
  maxCombo: number;
  /** 游戏开始时间戳（ms） */
  startTime: number;
  /** 已过时间（ms） */
  elapsedMs: number;
  /** 剩余洗牌次数 */
  shufflesRemaining: number;
  /** 剩余提示次数 */
  hintsRemaining: number;
  /** 游戏状态 */
  status: GameStatus;
}

/** 关卡结算统计 */
export interface LevelStats {
  /** 关卡 id */
  levelId: number;
  /** 耗时（ms） */
  time: number;
  /** 最终得分 */
  score: number;
  /** 匹配总对数 */
  matchCount: number;
  /** 最大连击数 */
  maxCombo: number;
  /** 使用提示次数 */
  hintsUsed: number;
  /** 使用洗牌次数 */
  shufflesUsed: number;
  /** 时间奖励分数 */
  timeBonus: number;
}
