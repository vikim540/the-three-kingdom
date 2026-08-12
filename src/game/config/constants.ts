export const MAP_COLS = 4;
export const MAP_ROWS = 10;
export const TILE_SIZE = 72; // 72px 格子尺寸

export const HERO_QUALITIES = ["凡", "靈", "王", "帝", "仙"] as const;
export const HERO_FACTIONS = ["魏", "蜀", "吳", "群雄"] as const;

export const TERRAIN_EFFECTS = {
  NORMAL: { moveCost: 1, defBonus: 0, ambushable: false, label: "山間小道" },
  BUSH: { moveCost: 1, defBonus: 0.2, ambushable: true, label: "密草叢伏擊" },
  FOREST: { moveCost: 2, defBonus: 0.15, ambushable: false, label: "深山密林" },
  OBSTACLE: { moveCost: 999, defBonus: 0, ambushable: false, label: "崎嶇黑石" },
  ESCAPE: { moveCost: 1, defBonus: 0.3, ambushable: false, label: "底部逃生法陣" },
} as const;
