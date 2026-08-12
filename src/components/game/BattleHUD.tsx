"use client";

import React from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { useGameStore } from "@/stores/useGameStore";
import { TacticalActionType } from "@/types/game";
import { Play, RotateCcw, Swords, Shield, HeartPulse, Footprints, Target, Sparkles, HelpCircle } from "lucide-react";

interface BattleHUDProps {
  onStartBattle: () => void;
  onBaitAction: () => void;
  onResetDeployment: () => void;
  onExecuteAction: (action: TacticalActionType) => void;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  onStartBattle,
  onBaitAction,
  onResetDeployment,
  onExecuteAction,
}) => {
  const { phase, currentTurn, units, selectedUnitId, activeAction } = useBattleStore();
  const { selectedHeroId } = useGameStore();

  const selectedUnit = units.find((u) => u.instanceId === selectedUnitId);
  const isHuangZhongSelected = selectedHeroId === "hero_huang_zhong";
  const isXiahouDunSelected = selectedHeroId === "hero_xiahou_dun";

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 頂部輕量戰鬥狀態欄 */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/90 border border-amber-500/30 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs font-serif-title">
            回合 {currentTurn}
          </div>
          <div className="text-xs font-semibold text-stone-200">
            狀態：
            <span className="text-amber-400 font-bold ml-1">
              {phase === "DEPLOYMENT" && "🧭 布陣中（可按住人物拖拽擺位）"}
              {phase === "BATTLE_IN_PROGRESS" && "⚔️ 兩軍對決中"}
              {phase === "VICTORY" && "🏆 戰鬥勝利"}
              {phase === "DEFEAT" && "💀 戰鬥失敗"}
            </span>
          </div>
        </div>

        {/* 名將路線提醒 */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-amber-200/90">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>
            {isHuangZhongSelected && "💡 黃忠提示：將黃忠拖至【草叢】，主角點擊【假逃誘敵】或按下【逃跑】即可秒殺敵首！"}
            {isXiahouDunSelected && "💡 夏侯惇提示：將夏侯惇與主角【相鄰擺放】，開啟【鐵血援護】減傷 40%！"}
            {!isHuangZhongSelected && !isXiahouDunSelected && "💡 提示：4×10 格子底部 (1,9) 及 (2,9) 為逃生法陣！"}
          </span>
        </div>
      </div>

      {/* 布陣階段操作按鈕區 */}
      {phase === "DEPLOYMENT" && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-stone-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              已選定：
              <strong className="text-amber-300 ml-1 font-serif-title text-sm">
                {selectedUnit ? selectedUnit.heroConfig.name : "請在 4×10 地圖直接拖拽名將 Token"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onResetDeployment}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-stone-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置位置</span>
            </button>

            {isHuangZhongSelected && (
              <button
                onClick={onBaitAction}
                className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition flex items-center gap-1.5"
              >
                <Target className="w-4 h-4 text-zinc-950" />
                <span>主角假逃誘敵（伏擊）</span>
              </button>
            )}

            <button
              onClick={onStartBattle}
              className="px-5 py-2 rounded-lg text-xs font-bold text-zinc-950 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>開陣！開始戰鬥</span>
            </button>
          </div>
        </div>
      )}

      {/* 戰鬥中常規動作指令面板（攻擊、神通、丹藥、逃跑） */}
      {phase === "BATTLE_IN_PROGRESS" && (
        <div className="grid grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-900/95 border border-amber-500/40 shadow-xl backdrop-blur-md">
          <button
            onClick={() => onExecuteAction("ATTACK")}
            className={`py-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition ${
              activeAction === "ATTACK"
                ? "bg-red-700 text-white ring-2 ring-red-400"
                : "bg-zinc-800 text-red-300 hover:bg-zinc-700 border border-red-500/30"
            }`}
          >
            <Swords className="w-5 h-5 text-red-400" />
            <span>⚔️ 普通攻擊</span>
          </button>

          <button
            onClick={() => onExecuteAction("SKILL")}
            className={`py-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition ${
              activeAction === "SKILL"
                ? "bg-amber-600 text-white ring-2 ring-amber-400"
                : "bg-zinc-800 text-amber-300 hover:bg-zinc-700 border border-amber-500/30"
            }`}
          >
            <Shield className="w-5 h-5 text-amber-400" />
            <span>🔮 施展神通</span>
          </button>

          <button
            onClick={() => onExecuteAction("ITEM")}
            className={`py-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition ${
              activeAction === "ITEM"
                ? "bg-emerald-700 text-white ring-2 ring-emerald-400"
                : "bg-zinc-800 text-emerald-300 hover:bg-zinc-700 border border-emerald-500/30"
            }`}
          >
            <HeartPulse className="w-5 h-5 text-emerald-400" />
            <span>🧪 服用丹藥 (+50HP)</span>
          </button>

          <button
            onClick={() => onExecuteAction("FLEE")}
            className={`py-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition ${
              activeAction === "FLEE"
                ? "bg-sky-700 text-white ring-2 ring-sky-400"
                : "bg-zinc-800 text-sky-300 hover:bg-zinc-700 border border-sky-500/30"
            }`}
          >
            <Footprints className="w-5 h-5 text-sky-400" />
            <span>🏃 逃跑/誘敵</span>
          </button>
        </div>
      )}
    </div>
  );
};
