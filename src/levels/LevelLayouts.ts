/**
 * LevelLayouts.ts - 关卡布局定义
 * 定义各关卡的牌位排列，使用半牌坐标系（每张牌占 2x2 半牌单元）
 */

import type { BoardConfig } from '../types/board';
import type { TilePosition } from '../types/tile';

// ============================================================
// 辅助函数
// ============================================================

/**
 * 生成一个矩形区域的牌位
 * @param startCol - 起始列（半牌坐标）
 * @param startRow - 起始行（半牌坐标）
 * @param tilesWide - 横向牌数（每张牌宽 2 半牌单元）
 * @param tilesHigh - 纵向牌数（每张牌高 2 半牌单元）
 * @param layer - 所在层
 */
function rectLayer(
  startCol: number,
  startRow: number,
  tilesWide: number,
  tilesHigh: number,
  layer: number,
): TilePosition[] {
  const positions: TilePosition[] = [];
  for (let r = 0; r < tilesHigh; r++) {
    for (let c = 0; c < tilesWide; c++) {
      positions.push({
        col: startCol + c * 2,
        row: startRow + r * 2,
        layer,
      });
    }
  }
  return positions;
}

/**
 * 生成十字（加号）形牌位
 * @param cx - 中心列（半牌坐标）
 * @param cy - 中心行（半牌坐标）
 * @param armLen - 臂长（牌数，不含中心）
 * @param armWidth - 臂宽（牌数）
 * @param layer - 所在层
 */
function crossLayer(
  cx: number,
  cy: number,
  armLen: number,
  armWidth: number,
  layer: number,
): TilePosition[] {
  const posSet = new Set<string>();
  const positions: TilePosition[] = [];

  const addTile = (col: number, row: number) => {
    const key = `${col},${row}`;
    if (!posSet.has(key)) {
      posSet.add(key);
      positions.push({ col, row, layer });
    }
  };

  // 横臂
  for (let c = -armLen; c <= armLen; c++) {
    for (let w = 0; w < armWidth; w++) {
      const offset = -(armWidth - 1) + w * 2;
      addTile(cx + c * 2, cy + offset);
    }
  }

  // 纵臂
  for (let r = -armLen; r <= armLen; r++) {
    for (let w = 0; w < armWidth; w++) {
      const offset = -(armWidth - 1) + w * 2;
      addTile(cx + offset, cy + r * 2);
    }
  }

  return positions;
}

/**
 * 生成菱形牌位
 * @param cx - 中心列（半牌坐标）
 * @param cy - 中心行（半牌坐标）
 * @param halfSize - 菱形半径（牌数）
 * @param layer - 所在层
 */
function diamondLayer(
  cx: number,
  cy: number,
  halfSize: number,
  layer: number,
): TilePosition[] {
  const positions: TilePosition[] = [];
  for (let dy = -halfSize; dy <= halfSize; dy++) {
    const width = halfSize - Math.abs(dy) + 1;
    for (let dx = 0; dx < width; dx++) {
      const startCol = cx - (width - 1);
      positions.push({
        col: startCol + dx * 2,
        row: cy + dy * 2,
        layer,
      });
    }
  }
  return positions;
}

/**
 * 生成空心矩形（环形）牌位
 * @param startCol - 外矩形起始列
 * @param startRow - 外矩形起始行
 * @param outerW - 外矩形牌宽
 * @param outerH - 外矩形牌高
 * @param innerW - 内空洞牌宽
 * @param innerH - 内空洞牌高
 * @param layer - 所在层
 */
function hollowRectLayer(
  startCol: number,
  startRow: number,
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number,
  layer: number,
): TilePosition[] {
  const positions: TilePosition[] = [];
  // 内空洞的起始偏移（居中）
  const innerStartC = Math.floor((outerW - innerW) / 2);
  const innerStartR = Math.floor((outerH - innerH) / 2);

  for (let r = 0; r < outerH; r++) {
    for (let c = 0; c < outerW; c++) {
      // 跳过内空洞
      if (
        c >= innerStartC && c < innerStartC + innerW &&
        r >= innerStartR && r < innerStartR + innerH
      ) {
        continue;
      }
      positions.push({
        col: startCol + c * 2,
        row: startRow + r * 2,
        layer,
      });
    }
  }
  return positions;
}

// ============================================================
// Level 1 - 简单布局（24 张牌，12 对，2 层）
// ============================================================

function buildLevel1(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层 4x5 = 20
  positions.push(...rectLayer(0, 0, 4, 5, 0));
  // 顶层 居中 2x2 = 4
  positions.push(...rectLayer(1, 1, 2, 2, 1));
  return positions;  // 24
}

const level1Layout: BoardConfig = {
  id: 'level_1_simple',
  name: '新手入门',
  cols: 8,
  rows: 10,
  layers: 2,
  tilePositions: buildLevel1(),
  totalTiles: 24,
};

// ============================================================
// Level 2 - 中等布局（48 张牌，24 对，3 层）
// ============================================================

function buildLevel2(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层 6x5 = 30
  positions.push(...rectLayer(0, 0, 6, 5, 0));
  // 中间层 4x3 = 12
  positions.push(...rectLayer(1, 1, 4, 3, 1));
  // 顶层 2x3 = 6
  positions.push(...rectLayer(2, 2, 2, 3, 2));
  return positions;  // 48
}

const level2Layout: BoardConfig = {
  id: 'level_2_medium',
  name: '经典龟形',
  cols: 12,
  rows: 10,
  layers: 3,
  tilePositions: buildLevel2(),
  totalTiles: 48,
};

// ============================================================
// Level 3 - 复杂布局（72 张牌，36 对，4 层）
// ============================================================

function buildLevel3(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层 6x6 = 36
  positions.push(...rectLayer(0, 0, 6, 6, 0));
  // 二层 5x4 = 20
  positions.push(...rectLayer(1, 1, 5, 4, 1));
  // 三层 4x3 = 12
  positions.push(...rectLayer(2, 2, 4, 3, 2));
  // 四层 2x2 = 4
  positions.push(...rectLayer(3, 3, 2, 2, 3));
  return positions;  // 72
}

const level3Layout: BoardConfig = {
  id: 'level_3_complex',
  name: '密集堆叠',
  cols: 12,
  rows: 12,
  layers: 4,
  tilePositions: buildLevel3(),
  totalTiles: 72,
};

// ============================================================
// Level 4 - 十字阵（36 张牌，18 对，2 层）
// 加号形状，对称美观
// ============================================================

function buildLevel4(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层：十字形 armLen=3, armWidth=1 → 横7+纵7-中心1 = 13 牌
  // 改用更大十字使牌数合适
  // 底层：横臂 7x1 + 纵臂 1x7 - 中心重复 1 = 13。太少。
  // 底层：横臂 7x2 + 纵臂 2x7 - 中心重复 2x2 = 14+14-4 = 24
  // 顶层：横臂 5x1 + 纵臂 1x5 - 中心 1 = 9。需偶数。
  // 调整：底层 crossLayer(6,6,3,2) = 24，顶层 crossLayer(6,6,2,1) = 9 → 不行
  // 底层 crossLayer(6,8,3,2) = 24, 顶层 rectLayer 居中 3x4 = 12 → 36
  positions.push(...crossLayer(6, 8, 3, 2, 0));  // 24 牌
  positions.push(...rectLayer(3, 5, 3, 4, 1));    // 12 牌
  return positions;  // 36
}

const level4Layout: BoardConfig = {
  id: 'level_4_cross',
  name: '十字阵',
  cols: 14,
  rows: 18,
  layers: 2,
  tilePositions: buildLevel4(),
  totalTiles: 40,
};

// ============================================================
// Level 5 - 菱形塔（48 张牌，24 对，3 层）
// 三层递减的菱形堆叠
// ============================================================

function buildLevel5(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层：菱形 halfSize=3 → 1+2+3+4+3+2+1 = 16 牌
  // 需要更多牌。底层用大菱形 + 中间菱形 + 顶部小菱形
  // halfSize=4: 1+2+3+4+5+4+3+2+1 = 25（奇数，不行）
  // 方案：底层 rectLayer 6x4=24，中间 diamondLayer halfSize=3 =16，顶层 diamondLayer halfSize=2 =9→8
  // 修正：底层 6x4=24, 中间 4x3=12 偏移, 顶层 diamondLayer(5,5,2)
  // diamondLayer halfSize=2: 1+2+3+2+1 = 9（奇数）→ 不行
  // 用 rectLayer 组合模拟菱形
  // 底层：宽矩形 8x3=24
  positions.push(...rectLayer(0, 2, 8, 3, 0));   // 24 牌
  // 中间层：窄矩形 6x2=12 + 两侧各 2 = 16
  positions.push(...rectLayer(1, 1, 6, 2, 1));    // 12 牌
  positions.push(...rectLayer(3, 5, 4, 1, 1));    // 4 牌 → 中间层共 16
  // 顶层：居中 2x4 = 8
  positions.push(...rectLayer(4, 2, 2, 4, 2));    // 8 牌
  return positions;  // 48
}

const level5Layout: BoardConfig = {
  id: 'level_5_diamond',
  name: '菱形塔',
  cols: 16,
  rows: 12,
  layers: 3,
  tilePositions: buildLevel5(),
  totalTiles: 48,
};

// ============================================================
// Level 6 - 回字环（60 张牌，30 对，3 层）
// 中空矩形环，层层嵌套
// ============================================================

function buildLevel6(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层：7x6=42 空心，挖去中间 3x2=6 → 36 牌
  positions.push(...hollowRectLayer(0, 0, 7, 6, 3, 2, 0));
  // 中间层：5x4=20 空心，挖去中间 1x2=2 → 18 牌
  positions.push(...hollowRectLayer(1, 1, 5, 4, 1, 2, 1));
  // 顶层：3x2 = 6
  positions.push(...rectLayer(2, 2, 3, 2, 2));
  return positions;  // 36+18+6=60
}

const level6Layout: BoardConfig = {
  id: 'level_6_ring',
  name: '回字环',
  cols: 14,
  rows: 12,
  layers: 3,
  tilePositions: buildLevel6(),
  totalTiles: 60,
};

// ============================================================
// Level 7 - 双L迷宫（72 张牌，36 对，4 层）
// L 形与反L形交错堆叠
// ============================================================

function buildLevel7(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层：L 形 = 横条 7x3 + 竖条延伸 3x3 = 30
  positions.push(...rectLayer(0, 0, 7, 3, 0));   // 21
  positions.push(...rectLayer(0, 6, 3, 3, 0));   // 9 → 底层 30

  // 二层：两个不重叠的块
  positions.push(...rectLayer(1, 1, 2, 3, 1));   // 6
  positions.push(...rectLayer(7, 1, 3, 4, 1));   // 12 → 二层 18

  // 三层：居中矩形 4x4=16
  positions.push(...rectLayer(2, 2, 4, 4, 2));   // 16

  // 四层：小块 2x4=8
  positions.push(...rectLayer(3, 3, 2, 4, 3));   // 8

  return positions;  // 30+18+16+8=72
}

const level7Layout: BoardConfig = {
  id: 'level_7_maze',
  name: '双L迷宫',
  cols: 14,
  rows: 12,
  layers: 4,
  tilePositions: buildLevel7(),
  totalTiles: 72,
};

// ============================================================
// Level 8 - 金字塔（80 张牌，40 对，5 层）
// 宽底窄顶，层层递减
// ============================================================

function buildLevel8(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层：6x4=24
  positions.push(...rectLayer(0, 0, 6, 4, 0));
  // 二层：5x4=20，偏移 (1,1)
  positions.push(...rectLayer(1, 1, 5, 4, 1));
  // 三层：4x4=16，偏移 (2,2)
  positions.push(...rectLayer(2, 2, 4, 4, 2));
  // 四层：3x4=12，偏移 (3,3)
  positions.push(...rectLayer(3, 3, 3, 4, 3));
  // 五层：2x4=8，偏移 (4,4)
  positions.push(...rectLayer(4, 4, 2, 4, 4));
  return positions;  // 24+20+16+12+8=80
}

const level8Layout: BoardConfig = {
  id: 'level_8_pyramid',
  name: '金字塔',
  cols: 12,
  rows: 16,
  layers: 5,
  tilePositions: buildLevel8(),
  totalTiles: 80,
};

// ============================================================
// Level 9 - 锯齿阵（84 张牌，42 对，4 层）
// 三个错位矩形组成锯齿底座
// ============================================================

function buildLevel9(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层：三个 3x4=12 的矩形，阶梯错位（无重叠） → 36
  positions.push(...rectLayer(0, 0, 3, 4, 0));     // col 0-4, row 0-6
  positions.push(...rectLayer(6, 2, 3, 4, 0));     // col 6-10, row 2-8
  positions.push(...rectLayer(12, 4, 3, 4, 0));    // col 12-16, row 4-10 → 36

  // 二层：两个 3x4=12 填补间隙 → 24
  positions.push(...rectLayer(3, 1, 3, 4, 1));     // col 3-7, row 1-7
  positions.push(...rectLayer(9, 3, 3, 4, 1));     // col 9-13, row 3-9 → 24

  // 三层：居中 4x4=16
  positions.push(...rectLayer(5, 2, 4, 4, 2));     // 16

  // 四层：居中 2x4=8
  positions.push(...rectLayer(6, 3, 2, 4, 3));     // 8

  return positions;  // 36+24+16+8=84
}

const level9Layout: BoardConfig = {
  id: 'level_9_zigzag',
  name: '锯齿阵',
  cols: 18,
  rows: 12,
  layers: 4,
  tilePositions: buildLevel9(),
  totalTiles: 84,
};

// ============================================================
// Level 10 - 终极堡垒（96 张牌，48 对，6 层）
// 最大最密集的关卡
// ============================================================

function buildLevel10(): TilePosition[] {
  const positions: TilePosition[] = [];
  // 底层：8x6=48
  positions.push(...rectLayer(0, 0, 8, 6, 0));
  // 二层：6x4=24，偏移 (1,1)
  positions.push(...rectLayer(1, 1, 6, 4, 1));
  // 三层：4x3=12，偏移 (2,2)
  positions.push(...rectLayer(2, 2, 4, 3, 2));
  // 四层：3x2=6，偏移 (3,3)
  positions.push(...rectLayer(3, 3, 3, 2, 3));
  // 五层：2x2=4，偏移 (4,4)
  positions.push(...rectLayer(4, 4, 2, 2, 4));
  // 六层：1x2=2，偏移 (5,5)
  positions.push(...rectLayer(5, 5, 1, 2, 5));
  return positions;  // 48+24+12+6+4+2=96
}

const level10Layout: BoardConfig = {
  id: 'level_10_fortress',
  name: '终极堡垒',
  cols: 16,
  rows: 14,
  layers: 6,
  tilePositions: buildLevel10(),
  totalTiles: 96,
};

// ============================================================
// 验证函数（开发期自检）
// ============================================================

function validateLayout(config: BoardConfig): void {
  const { id, tilePositions, totalTiles, layers } = config;

  // 总牌数一致性
  if (tilePositions.length !== totalTiles) {
    throw new Error(
      `[${id}] tilePositions.length (${tilePositions.length}) !== totalTiles (${totalTiles})`,
    );
  }

  // 偶数检查
  if (totalTiles % 2 !== 0) {
    throw new Error(`[${id}] totalTiles (${totalTiles}) 不是偶数`);
  }

  // 层数检查
  const maxLayer = Math.max(...tilePositions.map((p) => p.layer));
  if (maxLayer + 1 > layers) {
    throw new Error(
      `[${id}] 实际最大层 ${maxLayer} 超过声明层数 ${layers}`,
    );
  }

  // 同层重复位置检查
  const posKeys = new Set<string>();
  for (const p of tilePositions) {
    const key = `${p.layer}-${p.col}-${p.row}`;
    if (posKeys.has(key)) {
      throw new Error(`[${id}] 同层重复位置: layer=${p.layer} col=${p.col} row=${p.row}`);
    }
    posKeys.add(key);
  }
}

// 运行验证
const allLayouts = [
  level1Layout, level2Layout, level3Layout, level4Layout, level5Layout,
  level6Layout, level7Layout, level8Layout, level9Layout, level10Layout,
];

for (const layout of allLayouts) {
  validateLayout(layout);
}

// ============================================================
// 导出
// ============================================================

/** 所有关卡布局配置，按关卡顺序排列 */
export const LevelLayouts: BoardConfig[] = allLayouts;
