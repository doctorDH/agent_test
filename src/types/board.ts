/**
 * board.ts - 棋盘类型定义
 * 定义棋盘配置、棋盘状态和操作记录
 */

import type { Tile, TilePosition } from './tile';

/** 棋盘布局配置 */
export interface BoardConfig {
  /** 布局唯一标识 */
  id: string;
  /** 布局名称 */
  name: string;
  /** 列数（半牌宽度网格） */
  cols: number;
  /** 行数（半牌高度网格） */
  rows: number;
  /** 总层数 */
  layers: number;
  /** 所有牌位坐标列表 */
  tilePositions: TilePosition[];
  /** 总牌数（必须为偶数） */
  totalTiles: number;
}

/** 棋盘运行时状态 */
export interface BoardState {
  /** 当前使用的布局配置 */
  config: BoardConfig;
  /** 牌表：key 为 Tile.id */
  tiles: Map<number, Tile>;
  /** 当前选中牌的 id，无选中时为 null */
  selectedTileId: number | null;
  /** 已移除牌的数量 */
  removedCount: number;
  /** 总牌数 */
  totalCount: number;
  /** 操作历史（用于撤销等功能） */
  moveHistory: MoveRecord[];
}

/** 一次匹配操作的记录 */
export interface MoveRecord {
  /** 第一张牌的 id */
  tile1Id: number;
  /** 第二张牌的 id */
  tile2Id: number;
  /** 操作时间戳 */
  timestamp: number;
  /** 本次操作获得的分数 */
  scoreAwarded: number;
}
