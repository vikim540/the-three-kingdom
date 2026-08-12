export const MAP_SIZE = 8;
export const TILE_SIZE = 64;

export const HERO_QUALITIES = ["凡", "靈", "王", "帝", "仙"] as const;
export const HERO_FACTIONS = ["魏", "蜀", "吳", "群雄"] as const;

export const TERRAIN_EFFECTS = {
  NORMAL: { moveCost: 1, defBonus: 0, ambushable: false, label: "平地" },
  BUSH: { moveCost: 1, defBonus: 0.15, ambushable: true, label: "密草叢" },
  OBSTACLE: { moveCost: 999, defBonus: 0, ambushable: false, label: "崎嶇岩石" },
} as const;
