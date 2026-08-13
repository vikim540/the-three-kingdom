import { HeroConfig } from "./hero";

export type { HeroConfig };

export type StoryStep = "INTRO" | "SUMMON" | "BATTLE" | "COMPLETED";

export type TerrainType = "NORMAL" | "BUSH" | "FOREST" | "OBSTACLE" | "ESCAPE";

export interface GridTile {
  x: number; // 0..3 (col)
  y: number; // 0..9 (row)
  terrain: TerrainType;
}

export type UnitFactionType = "PLAYER" | "ENEMY";

export type TacticalActionType = "SELECT" | "ATTACK" | "SKILL" | "ITEM" | "FLEE";

export interface BattleUnit {
  instanceId: string;
  heroConfig: HeroConfig;
  faction: UnitFactionType;
  x: number; // 0..3 (col). -1 if unplaced
  y: number; // 0..9 (row). -1 if unplaced
  currentHp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  moveRange: number;
  attackRange: number;
  statusEffects: ("AMBUSH" | "GUARDED" | "ROUTED" | "BAITING" | "FROZEN" | "PIERCING")[];
  hasActedThisTurn: boolean;
  isDead: boolean;
}

export type BattlePhase = "DEPLOYMENT" | "BATTLE_IN_PROGRESS" | "VICTORY" | "DEFEAT";

// 戰鬥模擬引擎輸出的單一真相源事件 (Event Stream)
export type CombatEventType =
  | "UNIT_MOVED"
  | "ATTACK_HIT"
  | "SKILL_TRIGGERED"
  | "UNIT_DIED"
  | "PANIC_FLEE"
  | "BATTLE_VICTORY"
  | "BATTLE_DEFEAT";

export interface CombatEvent {
  id: string;
  type: CombatEventType;
  unitId?: string;
  attackerId?: string;
  targetId?: string;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  damage?: number;
  isCrit?: boolean;
  skillName?: string;
  effectType?: string;
  description?: string;
  fleeUnitIds?: string[];
}

export interface CombatLogMessage {
  id: string;
  turn: number;
  text: string;
  type: "info" | "skill" | "damage" | "rout" | "victory";
  timestamp: string;
}

export interface BattleReward {
  lootType: "AMBUSH_SPECIAL" | "STANDARD_FULL";
  title: string;
  description: string;
  items: {
    name: string;
    count: number;
    quality: "凡" | "靈" | "王" | "帝" | "仙";
    icon: string;
  }[];
  spiritStones: number;
  exp: number;
}
