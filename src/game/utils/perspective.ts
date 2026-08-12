import { MAP_COLS, MAP_ROWS } from "../config/constants";

export interface PerspectiveConfig {
  topYRatio: number;      // 0.22 (頂部行 Y 比例)
  bottomYRatio: number;   // 0.78 (底部行 Y 比例)
  topWidthRatio: number;  // 0.38 (頂部寬度相對於螢幕寬度)
  bottomWidthRatio: number; // 0.82 (底部寬度相對於螢幕寬度)
}

export const DEFAULT_PERSPECTIVE: PerspectiveConfig = {
  topYRatio: 0.20,
  bottomYRatio: 0.78,
  topWidthRatio: 0.35,
  bottomWidthRatio: 0.85,
};

export interface Point2D {
  x: number;
  y: number;
}

export interface Quadrilateral {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
  center: Point2D;
  scale: number;
  width: number;
  height: number;
}

/**
 * 計算 4x10 梯形透視地圖中任意 (x, y) 格子的四個頂點與中心點 screen 座標
 * y=0 爲遠處 (螢幕上方)，y=9 爲近處 (螢幕下方)
 */
export function getTileQuadrilateral(
  gridX: number,
  gridY: number,
  screenWidth: number,
  screenHeight: number,
  config: PerspectiveConfig = DEFAULT_PERSPECTIVE
): Quadrilateral {
  const { topYRatio, bottomYRatio, topWidthRatio, bottomWidthRatio } = config;

  const minY = screenHeight * topYRatio;
  const maxY = screenHeight * bottomYRatio;

  // y 爲 0..MAP_ROWS (包含邊界點)
  const getY = (row: number) => {
    const t = row / MAP_ROWS;
    // 使用 t^1.2 非線性插值，讓近處行距更大，遠處更緊湊
    const powT = Math.pow(t, 1.25);
    return minY + powT * (maxY - minY);
  };

  const getWidthAtY = (row: number) => {
    const t = row / MAP_ROWS;
    const powT = Math.pow(t, 1.1);
    const wRatio = topWidthRatio + powT * (bottomWidthRatio - topWidthRatio);
    return screenWidth * wRatio;
  };

  const yTop = getY(gridY);
  const yBottom = getY(gridY + 1);

  const wTop = getWidthAtY(gridY);
  const wBottom = getWidthAtY(gridY + 1);

  const centerX = screenWidth / 2;

  const xTopStart = centerX - wTop / 2;
  const cellWTop = wTop / MAP_COLS;

  const xBottomStart = centerX - wBottom / 2;
  const cellWBottom = wBottom / MAP_COLS;

  const topLeft = { x: xTopStart + gridX * cellWTop, y: yTop };
  const topRight = { x: xTopStart + (gridX + 1) * cellWTop, y: yTop };

  const bottomLeft = { x: xBottomStart + gridX * cellWBottom, y: yBottom };
  const bottomRight = { x: xBottomStart + (gridX + 1) * cellWBottom, y: yBottom };

  const center = {
    x: (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4,
    y: (topLeft.y + topRight.y + bottomLeft.y + bottomRight.y) / 4,
  };

  // 縮放比例 (以 1.0 爲近處標準)
  const scale = 0.42 + (gridY / (MAP_ROWS - 1)) * 0.58;
  const width = (cellWTop + cellWBottom) / 2;
  const height = yBottom - yTop;

  return { topLeft, topRight, bottomRight, bottomLeft, center, scale, width, height };
}

/**
 * 將 Screen 點 (px, py) 反向轉換爲網格座標 (gridX, gridY)
 */
export function screenToGrid(
  px: number,
  py: number,
  screenWidth: number,
  screenHeight: number,
  config: PerspectiveConfig = DEFAULT_PERSPECTIVE
): { x: number; y: number } | null {
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const quad = getTileQuadrilateral(x, y, screenWidth, screenHeight, config);
      if (pointInPolygon({ x: px, y: py }, [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft])) {
        return { x, y };
      }
    }
  }
  return null;
}

function pointInPolygon(point: Point2D, vs: Point2D[]): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
