"use client";

import React from "react";
import { HeroConfig, HeroQuality } from "@/types/hero";
import { Shield, Zap, Target, Crosshair, Award } from "lucide-react";

interface HeroCardProps {
  hero: HeroConfig;
  isSelected?: boolean;
  onSelect?: (hero: HeroConfig) => void;
}

const QUALITY_COLORS: Record<HeroQuality, { bg: string; text: string; border: string }> = {
  凡: { bg: "from-slate-800 to-slate-900", text: "text-slate-300", border: "border-slate-600" },
  靈: { bg: "from-emerald-950 to-emerald-900", text: "text-emerald-300", border: "border-emerald-500" },
  王: { bg: "from-blue-950 to-indigo-900", text: "text-blue-300", border: "border-blue-500" },
  帝: { bg: "from-purple-950 to-purple-900", text: "text-purple-300", border: "border-purple-500" },
  仙: { bg: "from-amber-950 to-yellow-950", text: "text-amber-300", border: "border-amber-400" },
};

export const HeroCard: React.FC<HeroCardProps> = ({ hero, isSelected, onSelect }) => {
  const qualityStyle = QUALITY_COLORS[hero.quality];

  return (
    <div
      onClick={() => onSelect?.(hero)}
      className={`relative cursor-pointer rounded-xl p-5 border-2 transition-all duration-300 bg-gradient-to-b ${qualityStyle.bg} ${
        isSelected
          ? `${qualityStyle.border} shadow-[0_0_25px_rgba(234,179,8,0.5)] scale-[1.03] -translate-y-1`
          : "border-slate-800 hover:border-slate-600 hover:scale-[1.01]"
      }`}
    >
      {/* 品質徽章 */}
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-3 py-1 bg-black/60 backdrop-blur-md border border-amber-500/30">
        <Award className="w-3.5 h-3.5 text-amber-400" />
        <span className={`text-xs font-bold ${qualityStyle.text}`}>{hero.quality}品名將</span>
      </div>

      {/* 陣營 */}
      <div className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-slate-950/80 text-amber-200 border border-amber-500/20 mb-2">
        {hero.faction}國 • {hero.role}
      </div>

      {/* 角色標頭 */}
      <div className="flex items-center gap-3 my-2">
        <div className="text-4xl p-2 rounded-lg bg-black/40 border border-amber-500/20 shadow-inner">
          {hero.avatar}
        </div>
        <div>
          <h3 className="text-xl font-black tracking-wide text-amber-100">{hero.name}</h3>
          <p className="text-xs text-amber-400/80 font-medium">{hero.title}</p>
        </div>
      </div>

      {/* 戰術名言 */}
      <p className="text-xs italic text-slate-300/90 my-2 px-2 py-1 rounded bg-black/30 border-l-2 border-amber-400">
        {hero.tacticalQuote}
      </p>

      {/* 描述 */}
      <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[3rem]">
        {hero.description}
      </p>

      {/* 基礎屬性 */}
      <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-lg bg-black/40 border border-slate-800 mb-3">
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

      {/* 特質技能 */}
      {hero.skills.map((skill) => (
        <div
          key={skill.id}
          className="rounded-lg p-2.5 bg-amber-950/30 border border-amber-500/30 flex items-start gap-2"
        >
          <span className="text-lg">{skill.icon}</span>
          <div>
            <div className="text-xs font-bold text-amber-300">{skill.name}</div>
            <div className="text-[11px] text-amber-100/70 leading-snug">{skill.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
