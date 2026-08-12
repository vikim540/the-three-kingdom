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
  const [selectedHero, setSelectedHero] = useState<HeroConfig | null>(SUMMONABLE_HEROES[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="max-w-6xl w-full my-auto rounded-2xl p-6 md:p-8 border border-amber-500/40 bg-zinc-900/95 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* 標題與水墨意境說明 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold mb-3">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>三國天道召喚 • 初次仙緣</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black font-serif-title text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 tracking-wider">
            選擇你的降世名將
          </h2>
          <p className="mt-2 text-xs md:text-sm text-stone-300 max-w-2xl mx-auto leading-relaxed">
            名將特質將決定迎戰黑風山劫匪的戰術路線！<br />
            推薦體驗 <span className="text-amber-300 font-bold">黃忠（草叢伏擊一箭）</span> 或 <span className="text-blue-300 font-bold">夏侯惇（主角相鄰援護）</span>！
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-3 text-stone-300 text-xs md:text-sm">
            <Compass className="w-5 h-5 text-amber-400" />
            <span>
              當前選擇：
              <strong className="text-amber-300 font-serif-title text-base ml-1">
                {selectedHero ? selectedHero.name : "請點擊上方卡牌選擇名將"}
              </strong>
            </span>
          </div>

          <button
            disabled={!selectedHero}
            onClick={() => selectedHero && onConfirmSummon(selectedHero)}
            className="w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-zinc-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.7)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>締結仙契，攜手出征</span>
          </button>
        </div>
      </div>
    </div>
  );
};
