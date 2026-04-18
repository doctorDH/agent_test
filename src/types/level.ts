/**
 * level.ts - 关卡定义类型
 * 定义关卡布局、牌池和难度参数
 */

import type { BoardConfig } from './board';
import type { TileType } from './tile';

/** 难度参数 */
export interface DifficultyParams {
  /** 最大层数 */
  maxLayers: number;
  /** 牌面种类数量（种类越多越难） */
  tileVariety: number;
  /** 初始可用洗牌次数 */
  initialShuffles: number;
  /** 初始可用提示次数 */
  initialHints: number;
  /** 奖励时间阈值（ms）：低于此时间完成可获额外奖励 */
  bonusTimeThreshold: number;
  /** 连击窗口时长（ms）：两次匹配间隔小于此值可累计连击 */
  comboWindowMs: number;
}

/** 单个关卡的完整定义 */
export interface LevelDefinition {
  /** 关卡唯一标识 */
  levelId: number;
  /** 棋盘布局配置 */
  layout: BoardConfig;
  /** 可用牌池（用于随机发牌） */
  tilePool: TileType[];
  /** 难度参数 */
  difficulty: DifficultyParams;
}
