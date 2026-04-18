/**
 * ShuffleEngine 单元测试
 * 测试棋盘打乱和可解性检查
 */

import { describe, it, expect } from 'vitest';
import { shuffleBoard, isSolvable } from '../../src/logic/ShuffleEngine';
import { createBoard } from '../../src/logic/BoardEngine';
import { LevelLayouts } from '../../src/levels/LevelLayouts';
import { TileState, TileSuit } from '../../src/types';
import type { BoardState, BoardConfig, Tile, TileType } from '../../src/types';

// ─── 辅助函数 ──────────────────────────────────────────

function createTestTilePool(variety: number): TileType[] {
  const pool: TileType[] = [];
  for (let i = 1; i <= variety; i++) {
    pool.push({
      suit: TileSuit.Bamboo,
      value: i,
      displayId: `bamboo_${i}`,
    });
  }
  return pool;
}

/** 创建一个所有牌都已移除的空棋盘 */
function createEmptyBoard(): BoardState {
  const config: BoardConfig = {
    id: 'empty',
    name: 'Empty Board',
    cols: 4,
    rows: 4,
    layers: 1,
    tilePositions: [
      { col: 0, row: 0, layer: 0 },
      { col: 2, row: 0, layer: 0 },
    ],
    totalTiles: 2,
  };

  const tile1: Tile = {
    id: 1,
    type: { suit: TileSuit.Bamboo, value: 1, displayId: 'bamboo_1' },
    position: { col: 0, row: 0, layer: 0 },
    state: TileState.Removed,
  };
  const tile2: Tile = {
    id: 2,
    type: { suit: TileSuit.Bamboo, value: 1, displayId: 'bamboo_1' },
    position: { col: 2, row: 0, layer: 0 },
    state: TileState.Removed,
  };

  const tiles = new Map<number, Tile>();
  tiles.set(1, tile1);
  tiles.set(2, tile2);

  return {
    config,
    tiles,
    selectedTileId: null,
    removedCount: 2,
    totalCount: 2,
    moveHistory: [],
  };
}

// ─── 测试 ──────────────────────────────────────────

describe('ShuffleEngine', () => {
  const level1 = LevelLayouts[0];
  const tilePool = createTestTilePool(9);

  describe('shuffleBoard', () => {
    it('打乱后牌数不变', () => {
      const board = createBoard(level1, tilePool);
      const shuffled = shuffleBoard(board);

      // 统计未移除的牌数
      let originalActive = 0;
      for (const t of board.tiles.values()) {
        if (t.state !== TileState.Removed) originalActive++;
      }
      let shuffledActive = 0;
      for (const t of shuffled.tiles.values()) {
        if (t.state !== TileState.Removed) shuffledActive++;
      }

      expect(shuffledActive).toBe(originalActive);
    });

    it('打乱后牌面种类集合不变', () => {
      const board = createBoard(level1, tilePool);
      const shuffled = shuffleBoard(board);

      // 收集原始牌面并排序
      const originalTypes: string[] = [];
      for (const t of board.tiles.values()) {
        if (t.state !== TileState.Removed) {
          originalTypes.push(t.type.displayId);
        }
      }
      originalTypes.sort();

      // 收集打乱后牌面并排序
      const shuffledTypes: string[] = [];
      for (const t of shuffled.tiles.values()) {
        if (t.state !== TileState.Removed) {
          shuffledTypes.push(t.type.displayId);
        }
      }
      shuffledTypes.sort();

      expect(shuffledTypes).toEqual(originalTypes);
    });

    it('打乱空棋盘不会报错', () => {
      const emptyBoard = createEmptyBoard();
      const result = shuffleBoard(emptyBoard);
      expect(result).toBeDefined();
    });
  });

  describe('isSolvable', () => {
    it('对简单可解棋盘返回 true', () => {
      // 手动构造一个确定可解的简单棋盘：
      // 两对牌，位置分开（不互相阻挡），贪心可解
      const config: BoardConfig = {
        id: 'solvable_test',
        name: 'Solvable Test',
        cols: 12,
        rows: 4,
        layers: 1,
        tilePositions: [
          { col: 0, row: 0, layer: 0 },
          { col: 4, row: 0, layer: 0 },
          { col: 0, row: 2, layer: 0 },
          { col: 4, row: 2, layer: 0 },
        ],
        totalTiles: 4,
      };
      const typeA: TileType = { suit: TileSuit.Bamboo, value: 1, displayId: 'bamboo_1' };
      const typeB: TileType = { suit: TileSuit.Bamboo, value: 2, displayId: 'bamboo_2' };
      const tiles = new Map<number, Tile>();
      tiles.set(1, { id: 1, type: { ...typeA }, position: { col: 0, row: 0, layer: 0 }, state: TileState.Normal });
      tiles.set(2, { id: 2, type: { ...typeA }, position: { col: 4, row: 0, layer: 0 }, state: TileState.Normal });
      tiles.set(3, { id: 3, type: { ...typeB }, position: { col: 0, row: 2, layer: 0 }, state: TileState.Normal });
      tiles.set(4, { id: 4, type: { ...typeB }, position: { col: 4, row: 2, layer: 0 }, state: TileState.Normal });
      const board: BoardState = {
        config,
        tiles,
        selectedTileId: null,
        removedCount: 0,
        totalCount: 4,
        moveHistory: [],
      };
      expect(isSolvable(board)).toBe(true);
    });

    it('对已清空棋盘返回 true', () => {
      const emptyBoard = createEmptyBoard();
      expect(isSolvable(emptyBoard)).toBe(true);
    });

    it('对只剩一对可匹配的棋盘返回 true', () => {
      // 只有两张同类型的自由牌
      const config: BoardConfig = {
        id: 'single_pair',
        name: 'Single Pair',
        cols: 8,
        rows: 4,
        layers: 1,
        tilePositions: [
          { col: 0, row: 0, layer: 0 },
          { col: 4, row: 0, layer: 0 },
        ],
        totalTiles: 2,
      };
      const type1: TileType = { suit: TileSuit.Bamboo, value: 1, displayId: 'bamboo_1' };
      const tiles = new Map<number, Tile>();
      tiles.set(1, {
        id: 1,
        type: { ...type1 },
        position: { col: 0, row: 0, layer: 0 },
        state: TileState.Normal,
      });
      tiles.set(2, {
        id: 2,
        type: { ...type1 },
        position: { col: 4, row: 0, layer: 0 },
        state: TileState.Normal,
      });

      const board: BoardState = {
        config,
        tiles,
        selectedTileId: null,
        removedCount: 0,
        totalCount: 2,
        moveHistory: [],
      };

      expect(isSolvable(board)).toBe(true);
    });

    it('对无法配对的棋盘返回 false', () => {
      // 两张不同类型的牌，无法配对
      const config: BoardConfig = {
        id: 'unsolvable',
        name: 'Unsolvable',
        cols: 8,
        rows: 4,
        layers: 1,
        tilePositions: [
          { col: 0, row: 0, layer: 0 },
          { col: 4, row: 0, layer: 0 },
        ],
        totalTiles: 2,
      };
      const tiles = new Map<number, Tile>();
      tiles.set(1, {
        id: 1,
        type: { suit: TileSuit.Bamboo, value: 1, displayId: 'bamboo_1' },
        position: { col: 0, row: 0, layer: 0 },
        state: TileState.Normal,
      });
      tiles.set(2, {
        id: 2,
        type: { suit: TileSuit.Character, value: 2, displayId: 'character_2' },
        position: { col: 4, row: 0, layer: 0 },
        state: TileState.Normal,
      });

      const board: BoardState = {
        config,
        tiles,
        selectedTileId: null,
        removedCount: 0,
        totalCount: 2,
        moveHistory: [],
      };

      expect(isSolvable(board)).toBe(false);
    });
  });
});
