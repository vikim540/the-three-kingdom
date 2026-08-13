"use client";

import React from "react";
import { EventBus } from "@/game/EventBus";
import { Swords, Zap, Shield, Heart } from "lucide-react";

export const ARPGActionBar: React.FC = () => {
  const handleAttack = () => {
    EventBus.emit("player-attack");
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-6 py-3 bg-zinc-900/90 border border-amber-500/30 rounded-2xl shadow-2xl backdrop-blur-md">
      {/* 普通攻擊按鈕 */}
      <button
        onClick={handleAttack}
        className="flex flex-col items-center justify-center w-14 h-14 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400 rounded-xl transition active:scale-95 group"
        title="普通攻擊 (空白鍵 / J)"
      >
        <Swords className="w-6 h-6 text-amber-300 group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] text-amber-200/80 font-mono mt-0.5">揮刀 [Space]</span>
      </button>

      <div className="w-px h-8 bg-zinc-700/60" />

      {/* 技能 1 */}
      <button
        onClick={handleAttack}
        className="flex flex-col items-center justify-center w-12 h-12 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-400/50 rounded-xl transition active:scale-95 group"
        title="神箭穿雲 [1]"
      >
        <Zap className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] text-emerald-200/80 font-mono">神箭 [1]</span>
      </button>

      {/* 技能 2 */}
      <button
        className="flex flex-col items-center justify-center w-12 h-12 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400/50 rounded-xl transition active:scale-95 group"
        title="護體劍罡 [2]"
      >
        <Shield className="w-5 h-5 text-blue-300 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] text-blue-200/80 font-mono">護體 [2]</span>
      </button>

      {/* 丹藥 */}
      <button
        className="flex flex-col items-center justify-center w-12 h-12 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/50 rounded-xl transition active:scale-95 group"
        title="服用修仙丹 [3]"
      >
        <Heart className="w-5 h-5 text-rose-300 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] text-rose-200/80 font-mono">仙丹 [3]</span>
      </button>

      <div className="ml-2 text-xs text-stone-400 font-serif-title hidden md:block">
        💡 滑鼠點擊 / WASD 自由行走，按 <kbd className="px-1 py-0.5 bg-zinc-800 border border-stone-600 rounded text-amber-300">Space</kbd> 揮刀砍殺山賊
      </div>
    </div>
  );
};
