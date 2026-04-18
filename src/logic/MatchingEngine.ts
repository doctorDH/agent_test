/**
 * MatchingEngine.ts - 匹配引擎
 *
 * 负责判断牌的自由状态、配对验证、查找所有可匹配的牌对。
 * 纯函数实现，零浏览器/DOM/Canvas 依赖。
 *
 * 核心概念：
 * - 每张牌占据 2x2 半牌单元格（col, row 为左上角）
 * - 自由牌 = 未被上层覆盖 + 左右至少一侧开放
 */

import type { BoardState } from '../types';
import type { Tile, TilePosition } from '../types';

// ─── 内部辅助函数 ──────────────────────────────────────────

/**
 * 获取棋盘上所有未移除的牌
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
 * 检查某张牌是否被上层的牌覆盖
 *
 * 两张牌各自占据以 (col, row) 为左上角的 2x2 区域。
 * 当上层牌的 2x2 区域与当前牌的 2x2 区域相交时，视为覆盖。
 * 相交条件：|col1 - col2| < 2 AND |row1 - row2| < 2
 */
function isCoveredByAbove(pos: TilePosition, activeTiles: Tile[]): boolean {
  for (const other of activeTiles) {
    if (other.position.layer <= pos.layer) continue;
    if (
      Math.abs(other.position.col - pos.col) < 2 &&
      Math.abs(other.position.row - pos.row) < 2
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 检查某张牌左右两侧是否都被同层的牌阻挡
 *
 * 左侧阻挡：存在同层牌的 col = 当前牌 col - 2，且 |row差| < 2
 * 右侧阻挡：存在同层牌的 col = 当前牌 col + 2，且 |row差| < 2
 *
 * 如果左右两侧都被阻挡，返回 true（表示侧面不自由）
 */
function isBlockedBothSides(pos: TilePosition, activeTiles: Tile[]): boolean {
  let leftBlocked = false;
  let rightBlocked = false;

  for (const other of activeTiles) {
    if (other.position.layer !== pos.layer) continue;
    if (other.position.col === pos.col && other.position.row === pos.row) continue;

    const colDiff = other.position.col - pos.col;
    const rowDiff = Math.abs(other.position.row - pos.row);

    if (colDiff === -2 && rowDiff < 2) {
      leftBlocked = true;
    }
    if (colDiff === 2 && rowDiff < 2) {
      rightBlocked = true;
    }

    if (leftBlocked && rightBlocked) return true;
  }

  return leftBlocked && rightBlocked;
}

// ─── 导出的公共 API ─────────────────────────────────────────

/**
 * 判断一张牌是否为自由牌
 *
 * 自由条件：
 * 1. 未被更高层的牌覆盖
 * 2. 左右至少一侧开放（不被同层牌阻挡）
 */
export function isFreeTile(board: BoardState, tileId: number): boolean {
  const tile = board.tiles.get(tileId);
  if (!tile || tile.state === 'removed') return false;

  const activeTiles = getActiveTiles(board);

  if (isCoveredByAbove(tile.position, activeTiles)) return false;
  if (isBlockedBothSides(tile.position, activeTiles)) return false;

  return true;
}

/**
 * 判断两张牌是否可以匹配消除
 *
 * 匹配条件：
 * 1. 两张牌都是自由牌
 * 2. 两张牌的 type.suit 和 type.value 都相同（即 displayId 相同）
 * 3. 两张牌不是同一张牌
 */
export function canMatch(board: BoardState, id1: number, id2: number): boolean {
  if (id1 === id2) return false;

  const tile1 = board.tiles.get(id1);
  const tile2 = board.tiles.get(id2);
  if (!tile1 || !tile2) return false;
  if (tile1.state === 'removed' || tile2.state === 'removed') return false;

  // 牌面类型必须相同
  if (tile1.type.suit !== tile2.type.suit || tile1.type.value !== tile2.type.value) {
    return false;
  }

  // 两张牌都必须是自由牌
  if (!isFreeTile(board, id1)) return false;
  if (!isFreeTile(board, id2)) return false;

  return true;
}

/**
 * 查找棋盘上所有可匹配的自由牌对
 *
 * 返回所有可配对的 [id1, id2] 元组数组，其中 id1 < id2
 */
export function findAllFreePairs(board: BoardState): [number, number][] {
  const freeTiles = getFreeTiles(board);
  const pairs: [number, number][] = [];

  for (let i = 0; i < freeTiles.length; i++) {
    for (let j = i + 1; j < freeTiles.length; j++) {
      const t1 = freeTiles[i];
      const t2 = freeTiles[j];
      if (t1.type.suit === t2.type.suit && t1.type.value === t2.type.value) {
        pairs.push([t1.id, t2.id]);
      }
    }
  }

  return pairs;
}

/**
 * 获取所有当前自由牌
 */
export function getFreeTiles(board: BoardState): Tile[] {
  const result: Tile[] = [];
  for (const tile of board.tiles.values()) {
    if (tile.state !== 'removed' && isFreeTile(board, tile.id)) {
      result.push(tile);
    }
  }
  return result;
}

/**
 * 判断给定位置在部分填充的棋盘中是否"自由"
 *
 * 此函数用于逆向求解算法（BoardEngine.createBoard）。
 * 它检查的是：在已放置的牌集合中，某个位置是否可以被消除。
 * 逻辑与 isFreeTile 相同，但接受位置和已放置牌列表作为参数。
 */
export function isFreePosition(
  pos: TilePosition,
  placedTiles: Tile[],
): boolean {
  // 覆盖检查：是否有更高层的牌覆盖此位置
  if (isCoveredByAbove(pos, placedTiles)) return false;

  // 侧面检查：左右是否都被阻挡
  if (isBlockedBothSides(pos, placedTiles)) return false;

  return true;
}
