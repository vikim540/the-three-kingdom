"use client";

import React from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { useGameStore } from "@/stores/useGameStore";
import { Play, RotateCcw, Target, Sparkles, HelpCircle } from "lucide-react";

interface BattleHUDProps {
  onStartBattle: () => void;
  onBaitAction: () => void;
  onResetDeployment: () => void;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  onStartBattle,
  onBaitAction,
  onResetDeployment,
}) => {
  const { phase, currentTurn, units, selectedUnitId } = useBattleStore();
  const { selectedHeroId } = useGameStore();

  const selectedUnit = units.find((u) => u.instanceId === selectedUnitId);
  const isHuangZhongSelected = selectedHeroId === "hero_huang_zhong";
  const isXiahouDunSelected = selectedHeroId === "hero_xiahou_dun";

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 頂部戰鬥狀態欄 */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm">
            回合 {currentTurn}
          </div>
          <div className="text-sm font-semibold text-slate-200">
            階段：
            <span className="text-amber-400 font-bold ml-1">
              {phase === "DEPLOYMENT" && "🧭 戰前布陣中"}
              {phase === "BATTLE_IN_PROGRESS" && "⚔️ 戰鬥進行中"}
              {phase === "VICTORY" && "🏆 戰鬥勝利"}
              {phase === "DEFEAT" && "💀 戰鬥失敗"}
            </span>
          </div>
        </div>

        {/* 名將路線提醒 */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-amber-200/90">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>
            {isHuangZhongSelected && "💡 黃忠提示：將黃忠布陣於【草叢】，再用主角【假逃誘敵】引首領入局！"}
            {isXiahouDunSelected && "💡 夏侯惇提示：保持夏侯惇與主角【相鄰 1 格】，觸發【鐵血援護】正面交鋒！"}
            {!isHuangZhongSelected && !isXiahouDunSelected && "💡 通關提示：善用射程與地形加成消滅敵首！"}
          </span>
        </div>
      </div>

      {/* 底部布陣與操作按鈕區 */}
      {phase === "DEPLOYMENT" && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              已選定單位：
              <strong className="text-amber-300 ml-1">
                {selectedUnit ? selectedUnit.heroConfig.name : "請點擊地圖底部格子或右側單位"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onResetDeployment}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置位置</span>
            </button>

            {isHuangZhongSelected && (
              <button
                onClick={onBaitAction}
                className="px-5 py-2.5 rounded-lg text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition flex items-center gap-1.5"
              >
                <Target className="w-4 h-4 text-amber-950" />
                <span>主角假逃誘敵（伏擊）</span>
              </button>
            )}

            <button
              onClick={onStartBattle}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>開陣！開始戰鬥</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
