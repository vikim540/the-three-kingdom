"use client";

import React from "react";
import { SUMMONABLE_HEROES } from "@/game/config/heroes";
import { HeroConfig } from "@/types/hero";
import { Sparkles, ShieldAlert, Zap, PlusCircle } from "lucide-react";

interface RoguelikeUpgradeModalProps {
  onSelectUpgrade: (hero: HeroConfig) => void;
}

export const RoguelikeUpgradeModal: React.FC<RoguelikeUpgradeModalProps> = ({ onSelectUpgrade }) => {
  // 隨機抽取 3 位強勢武將供玩家選擇隊友
  const choices = SUMMONABLE_HEROES.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-3xl bg-zinc-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          <h2 className="text-2xl font-black font-serif-title text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 tracking-widest">
            修仙突破・召集強援 (隊伍擴建)
          </h2>
          <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
        </div>
        <p className="text-xs text-stone-400 mb-6 font-serif-title">
          面對 10 名山賊圍攻，選擇一位名將加入主角團同步作戰（隊員將維持陣型與主角同步移動、自動釋放彈幕技能）！
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {choices.map((hero) => (
            <div
              key={hero.id}
              onClick={() => onSelectUpgrade(hero)}
              className="relative flex flex-col items-center bg-zinc-800/80 hover:bg-zinc-800 border border-amber-500/30 hover:border-amber-400 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-amber-500/20 shadow-lg group"
            >
              <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {hero.quality}品
              </div>
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/60 overflow-hidden mb-3 group-hover:border-amber-300 transition-colors">
                <img src={hero.imagePath} alt={hero.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-bold text-amber-100 font-serif-title mb-1">{hero.name}</h3>
              <span className="text-xs text-amber-400/80 mb-3">{hero.title}・{hero.role}</span>
              <p className="text-xs text-stone-300 leading-relaxed mb-4 italic">"{hero.tacticalQuote}"</p>

              <div className="w-full pt-3 border-t border-zinc-700/60 flex items-center justify-center gap-1 text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                <PlusCircle className="w-4 h-4" />
                <span>加入主角隊伍</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
