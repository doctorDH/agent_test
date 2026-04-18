/**
 * BoardEngine 单元测试
 * 测试棋盘创建、牌的移除、查询以及可解性保证
 */

import { describe, it, expect } from 'vitest';
import { createBoard, removeTilePair, getTileAt } from '../../src/logic/BoardEngine';
import { isSolvable } from '../../src/logic/ShuffleEngine';
import { findAllFreePairs } from '../../src/logic/MatchingEngine';
import { LevelLayouts } from '../../src/levels/LevelLayouts';
import { TileState, TileSuit } from '../../src/types';
import type { TileType, BoardConfig } from '../../src/types';

// ─── 辅助数据 ──────────────────────────────────────────

/** 创建测试用的牌池 */
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

// ─── 测试 ──────────────────────────────────────────

describe('BoardEngine', () => {
  // 使用 Level 1 作为测试布局
  const level1 = LevelLayouts[0];
  const tilePool = createTestTilePool(9);

  describe('createBoard', () => {
    it('生成的棋盘牌数与 config.totalTiles 一致', () => {
      const board = createBoard(level1, tilePool);
      expect(board.tiles.size).toBe(level1.totalTiles);
      expect(board.totalCount).toBe(level1.totalTiles);
    });

    it('生成的每种牌面都是偶数个', () => {
      const board = createBoard(level1, tilePool);
      const counts = new Map<string, number>();
      for (const tile of board.tiles.values()) {
        const key = tile.type.displayId;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      for (const [displayId, count] of counts) {
        expect(count % 2, `牌面 ${displayId} 出现 ${count} 次，不是偶数`).toBe(0);
      }
    });

    it('所有牌初始状态为 Normal', () => {
      const board = createBoard(level1, tilePool);
      for (const tile of board.tiles.values()) {
        expect(tile.state).toBe(TileState.Normal);
      }
    });

    it('初始 removedCount 为 0', () => {
      const board = createBoard(level1, tilePool);
      expect(board.removedCount).toBe(0);
    });

    it('循环 20 次调用 createBoard，每次初始棋盘都至少有一个可用配对', () => {
      for (let i = 0; i < 20; i++) {
        const board = createBoard(level1, tilePool);
        const pairs = findAllFreePairs(board);
        expect(
          pairs.length,
          `第 ${i + 1} 次创建的棋盘没有可用配对`,
        ).toBeGreaterThan(0);
      }
    });

    it('循环 20 次调用 createBoard，多路径 isSolvable 通过率应很高', () => {
      // isSolvable 使用多路径随机贪心（10 次尝试），假阴性率大幅降低。
      // createBoard 使用逆向求解算法保证真正可解。
      let solvedCount = 0;
      const totalRuns = 20;
      for (let i = 0; i < totalRuns; i++) {
        const board = createBoard(level1, tilePool);
        if (isSolvable(board)) solvedCount++;
      }
      // 多路径贪心应有 50%+ 通过率（考虑随机波动）
      expect(
        solvedCount,
        `多路径可解率 ${solvedCount}/${totalRuns} 过低`,
      ).toBeGreaterThanOrEqual(totalRuns * 0.5);
    });

    it('使用 Level 2 布局也能创建有效棋盘', () => {
      const level2 = LevelLayouts[1];
      for (let i = 0; i < 5; i++) {
        const board = createBoard(level2, tilePool);
        expect(board.tiles.size).toBe(level2.totalTiles);
        // 验证初始棋盘至少有可用配对
        const pairs = findAllFreePairs(board);
        expect(pairs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('removeTilePair', () => {
    it('正确移除两张牌', () => {
      const board = createBoard(level1, tilePool);
      const ids = [...board.tiles.keys()];
      const id1 = ids[0];
      const id2 = ids[1];
      const newBoard = removeTilePair(board, id1, id2);
      expect(newBoard.tiles.get(id1)!.state).toBe(TileState.Removed);
      expect(newBoard.tiles.get(id2)!.state).toBe(TileState.Removed);
    });

    it('removeTilePair 后 removedCount 增加 2', () => {
      const board = createBoard(level1, tilePool);
      const ids = [...board.tiles.keys()];
      const newBoard = removeTilePair(board, ids[0], ids[1]);
      expect(newBoard.removedCount).toBe(board.removedCount + 2);
    });

    it('removeTilePair 不修改原始 board', () => {
      const board = createBoard(level1, tilePool);
      const ids = [...board.tiles.keys()];
      const originalCount = board.removedCount;
      removeTilePair(board, ids[0], ids[1]);
      expect(board.removedCount).toBe(originalCount);
      expect(board.tiles.get(ids[0])!.state).toBe(TileState.Normal);
    });
  });

  describe('getTileAt', () => {
    it('能找到指定位置的牌', () => {
      const board = createBoard(level1, tilePool);
      // 取第一个 tilePosition
      const pos = level1.tilePositions[0];
      const tile = getTileAt(board, pos);
      expect(tile).not.toBeNull();
      expect(tile!.position.col).toBe(pos.col);
      expect(tile!.position.row).toBe(pos.row);
      expect(tile!.position.layer).toBe(pos.layer);
    });

    it('查找不存在的位置返回 null', () => {
      const board = createBoard(level1, tilePool);
      const tile = getTileAt(board, { col: 99, row: 99, layer: 99 });
      expect(tile).toBeNull();
    });
  });
});
