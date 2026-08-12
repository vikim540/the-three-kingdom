import { HeroConfig } from "./hero";

export type TerrainType = "NORMAL" | "BUSH" | "FOREST" | "OBSTACLE" | "ESCAPE";

export interface GridTile {
  x: number;
  y: number;
  terrain: TerrainType;
}

export type UnitFactionType = "PLAYER" | "ENEMY";

export type TacticalActionType = "SELECT" | "ATTACK" | "SKILL" | "ITEM" | "FLEE";

export interface BattleUnit {
  instanceId: string;
  heroConfig: HeroConfig;
  faction: UnitFactionType;
  x: number;
  y: number;
  currentHp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  moveRange: number;
  attackRange: number;
  statusEffects: ("AMBUSH" | "GUARDED" | "ROUTED" | "BAITING")[];
  hasActedThisTurn: boolean;
  isDead: boolean;
}

export type BattlePhase = "DEPLOYMENT" | "BATTLE_IN_PROGRESS" | "VICTORY" | "DEFEAT";

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
