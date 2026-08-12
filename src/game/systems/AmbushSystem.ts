import { BattleUnit, GridTile } from "@/types/game";

// 計算曼哈頓距離
export function getManhattanDistance(
  u1: { x: number; y: number },
  u2: { x: number; y: number }
): number {
  return Math.abs(u1.x - u2.x) + Math.abs(u1.y - u2.y);
}

// 檢查單位是否處於草叢地形中
export function isUnitInBush(unit: { x: number; y: number }, tiles: GridTile[]): boolean {
  const tile = tiles.find((t) => t.x === unit.x && t.y === unit.y);
  return tile?.terrain === "BUSH";
}

// 檢查夏侯惇與主角是否相鄰（1 格距離）
export function checkXiahouGuardCondition(units: BattleUnit[]): boolean {
  const protagonist = units.find((u) => u.heroConfig.id === "hero_protagonist" && !u.isDead);
  const xiahou = units.find((u) => u.heroConfig.id === "hero_xiahou_dun" && !u.isDead);

  if (!protagonist || !xiahou) return false;
  const dist = getManhattanDistance(protagonist, xiahou);
  return dist <= 1;
}

// 檢查黃忠伏擊條件
export function checkHuangZhongAmbushCondition(
  units: BattleUnit[],
  tiles: GridTile[]
): { ready: boolean; huangZhongUnit?: BattleUnit } {
  const huangZhong = units.find((u) => u.heroConfig.id === "hero_huang_zhong" && !u.isDead);
  if (!huangZhong) return { ready: false };

  const inBush = isUnitInBush(huangZhong, tiles);
  return {
    ready: inBush,
    huangZhongUnit: huangZhong,
  };
}
