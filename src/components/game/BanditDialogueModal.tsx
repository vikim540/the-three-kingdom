"use client";

import React, { useState } from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { ENEMY_BANDIT_CHIEF } from "@/game/config/heroes";
import { Swords, ShieldAlert, Crosshair, X } from "lucide-react";

interface BanditDialogueModalProps {
  onConfirmChoice: (choiceType: "ATTACK" | "AMBUSH" | "GUARD") => void;
}

export const BanditDialogueModal: React.FC<BanditDialogueModalProps> = ({ onConfirmChoice }) => {
  const { phase, addCombatLog } = useBattleStore();
  const [dismissed, setDismissed] = useState(false);

  if (phase !== "DEPLOYMENT" || dismissed) return null;

  const handleSelect = (choiceType: "ATTACK" | "AMBUSH" | "GUARD") => {
    setDismissed(true);
    if (choiceType === "ATTACK") {
      addCombatLog("⚔️ 主角大喝：『放肆山賊！看吾九天雷霆斬你！』全隊士氣大振！", "skill");
    } else if (choiceType === "AMBUSH") {
      addCombatLog("🏹 主角施展假逃誘敵，黃忠隱蔽於草叢準備伏擊！", "skill");
    } else if (choiceType === "GUARD") {
      addCombatLog("🛡️ 全隊結防禦符陣，獲得 30% 傷害豁免！", "info");
    }
    onConfirmChoice(choiceType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative max-w-lg w-full rounded-2xl border-2 border-red-600/70 bg-stone-950/95 shadow-[0_0_50px_rgba(220,38,38,0.4)] p-6 text-stone-200">

        {/* 關閉按鈕 */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 text-stone-500 hover:text-stone-300 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 山賊首領對白頭部 */}
        <div className="flex items-center gap-4 border-b border-stone-800 pb-4 mb-4">
          <div className="w-16 h-16 rounded-xl border-2 border-red-500 overflow-hidden bg-stone-900 shadow-lg relative flex-shrink-0">
            {/* eslint-disable-next-html-element-fallback */}
            <img
              src={ENEMY_BANDIT_CHIEF.imagePath}
              alt={ENEMY_BANDIT_CHIEF.name}
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute bottom-0 inset-x-0 bg-red-950/90 text-center text-[9px] font-bold text-red-300">
              劫匪首領
            </div>
          </div>

          <div>
            <div className="text-base font-black text-red-400 font-serif-title flex items-center gap-2">
              <span>👹 {ENEMY_BANDIT_CHIEF.name}</span>
              <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 text-[10px] border border-red-800">
                黑風山寨主
              </span>
            </div>
            <div className="text-xs text-amber-200 font-serif-title mt-1.5 italic leading-relaxed">
              「此山是我開，此樹是我栽！留下修仙資源與靈石，饒爾等狗命！」
            </div>
          </div>
        </div>

        {/* 對話對策選擇區 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-stone-400 mb-1">請選擇主角與名將的應對策略：</div>

          <button
            onClick={() => handleSelect("AMBUSH")}
            className="w-full p-3 rounded-xl border-2 border-amber-500/70 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-400 text-amber-200 font-bold text-xs flex items-center justify-between transition shadow-md group"
          >
            <span className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>【以身作餌】假逃誘敵，引山賊追擊至黃忠草叢伏擊圈</span>
            </span>
            <span className="text-[10px] text-amber-400 font-mono">推薦策略</span>
          </button>

          <button
            onClick={() => handleSelect("ATTACK")}
            className="w-full p-3 rounded-xl border-2 border-red-500/70 bg-red-950/40 hover:bg-red-900/60 hover:border-red-400 text-red-200 font-bold text-xs flex items-center justify-between transition shadow-md group"
          >
            <span className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
              <span>【直接正面討伐】「放肆山賊！看吾九天雷霆斬你！」</span>
            </span>
            <span className="text-[10px] text-red-400 font-mono">+15% 攻擊力</span>
          </button>

          <button
            onClick={() => handleSelect("GUARD")}
            className="w-full p-3 rounded-xl border-2 border-sky-500/70 bg-sky-950/40 hover:bg-sky-900/60 hover:border-sky-400 text-sky-200 font-bold text-xs flex items-center justify-between transition shadow-md group"
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>【冷靜禦敵】結紫霄防禦符陣，提供全隊傷害豁免</span>
            </span>
            <span className="text-[10px] text-sky-400 font-mono">+30% 防禦力</span>
          </button>
        </div>
      </div>
    </div>
  );
};
