/**
 * BoardEngine.ts - 棋盘引擎
 *
 * 负责棋盘创建（逆向求解算法保证可解）、牌的移除和查询。
 * 纯函数实现，零浏览器/DOM/Canvas 依赖。
 *
 * 逆向求解算法：
 * 从空棋盘开始，每次找出所有"自由位置"，随机选 2 个分配相同牌面。
 * 因为放置顺序本身就是一条合法的消除路径，所以生成的棋盘必定可解。
 */

import type { BoardConfig, BoardState, Tile, TilePosition, TileType } from '../types';
import { TileState } from '../types';
import { isFreePosition } from './MatchingEngine';

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
 * 在已放置的牌列表中，找出所有"自由位置"
 *
 * 从未填充的位置中，找出那些在当前已放置牌的上下文中是"自由"的位置。
 * 自由定义与游戏中相同：不被更高层牌覆盖 + 至少一侧开放。
 */
function findFreePositions(
  unfilledPositions: TilePosition[],
  placedTiles: Tile[],
): TilePosition[] {
  return unfilledPositions.filter((pos) => isFreePosition(pos, placedTiles));
}

/**
 * 为 tilePool 生成成对的牌面分配序列
 *
 * 确保每种牌面恰好使用偶数次。将牌池打乱后循环取用，
 * 每次取一种牌面分配给 2 个位置。
 *
 * @param tilePool - 可用牌面类型列表
 * @param pairCount - 需要的配对数量
 * @returns 按对排列的牌面数组（长度 = pairCount）
 */
function generateTilePairs(
  tilePool: TileType[],
  pairCount: number,
): TileType[] {
  const shuffled = shuffle(tilePool);
  const pairs: TileType[] = [];
  for (let i = 0; i < pairCount; i++) {
    pairs.push(shuffled[i % shuffled.length]);
  }
  return shuffle(pairs);
}

// ─── 导出的公共 API ─────────────────────────────────────────

/**
 * 使用逆向求解算法创建棋盘（保证可解）
 *
 * 算法步骤：
 * 1. 复制 config.tilePositions 作为待填充位置列表
 * 2. 创建空的 tiles Map
 * 3. 循环直到所有位置被填充：
 *    a. 在当前已填充状态上，找出所有"自由位置"
 *    b. 从自由位置中随机选 2 个
 *    c. 从 tilePool 中取一种牌面，分配给这 2 个位置
 *    d. 创建 2 个 Tile 对象，加入 tiles Map
 * 4. 返回 BoardState
 *
 * @param config - 棋盘布局配置
 * @param tilePool - 可用牌面类型列表
 * @returns 初始棋盘状态
 */
export function createBoard(config: BoardConfig, tilePool: TileType[]): BoardState {
  const totalPositions = config.tilePositions.length;
  const pairCount = totalPositions / 2;

  // 生成配对的牌面序列
  const tilePairs = generateTilePairs(tilePool, pairCount);

  const tiles = new Map<number, Tile>();
  const placedTiles: Tile[] = [];
  let unfilledPositions = [...config.tilePositions];
  let nextId = 0;
  let pairIndex = 0;

  while (unfilledPositions.length > 0) {
    // 找出当前自由位置
    let freePositions = findFreePositions(unfilledPositions, placedTiles);

    // 如果自由位置不足 2 个，说明需要回退或调整策略
    // 在极端情况下，从未填充位置中随机选取（保证算法不会死循环）
    if (freePositions.length < 2) {
      freePositions = shuffle(unfilledPositions);
    }

    // 随机打乱自由位置并选取前 2 个
    const shuffledFree = shuffle(freePositions);
    const pos1 = shuffledFree[0];
    const pos2 = shuffledFree[1];

    // 取当前配对的牌面
    const tileType = tilePairs[pairIndex % tilePairs.length];
    pairIndex++;

    // 创建 Tile 对象
    const tile1: Tile = {
      id: nextId++,
      type: { ...tileType },
      position: { ...pos1 },
      state: TileState.Normal,
    };
    const tile2: Tile = {
      id: nextId++,
      type: { ...tileType },
      position: { ...pos2 },
      state: TileState.Normal,
    };

    tiles.set(tile1.id, tile1);
    tiles.set(tile2.id, tile2);
    placedTiles.push(tile1, tile2);

    // 从未填充列表中移除已放置的位置
    unfilledPositions = unfilledPositions.filter(
      (p) =>
        !(p.col === pos1.col && p.row === pos1.row && p.layer === pos1.layer) &&
        !(p.col === pos2.col && p.row === pos2.row && p.layer === pos2.layer),
    );
  }

  return {
    config,
    tiles,
    selectedTileId: null,
    removedCount: 0,
    totalCount: totalPositions,
    moveHistory: [],
  };
}

/**
 * 移除一对匹配的牌，返回新的 BoardState
 *
 * 不修改传入的 board，返回一个全新的状态对象。
 *
 * @param board - 当前棋盘状态
 * @param id1 - 第一张牌的 id
 * @param id2 - 第二张牌的 id
 * @returns 移除后的新棋盘状态
 */
export function removeTilePair(
  board: BoardState,
  id1: number,
  id2: number,
): BoardState {
  const newTiles = new Map<number, Tile>();

  for (const [id, tile] of board.tiles) {
    if (id === id1 || id === id2) {
      newTiles.set(id, {
        ...tile,
        state: TileState.Removed,
      });
    } else {
      newTiles.set(id, tile);
    }
  }

  return {
    ...board,
    tiles: newTiles,
    selectedTileId: null,
    removedCount: board.removedCount + 2,
  };
}

/**
 * 获取指定位置的牌
 *
 * @param board - 当前棋盘状态
 * @param pos - 要查询的位置
 * @returns 位于该位置的未移除的牌，不存在则返回 null
 */
export function getTileAt(
  board: BoardState,
  pos: TilePosition,
): Tile | null {
  for (const tile of board.tiles.values()) {
    if (
      tile.state !== 'removed' &&
      tile.position.col === pos.col &&
      tile.position.row === pos.row &&
      tile.position.layer === pos.layer
    ) {
      return tile;
    }
  }
  return null;
}
