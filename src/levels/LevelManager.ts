/**
 * LevelManager.ts - 关卡管理器
 * 负责根据关卡 ID 组装完整的 LevelDefinition，包括布局、牌池和难度参数
 */

import type { TileType } from '../types/tile';
import { TileSuit } from '../types/tile';
import type { DifficultyParams, LevelDefinition } from '../types/level';
import { LevelLayouts } from './LevelLayouts';

// ============================================================
// 可用牌种类定义（全部候选牌面）
// ============================================================

/** 生成一组数牌（1-9）的 TileType 数组 */
function createNumberedSuit(suit: TileSuit): TileType[] {
  const types: TileType[] = [];
  for (let v = 1; v <= 9; v++) {
    types.push({
      suit,
      value: v,
      displayId: `${suit}_${v}`,
    });
  }
  return types;
}

/** 所有可用牌面种类，按难度递增排列 */
const ALL_TILE_TYPES: TileType[] = [
  // 条 1-9（9 种）
  ...createNumberedSuit(TileSuit.Bamboo),
  // 万 1-9（9 种）
  ...createNumberedSuit(TileSuit.Character),
  // 筒 1-9（9 种）
  ...createNumberedSuit(TileSuit.Circle),
  // 风牌 4 种
  { suit: TileSuit.Wind, value: 1, displayId: 'wind_east' },
  { suit: TileSuit.Wind, value: 2, displayId: 'wind_south' },
  { suit: TileSuit.Wind, value: 3, displayId: 'wind_west' },
  { suit: TileSuit.Wind, value: 4, displayId: 'wind_north' },
  // 箭牌（中发白）3 种
  { suit: TileSuit.Dragon, value: 1, displayId: 'dragon_red' },
  { suit: TileSuit.Dragon, value: 2, displayId: 'dragon_green' },
  { suit: TileSuit.Dragon, value: 3, displayId: 'dragon_white' },
  // 花牌 4 种
  { suit: TileSuit.Flower, value: 1, displayId: 'flower_1' },
  { suit: TileSuit.Flower, value: 2, displayId: 'flower_2' },
  { suit: TileSuit.Flower, value: 3, displayId: 'flower_3' },
  { suit: TileSuit.Flower, value: 4, displayId: 'flower_4' },
  // 季牌 4 种
  { suit: TileSuit.Season, value: 1, displayId: 'season_spring' },
  { suit: TileSuit.Season, value: 2, displayId: 'season_summer' },
  { suit: TileSuit.Season, value: 3, displayId: 'season_autumn' },
  { suit: TileSuit.Season, value: 4, displayId: 'season_winter' },
];

// ============================================================
// 难度参数预设
// ============================================================

/** 各关卡难度参数 */
const DIFFICULTY_PRESETS: DifficultyParams[] = [
  // Level 1 - 新手入门（24牌）
  {
    maxLayers: 2,
    tileVariety: 6,
    initialShuffles: 10,
    initialHints: 10,
    bonusTimeThreshold: 120000,
    comboWindowMs: 5000,
  },
  // Level 2 - 经典龟形（48牌）
  {
    maxLayers: 3,
    tileVariety: 8,
    initialShuffles: 10,
    initialHints: 10,
    bonusTimeThreshold: 150000,
    comboWindowMs: 5000,
  },
  // Level 3 - 密集堆叠（72牌）
  {
    maxLayers: 4,
    tileVariety: 10,
    initialShuffles: 8,
    initialHints: 8,
    bonusTimeThreshold: 180000,
    comboWindowMs: 5000,
  },
  // Level 4 - 十字阵（36牌）
  {
    maxLayers: 2,
    tileVariety: 10,
    initialShuffles: 8,
    initialHints: 8,
    bonusTimeThreshold: 150000,
    comboWindowMs: 3000,
  },
  // Level 5 - 菱形塔（48牌）
  {
    maxLayers: 3,
    tileVariety: 12,
    initialShuffles: 8,
    initialHints: 8,
    bonusTimeThreshold: 180000,
    comboWindowMs: 3000,
  },
  // Level 6 - 回字环（60牌）
  {
    maxLayers: 3,
    tileVariety: 12,
    initialShuffles: 6,
    initialHints: 6,
    bonusTimeThreshold: 200000,
    comboWindowMs: 3000,
  },
  // Level 7 - 双L迷宫（72牌）
  {
    maxLayers: 4,
    tileVariety: 14,
    initialShuffles: 5,
    initialHints: 5,
    bonusTimeThreshold: 240000,
    comboWindowMs: 2000,
  },
  // Level 8 - 金字塔（80牌）
  {
    maxLayers: 5,
    tileVariety: 16,
    initialShuffles: 5,
    initialHints: 5,
    bonusTimeThreshold: 270000,
    comboWindowMs: 2000,
  },
  // Level 9 - 锯齿阵（84牌）
  {
    maxLayers: 4,
    tileVariety: 16,
    initialShuffles: 4,
    initialHints: 4,
    bonusTimeThreshold: 270000,
    comboWindowMs: 2000,
  },
  // Level 10 - 终极堡垒（96牌）
  {
    maxLayers: 6,
    tileVariety: 18,
    initialShuffles: 4,
    initialHints: 4,
    bonusTimeThreshold: 300000,
    comboWindowMs: 2000,
  },
];

// ============================================================
// 牌池生成
// ============================================================

/**
 * 根据牌面种类数和总牌数生成牌池
 *
 * 策略：
 * 1. 从 ALL_TILE_TYPES 中选取前 variety 种牌面
 * 2. 每种牌面至少出现 2 张（1 对），确保可配对
 * 3. 如果总牌数 > variety * 2，则循环分配额外的对数
 *
 * @param variety - 需要的牌面种类数
 * @param totalTiles - 总牌数（必须为偶数）
 * @returns 牌池数组，长度等于 totalTiles
 */
function generateTilePool(variety: number, totalTiles: number): TileType[] {
  if (totalTiles % 2 !== 0) {
    throw new Error(`总牌数 ${totalTiles} 必须为偶数`);
  }

  // 选取指定数量的牌面种类
  const availableTypes = ALL_TILE_TYPES.slice(0, Math.min(variety, ALL_TILE_TYPES.length));
  const selectedVariety = availableTypes.length;

  const pairsNeeded = totalTiles / 2;
  const pool: TileType[] = [];

  // 循环分配对数到各牌面种类
  for (let i = 0; i < pairsNeeded; i++) {
    const tileType = availableTypes[i % selectedVariety];
    // 每对 = 2 张同样的牌
    pool.push({ ...tileType });
    pool.push({ ...tileType });
  }

  return pool;
}

// ============================================================
// 关卡管理器
// ============================================================

/**
 * 获取总关卡数
 */
export function getLevelCount(): number {
  return LevelLayouts.length;
}

/**
 * 根据关卡 ID（从 1 开始）获取完整的关卡定义
 * @param levelId - 关卡 ID（1-based）
 * @returns 完整的 LevelDefinition
 * @throws 当 levelId 超出范围时抛出错误
 */
export function getLevel(levelId: number): LevelDefinition {
  const index = levelId - 1;

  if (index < 0 || index >= LevelLayouts.length) {
    throw new Error(
      `关卡 ID ${levelId} 超出范围，可用范围: 1-${LevelLayouts.length}`,
    );
  }

  const layout = LevelLayouts[index];
  const difficulty = DIFFICULTY_PRESETS[index];

  if (!difficulty) {
    throw new Error(`关卡 ${levelId} 缺少难度参数配置`);
  }

  const tilePool = generateTilePool(difficulty.tileVariety, layout.totalTiles);

  return {
    levelId,
    layout,
    tilePool,
    difficulty,
  };
}

/**
 * 获取所有关卡定义（用于关卡选择界面等场景）
 */
export function getAllLevels(): LevelDefinition[] {
  const levels: LevelDefinition[] = [];
  for (let i = 1; i <= getLevelCount(); i++) {
    levels.push(getLevel(i));
  }
  return levels;
}
