/**
 * MatchingEngine 单元测试
 * 测试自由牌检测、配对验证、查找所有可用配对等核心逻辑
 */

import { describe, it, expect } from 'vitest';
import {
  isFreeTile,
  canMatch,
  findAllFreePairs,
  getFreeTiles,
} from '../../src/logic/MatchingEngine';
import type { BoardState, BoardConfig, Tile, TilePosition, TileType } from '../../src/types';
import { TileState, TileSuit } from '../../src/types';

// ─── 辅助函数 ──────────────────────────────────────────

/** 创建一个简单的 TileType */
function tileType(suit: TileSuit, value: number): TileType {
  return { suit, value, displayId: `${suit}_${value}` };
}

/** 创建一张牌 */
function createTile(
  id: number,
  col: number,
  row: number,
  layer: number,
  type: TileType,
  state: TileState = TileState.Normal,
): Tile {
  return {
    id,
    type: { ...type },
    position: { col, row, layer },
    state,
  };
}

/** 创建测试用的 BoardState */
function createTestBoard(tiles: Tile[]): BoardState {
  const tilesMap = new Map<number, Tile>();
  for (const t of tiles) {
    tilesMap.set(t.id, t);
  }
  // 计算未移除的牌数
  let activeCount = 0;
  for (const t of tiles) {
    if (t.state !== TileState.Removed) activeCount++;
  }

  const config: BoardConfig = {
    id: 'test',
    name: 'Test Board',
    cols: 20,
    rows: 20,
    layers: 5,
    tilePositions: tiles.map((t) => t.position),
    totalTiles: tiles.length,
  };

  return {
    config,
    tiles: tilesMap,
    selectedTileId: null,
    removedCount: tiles.length - activeCount,
    totalCount: tiles.length,
    moveHistory: [],
  };
}

const TYPE_A = tileType(TileSuit.Bamboo, 1);
const TYPE_B = tileType(TileSuit.Character, 2);

// ─── 测试 ──────────────────────────────────────────

describe('MatchingEngine', () => {
  describe('isFreeTile', () => {
    it('顶层无遮挡的牌是自由牌', () => {
      // 单张牌，无遮挡，无侧面阻挡
      const tile = createTile(1, 0, 0, 0, TYPE_A);
      const board = createTestBoard([tile]);
      expect(isFreeTile(board, 1)).toBe(true);
    });

    it('被上层牌覆盖的牌不是自由牌', () => {
      // 底层牌在 (0,0,0)，上层牌在 (1,1,1) 覆盖它
      // 覆盖条件：|col差| < 2 且 |row差| < 2
      const bottom = createTile(1, 0, 0, 0, TYPE_A);
      const top = createTile(2, 1, 1, 1, TYPE_B);
      const board = createTestBoard([bottom, top]);
      expect(isFreeTile(board, 1)).toBe(false);
    });

    it('两侧都被同层牌阻挡的牌不是自由牌', () => {
      // 中间牌在 (2,0,0)，左侧牌在 (0,0,0)，右侧牌在 (4,0,0)
      // 左侧阻挡：colDiff = 0-2 = -2, rowDiff = 0 < 2 ✓
      // 右侧阻挡：colDiff = 4-2 = 2, rowDiff = 0 < 2 ✓
      const left = createTile(1, 0, 0, 0, TYPE_A);
      const center = createTile(2, 2, 0, 0, TYPE_A);
      const right = createTile(3, 4, 0, 0, TYPE_A);
      const board = createTestBoard([left, center, right]);
      expect(isFreeTile(board, 2)).toBe(false);
    });

    it('只有一侧被阻挡的牌仍然是自由牌', () => {
      // 中间牌在 (2,0,0)，只有左侧牌在 (0,0,0)
      const left = createTile(1, 0, 0, 0, TYPE_A);
      const center = createTile(2, 2, 0, 0, TYPE_A);
      const board = createTestBoard([left, center]);
      expect(isFreeTile(board, 2)).toBe(true);
    });

    it('已移除的牌不是自由牌', () => {
      const tile = createTile(1, 0, 0, 0, TYPE_A, TileState.Removed);
      const board = createTestBoard([tile]);
      expect(isFreeTile(board, 1)).toBe(false);
    });

    it('不存在的牌 id 返回 false', () => {
      const tile = createTile(1, 0, 0, 0, TYPE_A);
      const board = createTestBoard([tile]);
      expect(isFreeTile(board, 999)).toBe(false);
    });
  });

  describe('canMatch', () => {
    it('相同类型的两张自由牌可以匹配', () => {
      // 两张同类型牌，位于不同位置，均无遮挡
      const tile1 = createTile(1, 0, 0, 0, TYPE_A);
      const tile2 = createTile(2, 4, 0, 0, TYPE_A);
      const board = createTestBoard([tile1, tile2]);
      expect(canMatch(board, 1, 2)).toBe(true);
    });

    it('不同类型的自由牌不能匹配', () => {
      const tile1 = createTile(1, 0, 0, 0, TYPE_A);
      const tile2 = createTile(2, 4, 0, 0, TYPE_B);
      const board = createTestBoard([tile1, tile2]);
      expect(canMatch(board, 1, 2)).toBe(false);
    });

    it('非自由牌不能匹配（即使类型相同）', () => {
      // 中间牌被两侧阻挡，不自由
      const left = createTile(1, 0, 0, 0, TYPE_B);
      const center = createTile(2, 2, 0, 0, TYPE_A);
      const right = createTile(3, 4, 0, 0, TYPE_B);
      const free = createTile(4, 8, 0, 0, TYPE_A);
      const board = createTestBoard([left, center, right, free]);
      // center(id=2) 被两侧阻挡，不自由
      expect(canMatch(board, 2, 4)).toBe(false);
    });

    it('同一张牌不能与自己匹配', () => {
      const tile = createTile(1, 0, 0, 0, TYPE_A);
      const board = createTestBoard([tile]);
      expect(canMatch(board, 1, 1)).toBe(false);
    });
  });

  describe('findAllFreePairs', () => {
    it('能找到所有可用配对', () => {
      // 4 张牌：2 对 TYPE_A 和 2 张 TYPE_B，全部自由（不相邻）
      const tiles = [
        createTile(1, 0, 0, 0, TYPE_A),
        createTile(2, 4, 0, 0, TYPE_A),
        createTile(3, 0, 4, 0, TYPE_B),
        createTile(4, 4, 4, 0, TYPE_B),
      ];
      const board = createTestBoard(tiles);
      const pairs = findAllFreePairs(board);
      // 应该找到 2 对：[1,2] 和 [3,4]
      expect(pairs.length).toBe(2);
      expect(pairs).toContainEqual([1, 2]);
      expect(pairs).toContainEqual([3, 4]);
    });

    it('没有可用配对时返回空数组', () => {
      // 所有牌类型各不同
      const tiles = [
        createTile(1, 0, 0, 0, TYPE_A),
        createTile(2, 4, 0, 0, TYPE_B),
      ];
      const board = createTestBoard(tiles);
      const pairs = findAllFreePairs(board);
      expect(pairs.length).toBe(0);
    });

    it('被遮挡的配对不在结果中', () => {
      // 底层有一对 TYPE_A，但其中一张被上层覆盖
      const bottom1 = createTile(1, 0, 0, 0, TYPE_A);
      const bottom2 = createTile(2, 4, 0, 0, TYPE_A);
      const cover = createTile(3, 0, 0, 1, TYPE_B); // 覆盖 bottom1
      const board = createTestBoard([bottom1, bottom2, cover]);
      const pairs = findAllFreePairs(board);
      expect(pairs.length).toBe(0);
    });
  });

  describe('getFreeTiles', () => {
    it('返回正确的自由牌列表', () => {
      // 3 张牌：2 张自由，1 张被覆盖
      const tile1 = createTile(1, 0, 0, 0, TYPE_A);
      const tile2 = createTile(2, 4, 0, 0, TYPE_B);
      const cover = createTile(3, 0, 0, 1, TYPE_A); // 覆盖 tile1
      const board = createTestBoard([tile1, tile2, cover]);
      const freeTiles = getFreeTiles(board);
      const freeIds = freeTiles.map((t) => t.id).sort();
      // tile1(id=1) 被 cover(id=3) 覆盖，不自由
      // tile2(id=2) 和 cover(id=3) 自由
      expect(freeIds).toEqual([2, 3]);
    });

    it('空棋盘返回空数组', () => {
      const board = createTestBoard([]);
      const freeTiles = getFreeTiles(board);
      expect(freeTiles.length).toBe(0);
    });
  });
});
