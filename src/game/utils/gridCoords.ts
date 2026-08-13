import { MAP_COLS, MAP_ROWS } from "../config/constants";

/**
 * 網格座標轉換專用純函數庫 (高精度對稱映射)
 * 徹底解決「座標系精神分裂」問題：
 * - 戰鬥模擬層與 Store 唯一真相源使用 4x10 整數網格：col (0..3), row (0..9)
 * - 未放置的單位座標為 (-1, -1)
 * - 渲染層 (Phaser / React Preview) 使用 gridToScreen 轉換為螢幕像素
 * - 輸入層 (Drag & Drop) 使用 screenToGrid 將螢幕點擊 safe-map 映射為網格座標
 */

export interface GridPos {
  col: number; // 0 .. MAP_COLS-1 (0..3)
  row: number; // 0 .. MAP_ROWS-1 (0..9)
}

const TOP_Y_RATIO = 0.22;
const BOTTOM_Y_RATIO = 0.82;
const MIN_WIDTH_RATIO = 0.45;
const MAX_WIDTH_RATIO = 0.85;

/**
 * 將整數網格座標 (col, row) 轉換為 Phaser 螢幕像素座標 (px, py)
 */
export function gridToScreen(
  col: number,
  row: number,
  screenWidth: number,
  screenHeight: number
): { px: number; py: number; normY: number } {
  if (col < 0 || row < 0) {
    return { px: -1000, py: -1000, normY: 0 };
  }

  const topY = screenHeight * TOP_Y_RATIO;
  const bottomY = screenHeight * BOTTOM_Y_RATIO;

  const rowProgress = row / (MAP_ROWS - 1); // 0.0 ~ 1.0
  const py = topY + rowProgress * (bottomY - topY);

  const currentWidthRatio = MIN_WIDTH_RATIO + rowProgress * (MAX_WIDTH_RATIO - MIN_WIDTH_RATIO);
  const totalWidth = screenWidth * currentWidthRatio;
  const startX = (screenWidth - totalWidth) / 2;

  const colStep = totalWidth / MAP_COLS;
  const px = startX + (col + 0.5) * colStep;

  return { px, py, normY: py / screenHeight };
}

/**
 * 將螢幕點擊像素點 (px, py) 精確對稱轉換為整數網格座標 (col, row)
 */
export function screenToGrid(
  px: number,
  py: number,
  screenWidth: number,
  screenHeight: number
): GridPos {
  const topY = screenHeight * TOP_Y_RATIO;
  const bottomY = screenHeight * BOTTOM_Y_RATIO;

  // 行 (row) 映射
  const clampedY = Math.max(topY, Math.min(bottomY, py));
  const rowProgress = (clampedY - topY) / (bottomY - topY);
  const row = Math.max(0, Math.min(MAP_ROWS - 1, Math.round(rowProgress * (MAP_ROWS - 1))));

  // 列 (col) 映射
  const currentWidthRatio = MIN_WIDTH_RATIO + rowProgress * (MAX_WIDTH_RATIO - MIN_WIDTH_RATIO);
  const totalWidth = screenWidth * currentWidthRatio;
  const startX = (screenWidth - totalWidth) / 2;

  const relativeX = px - startX;
  const colStep = totalWidth / MAP_COLS;

  const rawCol = Math.floor(relativeX / colStep);
  const col = Math.max(0, Math.min(MAP_COLS - 1, rawCol));

  return { col, row };
}
