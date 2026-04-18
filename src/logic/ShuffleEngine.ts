/**
 * ShuffleEngine.ts - 打乱引擎
 *
 * 负责打乱棋盘上剩余牌的牌面并确保可解性。
 * 纯函数实现，零浏览器/DOM/Canvas 依赖。
 *
 * 打乱策略：
 * 1. 收集剩余牌面 → 随机重分配 → 验证可解性
 * 2. 不可解则重试（上限 100 次）
 * 3. 100 次仍不可解，使用逆向求解法重新放置
 */

import type { BoardState, Tile, TileType } from '../types';
import { TileState } from '../types';
import { findAllFreePairs } from './MatchingEngine';

// ─── 内部辅助函数 ──────────────────────────────────────────

/**
 * Fisher-Yates 洗牌算法（不修改原数组）
 */
function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 收集棋盘上所有未移除的牌
 */
function getActiveTiles(board: BoardState): Tile[] {
  const result: Tile[] = [];
  for (const tile of board.tiles.values()) {
    if (tile.state !== 'removed') {
      result.push(tile);
    }
  }
  return result;
}

/**
 * 用新的牌面列表替换棋盘上所有未移除牌的牌面
 *
 * 保持位置不变，仅替换 TileType。
 * 不修改原始 board。
 */
function reassignTileTypes(
  board: BoardState,
  activeTiles: Tile[],
  newTypes: TileType[],
): BoardState {
  const newTilesMap = new Map<number, Tile>();

  // 先复制所有牌（包括已移除的）
  for (const [id, tile] of board.tiles) {
    newTilesMap.set(id, tile);
  }

  // 用新牌面替换未移除的牌
  for (let i = 0; i < activeTiles.length; i++) {
    const original = activeTiles[i];
    newTilesMap.set(original.id, {
      ...original,
      type: { ...newTypes[i] },
    });
  }

  return {
    ...board,
    tiles: newTilesMap,
    selectedTileId: null,
  };
}

/**
 * 使用逆向求解法对剩余牌重新分配牌面
 *
 * 利用贪心消除的逆序来保证可解性：
 * 1. 找到一条完整的消除路径（贪心方式）
 * 2. 按逆序分配牌面：最后消除的牌对先分配牌面
 *
 * 这确保存在至少一条合法消除路径。
 */
function reversesolveReassign(
  board: BoardState,
  activeTiles: Tile[],
  types: TileType[],
): BoardState {
  // 将牌面配成对
  const pairTypes: TileType[] = [];
  const shuffledTypes = shuffle(types);
  for (let i = 0; i < shuffledTypes.length; i += 2) {
    pairTypes.push(shuffledTypes[i]);
  }

  // 模拟贪心消除，记录消除顺序
  const tempBoard = reassignTileTypes(board, activeTiles, types);
  const removalOrder: [number, number][] = [];
  let simBoard = tempBoard;

  while (true) {
    const pairs = findAllFreePairs(simBoard);
    if (pairs.length === 0) break;
    const [id1, id2] = pairs[0];
    removalOrder.push([id1, id2]);

    // 移除这对牌
    const newTiles = new Map<number, Tile>();
    for (const [id, tile] of simBoard.tiles) {
      if (id === id1 || id === id2) {
        newTiles.set(id, { ...tile, state: TileState.Removed });
      } else {
        newTiles.set(id, tile);
      }
    }
    simBoard = { ...simBoard, tiles: newTiles, removedCount: simBoard.removedCount + 2 };
  }

  // 按消除的逆序分配牌面（逆向求解保证）
  const newTilesMap = new Map<number, Tile>();
  for (const [id, tile] of board.tiles) {
    newTilesMap.set(id, tile);
  }

  const shuffledPairs = shuffle(pairTypes);
  for (let i = 0; i < removalOrder.length && i < shuffledPairs.length; i++) {
    const [id1, id2] = removalOrder[i];
    const tileType = shuffledPairs[i];
    const tile1 = board.tiles.get(id1);
    const tile2 = board.tiles.get(id2);
    if (tile1) {
      newTilesMap.set(id1, { ...tile1, type: { ...tileType } });
    }
    if (tile2) {
      newTilesMap.set(id2, { ...tile2, type: { ...tileType } });
    }
  }

  return {
    ...board,
    tiles: newTilesMap,
    selectedTileId: null,
  };
}

// ─── 导出的公共 API ─────────────────────────────────────────

/**
 * 打乱棋盘上剩余牌的牌面
 *
 * 策略：
 * 1. 收集所有未移除牌的 TileType 列表
 * 2. 随机打乱这个列表
 * 3. 按原位置重新分配牌面
 * 4. 检查 isSolvable，不可解则重试（上限 100 次）
 * 5. 如果 100 次都不可解，使用逆向求解法重新放置
 *
 * @param board - 当前棋盘状态
 * @returns 打乱后的新棋盘状态
 */
export function shuffleBoard(board: BoardState): BoardState {
  const activeTiles = getActiveTiles(board);
  if (activeTiles.length === 0) return board;

  // 收集所有未移除牌的牌面类型
  const tileTypes = activeTiles.map((t) => t.type);

  const MAX_RETRIES = 100;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const shuffledTypes = shuffle(tileTypes);
    const candidate = reassignTileTypes(board, activeTiles, shuffledTypes);

    if (isSolvable(candidate)) {
      return candidate;
    }
  }

  // 100 次都不可解，使用逆向求解法
  return reversesolveReassign(board, activeTiles, tileTypes);
}

/**
 * 检查棋盘是否可解（多路径随机贪心）
 *
 * 算法：
 * 1. 进行多轮随机贪心模拟（默认 10 轮）
 * 2. 每轮随机选择可用配对进行消除
 * 3. 任一轮成功清空棋盘即返回 true
 * 4. 所有轮次都失败才返回 false
 *
 * 多路径策略大幅降低了单路径贪心的假阴性率。
 *
 * @param board - 要检查的棋盘状态
 * @param attempts - 尝试的随机路径数量，默认 10
 * @returns 棋盘是否可解
 */
export function isSolvable(board: BoardState, attempts: number = 10): boolean {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (trySolveGreedy(board)) {
      return true;
    }
  }
  return false;
}

/** 单次随机贪心模拟 */
function trySolveGreedy(board: BoardState): boolean {
  let simTiles = new Map<number, Tile>();
  let activeCount = 0;

  for (const [id, tile] of board.tiles) {
    simTiles.set(id, { ...tile });
    if (tile.state !== 'removed') {
      activeCount++;
    }
  }

  let simBoard: BoardState = {
    ...board,
    tiles: simTiles,
  };

  while (activeCount > 0) {
    const pairs = findAllFreePairs(simBoard);

    if (pairs.length === 0) {
      return false;
    }

    // 随机选择一对（而非总是第一对）
    const idx = Math.floor(Math.random() * pairs.length);
    const [id1, id2] = pairs[idx];
    const newTiles = new Map<number, Tile>();
    for (const [id, tile] of simBoard.tiles) {
      if (id === id1 || id === id2) {
        newTiles.set(id, { ...tile, state: TileState.Removed });
      } else {
        newTiles.set(id, tile);
      }
    }

    activeCount -= 2;
    simBoard = {
      ...simBoard,
      tiles: newTiles,
      removedCount: simBoard.removedCount + 2,
    };
  }

  return true;
}
