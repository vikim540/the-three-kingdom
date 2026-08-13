import { BattleUnit, GridTile } from "@/types/game";

// 計算曼哈頓距離
export function getManhattanDistance(
  u1: { x: number; y: number },
  u2: { x: number; y: number }
): number {
  if (u1.x < 0 || u1.y < 0 || u2.x < 0 || u2.y < 0) return 999;
  return Math.abs(u1.x - u2.x) + Math.abs(u1.y - u2.y);
}

// 檢查單位是否處於草叢地形中 (精確整數網格比對)
export function isUnitInBush(unit: { x: number; y: number }, tiles: GridTile[]): boolean {
  if (unit.x < 0 || unit.y < 0) return false;
  const col = Math.round(unit.x);
  const row = Math.round(unit.y);
  const tile = tiles.find((t) => t.x === col && t.y === row);
  // 也相容側翼右側草叢區域 (col >= 2, row >= 4 && row <= 8)
  return tile?.terrain === "BUSH" || (col >= 2 && row >= 4 && row <= 8);
}

// 檢查夏侯惇與主角是否相鄰（1 格距離）觸發【鐵血援護】
export function checkXiahouGuardCondition(units: BattleUnit[]): boolean {
  const protagonist = units.find((u) => u.heroConfig.id === "hero_protagonist" && !u.isDead);
  const xiahou = units.find((u) => u.heroConfig.id === "hero_xiahou_dun" && !u.isDead);

  if (!protagonist || !xiahou || protagonist.x < 0 || xiahou.x < 0) return false;
  const dist = getManhattanDistance(protagonist, xiahou);
  return dist <= 1.5;
}

// 檢查黃忠伏擊條件
export function checkHuangZhongAmbushCondition(
  units: BattleUnit[],
  tiles: GridTile[]
): { ready: boolean; huangZhongUnit?: BattleUnit } {
  const huangZhong = units.find((u) => u.heroConfig.id === "hero_huang_zhong" && !u.isDead);
  if (!huangZhong || huangZhong.x < 0) return { ready: false };

  const inBush = isUnitInBush(huangZhong, tiles);
  return {
    ready: inBush,
    huangZhongUnit: huangZhong,
  };
}
