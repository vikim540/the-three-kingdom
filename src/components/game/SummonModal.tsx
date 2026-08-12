"use client";

import React, { useState } from "react";
import { SUMMONABLE_HEROES } from "@/game/config/heroes";
import { HeroConfig } from "@/types/hero";
import { HeroCard } from "./HeroCard";
import { Sparkles, Compass } from "lucide-react";

interface SummonModalProps {
  onConfirmSummon: (hero: HeroConfig) => void;
}

export const SummonModal: React.FC<SummonModalProps> = ({ onConfirmSummon }) => {
  const [selectedHero, setSelectedHero] = useState<HeroConfig>(SUMMONABLE_HEROES[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="max-w-6xl w-full my-auto rounded-2xl p-6 md:p-8 border border-amber-500/30 bg-slate-900/90 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
        {/* 標題與修仙意境說明 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold mb-3">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>三國天道召喚 • 初次仙緣</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 tracking-wider">
            選擇你的第一位降世名將
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl mx-auto">
            名將特性將直接決定迎戰黑風山劫匪的通關方式與戰略收益！<br />
            推薦體驗 <span className="text-amber-300 font-bold">黃忠（草叢伏擊一箭）</span> 或 <span className="text-blue-300 font-bold">夏侯惇（主角相鄰防禦）</span>！
          </p>
        </div>

        {/* 四選一卡牌區域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {SUMMONABLE_HEROES.map((hero) => (
            <HeroCard
              key={hero.id}
              hero={hero}
              isSelected={selectedHero?.id === hero.id}
              onSelect={(h) => setSelectedHero(h)}
            />
          ))}
        </div>

        {/* 底部確認按鈕與路線說明 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 text-slate-300 text-sm">
            <Compass className="w-5 h-5 text-amber-400" />
            <span>
              目前選擇：<strong className="text-amber-300">{selectedHero.name}</strong>（{selectedHero.title}）
            </span>
          </div>

          <button
            onClick={() => onConfirmSummon(selectedHero)}
            className="w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:shadow-[0_0_30px_rgba(234,179,8,0.8)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>締結仙契，攜手出征</span>
          </button>
        </div>
      </div>
    </div>
  );
};
