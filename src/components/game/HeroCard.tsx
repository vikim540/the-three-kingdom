/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { HeroConfig, HeroQuality, HeroFaction } from "@/types/hero";
import { Shield, Zap, Target, Crosshair, Award } from "lucide-react";

interface HeroCardProps {
  hero: HeroConfig;
  isSelected?: boolean;
  onSelect?: (hero: HeroConfig) => void;
}

const QUALITY_STYLES: Record<HeroQuality, { bg: string; text: string; border: string; glow: string }> = {
  凡: { bg: "bg-stone-900/80", text: "text-stone-300", border: "border-stone-600", glow: "" },
  靈: { bg: "bg-emerald-950/70", text: "text-emerald-300", border: "border-emerald-500", glow: "" },
  王: { bg: "bg-blue-950/70", text: "text-blue-300", border: "border-blue-500", glow: "" },
  帝: { bg: "bg-purple-950/70", text: "text-purple-300", border: "border-purple-500", glow: "" },
  仙: {
    bg: "bg-amber-950/80",
    text: "text-amber-300",
    border: "border-amber-400",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.3),inset_0_0_15px_rgba(245,158,11,0.2)]",
  },
};

const FACTION_STYLES: Record<HeroFaction, { bg: string; text: string; border: string }> = {
  魏: { bg: "bg-blue-950/90", text: "text-blue-200", border: "border-blue-700" },
  蜀: { bg: "bg-emerald-950/90", text: "text-emerald-200", border: "border-emerald-700" },
  吳: { bg: "bg-red-950/90", text: "text-red-200", border: "border-red-700" },
  群雄: { bg: "bg-purple-950/90", text: "text-purple-200", border: "border-purple-700" },
};

// 名將水墨印章單字
const HERO_SEAL_MAP: Record<string, string> = {
  hero_protagonist: "尊",
  hero_huang_zhong: "忠",
  hero_xiahou_dun: "惇",
  hero_zhao_yun: "雲",
  hero_guo_jia: "嘉",
  enemy_bandit_chief: "首",
  enemy_bandit_thug: "嘍",
};

export const HeroCard: React.FC<HeroCardProps> = ({ hero, isSelected, onSelect }) => {
  const quality = QUALITY_STYLES[hero.quality];
  const faction = FACTION_STYLES[hero.faction];
  const sealChar = HERO_SEAL_MAP[hero.id] || hero.name.slice(-1);

  return (
    <div
      onClick={() => onSelect?.(hero)}
      className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 ${quality.bg} ${quality.glow} ${
        isSelected
          ? `border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] scale-[1.03] -translate-y-1`
          : `${quality.border} hover:border-amber-500/60 hover:scale-[1.01]`
      }`}
    >
      {/* 頂部品質條與陣營標籤 */}
      <div className="flex items-center justify-between mb-3">
        <div className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${faction.bg} ${faction.text} ${faction.border}`}>
          {hero.faction}國 • {hero.role}
        </div>

        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-950/80 border border-amber-500/40 backdrop-blur-md">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className={`text-xs font-bold ${quality.text}`}>{hero.quality}品</span>
        </div>
      </div>

      {/* 2D 人物立繪與水墨單字印章 */}
      <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3 border border-stone-800 shadow-inner group">
        <img
          src={hero.imagePath}
          alt={hero.name}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
        
        {/* 水墨朱砂印章 (右上角落款) */}
        <div className="absolute top-2 left-2 w-8 h-8 rounded-sm ink-seal-red flex items-center justify-center font-bold text-sm shadow-md">
          {sealChar}
        </div>

        <div className="absolute bottom-2 left-3">
          <h3 className="text-xl font-black font-serif-title text-stone-100 tracking-wider drop-shadow-md">
            {hero.name}
          </h3>
          <p className="text-xs text-amber-300/90 font-medium">{hero.title}</p>
        </div>
      </div>

      {/* 戰術名言 */}
      <p className="text-xs italic text-stone-300/90 my-2 px-2.5 py-1 rounded bg-zinc-950/60 border-l-2 border-amber-400 font-serif-title">
        {hero.tacticalQuote}
      </p>

      {/* 簡短描述 */}
      <p className="text-xs text-stone-400 leading-relaxed mb-3 min-h-[2.5rem]">
        {hero.description}
      </p>

      {/* 基礎屬性面板 */}
      <div className="grid grid-cols-2 gap-1.5 text-xs py-2 px-2.5 rounded-lg bg-zinc-950/70 border border-stone-800 mb-3">
        <div className="flex items-center gap-1.5 text-red-400">
          <Zap className="w-3.5 h-3.5" />
          <span>生命: {hero.baseStats.hp}</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400">
          <Target className="w-3.5 h-3.5" />
          <span>攻擊: {hero.baseStats.atk}</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-400">
          <Shield className="w-3.5 h-3.5" />
          <span>防禦: {hero.baseStats.def}</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Crosshair className="w-3.5 h-3.5" />
          <span>射程: {hero.baseStats.attackRange}格</span>
        </div>
      </div>

      {/* 特質技能描述 */}
      {hero.skills.map((skill) => (
        <div
          key={skill.id}
          className="rounded-lg p-2.5 bg-amber-950/30 border border-amber-500/30 flex items-start gap-2"
        >
          <span className="text-base">{skill.icon}</span>
          <div>
            <div className="text-xs font-bold text-amber-300">{skill.name}</div>
            <div className="text-[11px] text-stone-300/80 leading-snug">{skill.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
