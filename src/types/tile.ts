/**
 * tile.ts - 麻将牌的类型定义
 * 定义牌的花色、类型、位置、状态等核心数据结构
 */

/** 牌的花色枚举 */
export enum TileSuit {
  /** 条（竹） */
  Bamboo = 'bamboo',
  /** 万 */
  Character = 'character',
  /** 筒（饼） */
  Circle = 'circle',
  /** 风（东南西北） */
  Wind = 'wind',
  /** 龙/箭（中发白） */
  Dragon = 'dragon',
  /** 花 */
  Flower = 'flower',
  /** 季 */
  Season = 'season',
  /** 星座 */
  Zodiac = 'zodiac',
}

/** 牌的类型，描述花色与点数 */
export interface TileType {
  /** 花色 */
  suit: TileSuit;
  /** 面值/编号（如 1-9 为数牌，1-4 为风牌等） */
  value: number;
  /** 精灵图查找键，用于渲染层定位纹理 */
  displayId: string;
}

/** 牌在棋盘上的位置（半牌坐标网格） */
export interface TilePosition {
  /** 列坐标（半牌宽度为单位） */
  col: number;
  /** 行坐标（半牌高度为单位） */
  row: number;
  /** 层级（0 为最底层） */
  layer: number;
}

/** 牌的状态枚举 */
export enum TileState {
  /** 普通/空闲 */
  Normal = 'normal',
  /** 被选中 */
  Selected = 'selected',
  /** 高亮提示 */
  Highlighted = 'highlighted',
  /** 已匹配（播放匹配动画） */
  Matched = 'matched',
  /** 已移除 */
  Removed = 'removed',
}

/** 单张牌的完整数据 */
export interface Tile {
  /** 牌的唯一标识符 */
  id: number;
  /** 牌面类型 */
  type: TileType;
  /** 棋盘位置 */
  position: TilePosition;
  /** 当前状态 */
  state: TileState;
}
