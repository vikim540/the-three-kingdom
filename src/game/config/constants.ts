// 動態計算，在 Phaser Scene create() 中根據視窗大小調整
export const MAP_COLS = 4;
export const MAP_ROWS = 10;
export const TILE_SIZE = 64; // 基礎格子大小，runtime 會依螢幕調整

export const HERO_QUALITIES = ["凡", "靈", "王", "帝", "仙"] as const;
export const HERO_FACTIONS = ["魏", "蜀", "吳", "群雄"] as const;

export const TERRAIN_EFFECTS = {
  NORMAL: { moveCost: 1, defBonus: 0, ambushable: false, label: "山間小道" },
  BUSH:   { moveCost: 1, defBonus: 0.2, ambushable: true, label: "密草叢" },
  FOREST: { moveCost: 2, defBonus: 0.15, ambushable: false, label: "深山密林" },
  OBSTACLE: { moveCost: 999, defBonus: 0, ambushable: false, label: "崎嶇黑石" },
  ESCAPE: { moveCost: 1, defBonus: 0.3, ambushable: false, label: "逃生法陣" },
} as const;
