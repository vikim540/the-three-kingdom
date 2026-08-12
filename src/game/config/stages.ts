import { GridTile, TerrainType } from "@/types/game";
import { MAP_SIZE } from "./constants";

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

// 建立 8x8 預設地圖地形
function createStage1Map(): GridTile[] {
  const tiles: GridTile[] = [];
  
  // 特別地形位置定義
  const bushCoords = new Set(["1,2", "2,2", "5,2", "6,2", "1,5", "6,5"]);
  const obstacleCoords = new Set(["3,3", "4,3"]);

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const key = `${x},${y}`;
      let terrain: TerrainType = "NORMAL";
      if (bushCoords.has(key)) {
        terrain = "BUSH";
      } else if (obstacleCoords.has(key)) {
        terrain = "OBSTACLE";
      }
      tiles.push({ x, y, terrain });
    }
  }
  return tiles;
}

export const STAGE_1_BANDIT: StageConfig = {
  id: "stage_1_bandit",
  name: "第一章：黑風山遭遇劫匪",
  description: "穿越落入黑風山谷，突遭五名修仙劫匪圍攻！利用地形伏擊或正面破敵！",
  tiles: createStage1Map(),
  playerSpawnTiles: [
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 2, y: 7 },
    { x: 5, y: 7 },
    { x: 3, y: 6 },
    { x: 4, y: 6 },
  ],
  enemies: [
    { heroId: "enemy_bandit_chief", x: 3, y: 1 },
    { heroId: "enemy_bandit_thug", x: 1, y: 0 },
    { heroId: "enemy_bandit_thug", x: 2, y: 1 },
    { heroId: "enemy_bandit_thug", x: 5, y: 1 },
    { heroId: "enemy_bandit_thug", x: 6, y: 0 },
  ],
};
