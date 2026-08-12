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
      className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 bg-gradient-to-b ${qualityStyle.bg} ${
        isSelected
          ? `${qualityStyle.border} shadow-[0_0_25px_rgba(234,179,8,0.5)] scale-[1.03] -translate-y-1`
          : "border-slate-800 hover:border-slate-600 hover:scale-[1.01]"
      }`}
    >
      {/* 品質徽章 */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 bg-black/75 backdrop-blur-md border border-amber-500/40">
        <Award className="w-3.5 h-3.5 text-amber-400" />
        <span className={`text-xs font-bold ${qualityStyle.text}`}>{hero.quality}品名將</span>
      </div>

      {/* 2D 高清人物立繪 */}
      <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3 border border-amber-500/20 shadow-inner group">
        <img
          src={hero.imagePath}
          alt={hero.name}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <span className="text-xl p-1 rounded bg-black/60 backdrop-blur-sm border border-amber-500/30">
            {hero.avatar}
          </span>
          <div>
            <h3 className="text-lg font-black tracking-wide text-amber-100 drop-shadow-md">{hero.name}</h3>
            <p className="text-[11px] text-amber-300/90 font-medium">{hero.title}</p>
          </div>
        </div>
      </div>

      {/* 陣營與定位 */}
      <div className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold bg-slate-950/80 text-amber-200 border border-amber-500/20 mb-2">
        {hero.faction}國 • {hero.role}
      </div>

      {/* 戰術名言 */}
      <p className="text-xs italic text-slate-300/90 my-1.5 px-2 py-1 rounded bg-black/40 border-l-2 border-amber-400">
        {hero.tacticalQuote}
      </p>

      {/* 描述 */}
      <p className="text-xs text-slate-400 leading-relaxed mb-3 min-h-[2.5rem]">
        {hero.description}
      </p>

      {/* 基礎屬性 */}
      <div className="grid grid-cols-2 gap-1.5 text-xs py-2 px-2.5 rounded-lg bg-black/40 border border-slate-800 mb-3">
        <div className="flex items-center gap-1 text-red-400">
          <Zap className="w-3 h-3" />
          <span>生命: {hero.baseStats.hp}</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400">
          <Target className="w-3 h-3" />
          <span>攻擊: {hero.baseStats.atk}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-400">
          <Shield className="w-3 h-3" />
          <span>防禦: {hero.baseStats.def}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <Crosshair className="w-3 h-3" />
          <span>射程: {hero.baseStats.attackRange}格</span>
        </div>
      </div>

      {/* 特質技能 */}
      {hero.skills.map((skill) => (
        <div
          key={skill.id}
          className="rounded-lg p-2 bg-amber-950/40 border border-amber-500/30 flex items-start gap-2"
        >
          <span className="text-base">{skill.icon}</span>
          <div>
            <div className="text-xs font-bold text-amber-300">{skill.name}</div>
            <div className="text-[11px] text-amber-100/70 leading-snug">{skill.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
