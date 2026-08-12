export type HeroQuality = "凡" | "靈" | "王" | "帝" | "仙";
export type HeroFaction = "魏" | "蜀" | "吳" | "群雄";
export type UnitRole = "主角" | "弓手" | "前鋒" | "突騎" | "軍師" | "劫匪";

export interface HeroSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  effectType: "AMBUSH_SNIPE" | "GUARD_COVER" | "PIERCE_CHARGE" | "FREEZE_CONTROL";
}

export interface HeroConfig {
  id: string;
  name: string;
  title: string;
  quality: HeroQuality;
  faction: HeroFaction;
  role: UnitRole;
  avatar: string;
  imagePath: string; // 2D 全高清人物圖案路徑
  description: string;
  tacticalQuote: string; // 戰術名言
  baseStats: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    speed: number;
    moveRange: number;
    attackRange: number;
  };
  skills: HeroSkill[];
}
