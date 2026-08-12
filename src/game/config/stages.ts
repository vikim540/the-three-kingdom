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

// 建立 4x10 格子地圖（透視視角：y=0遠處敵方，y=9近處玩家）
function createStage1Map(): GridTile[] {
  const tiles: GridTile[] = [];

  // 草叢伏擊位：近處兩側 (0,7), (0,8), (3,7), (3,8) 方便黃忠隱蔽狙擊
  const bushCoords = new Set(["0,7", "0,8", "3,7", "3,8", "0,4", "3,4"]);
  const obstacleCoords = new Set(["0,2", "3,2"]);
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
      }

      tiles.push({ x, y, terrain });
    }
  }
  return tiles;
}

export const STAGE_1_BANDIT: StageConfig = {
  id: "stage_1_bandit",
  name: "第一章：黑風山谷密林遭遇戰",
  description: "穿越落入黑風山古道，4×10 梯形峽谷突遭五名修仙劫匪圍截！側翼草叢可埋伏神箭手！",
  tiles: createStage1Map(),
  playerSpawnTiles: [
    { x: 1, y: 8 },
    { x: 2, y: 8 },
    { x: 0, y: 8 },
    { x: 3, y: 8 },
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
