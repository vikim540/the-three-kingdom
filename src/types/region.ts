export type RegionType =
  | "AIR_WALL"      // 空氣牆 (半透明紅)
  | "ROAD"          // 道路 (半透明黃)
  | "AMBUSH"        // 埋伏區 (半透明綠)
  | "PLAYER_SPAWN"  // 玩家出生 (半透明藍)
  | "ENEMY_SPAWN"   // 敵方出生 (半透明橙)
  | "SAFE_ZONE"     // 安全區/逃生 (半透明青藍)
  | "DISABLED";     // 禁用 (半透明灰)

export interface Point2D {
  x: number;
  y: number;
}

export interface PolygonRegion {
  id: string;
  name: string;
  type: RegionType;
  points: Point2D[];
  scaleWeight?: number; // Y 軸近大遠小縮放權重
}

export const REGION_COLORS: Record<RegionType, { stroke: string; fill: string; label: string }> = {
  AIR_WALL: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.35)", label: "空氣牆" },
  ROAD: { stroke: "#eab308", fill: "rgba(234, 179, 8, 0.3)", label: "道路" },
  AMBUSH: { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.35)", label: "埋伏區" },
  PLAYER_SPAWN: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.35)", label: "玩家出生點" },
  ENEMY_SPAWN: { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.35)", label: "敵方出生點" },
  SAFE_ZONE: { stroke: "#38bdf8", fill: "rgba(56, 189, 248, 0.35)", label: "安全區域" },
  DISABLED: { stroke: "#64748b", fill: "rgba(100, 116, 139, 0.35)", label: "禁用" },
};

/**
 * 點是否在多邊形內 (Ray-casting)
 */
export function isPointInPolygon(point: Point2D, vs: Point2D[]): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getPerspectiveScale(yRatio: number, minScale = 0.45, maxScale = 1.15): number {
  return minScale + Math.max(0, Math.min(1, yRatio)) * (maxScale - minScale);
}
