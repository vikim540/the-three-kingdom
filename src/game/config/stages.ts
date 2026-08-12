import { GridTile, TerrainType } from "@/types/game";
import { MAP_COLS, MAP_ROWS } from "./constants";

export interface StageConfig {
  id: string;
  name: string;
  description: string;
  tiles: GridTile[];
  playerSpawnTiles: { x: number; y: number }[];
  enemies: {
    heroId: string;
    x: number;
    y: number;
  }[];
}

// 建立 4x10 格子地圖（中間小道，兩側密林與草叢，底部逃生法陣）
function createStage1Map(): GridTile[] {
  const tiles: GridTile[] = [];

  const bushCoords = new Set(["0,3", "3,3", "0,6", "3,6"]);
  const obstacleCoords = new Set(["0,1", "3,1"]);
  const escapeCoords = new Set(["1,9", "2,9"]);

  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const key = `${x},${y}`;
      let terrain: TerrainType = "NORMAL";

      if (escapeCoords.has(key)) {
        terrain = "ESCAPE";
      } else if (bushCoords.has(key)) {
        terrain = "BUSH";
      } else if (obstacleCoords.has(key)) {
        terrain = "OBSTACLE";
      } else if (x === 0 || x === 3) {
        terrain = "FOREST";
      }

      tiles.push({ x, y, terrain });
    }
  }
  return tiles;
}

export const STAGE_1_BANDIT: StageConfig = {
  id: "stage_1_bandit",
  name: "第一章：黑風山谷密林遭遇戰",
  description: "穿越落入黑風山古道，4×10 狹長小道突遭五名修仙劫匪圍截！底部（1,9）及（2,9）設有逃生法陣！",
  tiles: createStage1Map(),
  playerSpawnTiles: [
    { x: 1, y: 8 },
    { x: 2, y: 8 },
    { x: 1, y: 9 },
    { x: 2, y: 9 },
  ],
  enemies: [
    { heroId: "enemy_bandit_chief", x: 1, y: 1 },
    { heroId: "enemy_bandit_thug", x: 0, y: 0 },
    { heroId: "enemy_bandit_thug", x: 2, y: 0 },
    { heroId: "enemy_bandit_thug", x: 3, y: 1 },
    { heroId: "enemy_bandit_thug", x: 1, y: 2 },
  ],
};
