/**
 * BoardRenderer.ts - 棋盘渲染器 + 触摸命中检测
 *
 * 负责将整个棋盘绘制到 Canvas 上，并提供指针命中检测。
 *
 * 坐标转换核心：
 * - 每张牌占半牌网格 2x2，显示尺寸为 TILE_WIDTH x TILE_HEIGHT
 * - 半牌单元宽 = (TILE_WIDTH + TILE_GAP) / 2 = 30px
 * - 半牌单元高 = (TILE_HEIGHT + TILE_GAP) / 2 = 38px
 * - 屏幕 X = offsetX + col * 30 * scale - layer * DEPTH_OFFSET * scale
 * - 屏幕 Y = offsetY + row * 38 * scale - layer * DEPTH_OFFSET * scale
 */

import type { BoardState } from '../types/board';
import type { BoardConfig } from '../types/board';
import type { Tile } from '../types/tile';
import { TileState } from '../types/tile';
import { TileRenderer } from './TileRenderer';

// ─── 布局信息 ─────────────────────────────────────────

export interface BoardLayout {
  /** 棋盘在屏幕上的水平偏移 */
  offsetX: number;
  /** 棋盘在屏幕上的垂直偏移 */
  offsetY: number;
  /** 缩放比例（将设计尺寸映射到可用区域） */
  scale: number;
}

// ─── 半牌单元尺寸 ─────────────────────────────────────

/** 牌间间距（px） */
const TILE_GAP = 8;
/** 半牌单元宽度（含间距，用于网格定位） */
const HALF_CELL_W = (TileRenderer.TILE_WIDTH + TILE_GAP) / 2;   // 30
/** 半牌单元高度（含间距，用于网格定位） */
const HALF_CELL_H = (TileRenderer.TILE_HEIGHT + TILE_GAP) / 2;  // 38

// ─── 棋盘渲染器 ──────────────────────────────────────

export class BoardRenderer {
  constructor(private tileRenderer: TileRenderer) {}

  /**
   * 计算棋盘在屏幕上的布局信息，使其在可用区域内居中
   *
   * @param config - 棋盘配置
   * @param areaX - 可用区域左上角 X
   * @param areaY - 可用区域左上角 Y
   * @param areaW - 可用区域宽度
   * @param areaH - 可用区域高度
   * @returns 布局信息（偏移和缩放）
   */
  calculateLayout(
    config: BoardConfig,
    areaX: number,
    areaY: number,
    areaW: number,
    areaH: number,
  ): BoardLayout {
    // 计算棋盘中所有牌位的最大 col 和最大 row
    let maxCol = 0;
    let maxRow = 0;
    for (const pos of config.tilePositions) {
      if (pos.col > maxCol) maxCol = pos.col;
      if (pos.row > maxRow) maxRow = pos.row;
    }

    // 棋盘总尺寸（设计像素）
    // +2 因为每张牌占 2 个半牌单元
    const boardWidth = (maxCol + 2) * HALF_CELL_W;
    const boardHeight = (maxRow + 2) * HALF_CELL_H;

    // 计算缩放比例，确保棋盘完整放入可用区域
    // 额外留出深度偏移的空间（最大层数 * DEPTH_OFFSET）
    const depthMargin = config.layers * TileRenderer.DEPTH_OFFSET;
    const scale = Math.min(
      areaW / (boardWidth + depthMargin),
      areaH / (boardHeight + depthMargin),
      2.5,
    );

    // 居中偏移
    const scaledWidth = boardWidth * scale;
    const scaledHeight = boardHeight * scale;
    const offsetX = areaX + (areaW - scaledWidth) / 2;
    const offsetY = areaY + (areaH - scaledHeight) / 2;

    return { offsetX, offsetY, scale };
  }

  /**
   * 绘制整个棋盘
   *
   * 绘制顺序：底层 → 顶层，后排 → 前排，左列 → 右列
   * 这确保上层牌覆盖下层牌的视觉效果
   *
   * @param ctx - Canvas 2D 上下文
   * @param board - 棋盘运行时状态
   * @param freeTileIds - 自由牌的 ID 集合
   * @param layout - 布局信息
   */
  drawBoard(
    ctx: CanvasRenderingContext2D,
    board: BoardState,
    freeTileIds: Set<number>,
    layout: BoardLayout,
  ): void {
    // 收集所有未移除的牌，按绘制顺序排序
    const activeTiles = this.getSortedTiles(board);

    for (const tile of activeTiles) {
      const { x, y } = this.tileToScreen(tile, layout);
      const isFree = freeTileIds.has(tile.id);

      // 用 canvas transform 让牌面随 scale 等比放大
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(layout.scale, layout.scale);
      this.tileRenderer.drawTile(ctx, tile, 0, 0, isFree);
      ctx.restore();
    }
  }

  /**
   * 触摸/指针命中检测
   *
   * 从最高层向下遍历，返回命中的第一张牌的 ID（最上面的牌优先）。
   * 仅检测未移除的牌。
   *
   * @param board - 棋盘运行时状态
   * @param pointerX - 指针的屏幕 X 坐标
   * @param pointerY - 指针的屏幕 Y 坐标
   * @param layout - 布局信息
   * @returns 命中的牌 ID，未命中返回 null
   */
  hitTest(
    board: BoardState,
    pointerX: number,
    pointerY: number,
    layout: BoardLayout,
  ): number | null {
    // 按绘制的反向顺序遍历（顶层优先）
    const activeTiles = this.getSortedTiles(board);

    // 从后往前遍历（最后绘制的在最上面）
    for (let i = activeTiles.length - 1; i >= 0; i--) {
      const tile = activeTiles[i];
      const { x, y } = this.tileToScreen(tile, layout);
      const w = TileRenderer.TILE_WIDTH * layout.scale;
      const h = TileRenderer.TILE_HEIGHT * layout.scale;

      if (
        pointerX >= x &&
        pointerX <= x + w &&
        pointerY >= y &&
        pointerY <= y + h
      ) {
        return tile.id;
      }
    }

    return null;
  }

  // ─── 内部方法 ─────────────────────────────────────

  /**
   * 将牌的半牌坐标转换为屏幕坐标
   */
  private tileToScreen(
    tile: Tile,
    layout: BoardLayout,
  ): { x: number; y: number } {
    const { col, row, layer } = tile.position;
    const { offsetX, offsetY, scale } = layout;

    const x = offsetX + col * HALF_CELL_W * scale - layer * TileRenderer.DEPTH_OFFSET * scale;
    const y = offsetY + row * HALF_CELL_H * scale - layer * TileRenderer.DEPTH_OFFSET * scale;

    return { x, y };
  }

  /**
   * 获取排序后的活动牌列表
   *
   * 排序规则：底层 → 顶层，后排 → 前排（row 小 → 大），左列 → 右列（col 小 → 大）
   */
  private getSortedTiles(board: BoardState): Tile[] {
    const tiles: Tile[] = [];

    for (const tile of board.tiles.values()) {
      if (tile.state !== TileState.Removed) {
        tiles.push(tile);
      }
    }

    tiles.sort((a, b) => {
      // 先按层排序
      if (a.position.layer !== b.position.layer) {
        return a.position.layer - b.position.layer;
      }
      // 同层按行排序
      if (a.position.row !== b.position.row) {
        return a.position.row - b.position.row;
      }
      // 同行按列排序
      return a.position.col - b.position.col;
    });

    return tiles;
  }
}
