"use client";

import React from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { Trophy, Skull, Sparkles, RefreshCw, Home, Download } from "lucide-react";

interface BattleResultModalProps {
  onRestart: () => void;
  onReturnHome: () => void;
  onExportSave: () => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  onRestart,
  onReturnHome,
  onExportSave,
}) => {
  const { phase, reward, tacticalOutcome } = useBattleStore();

  if (phase !== "VICTORY" && phase !== "DEFEAT") return null;

  const isVictory = phase === "VICTORY";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="max-w-xl w-full rounded-2xl p-6 md:p-8 border border-amber-500/40 bg-slate-900/95 shadow-[0_0_60px_rgba(234,179,8,0.3)] text-center">
        {/* 勝利 / 失敗 徽章 */}
        <div className="inline-flex p-4 rounded-full bg-slate-950 border border-amber-500/30 mb-4 shadow-inner">
          {isVictory ? (
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
          ) : (
            <Skull className="w-12 h-12 text-red-500" />
          )}
        </div>

        <h2 className="text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
          {isVictory ? reward?.title || "大獲全勝！" : "不幸敗北..."}
        </h2>

        {/* 通關路線標籤 */}
        {isVictory && tacticalOutcome && (
          <div className="inline-block mt-2 px-4 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {tacticalOutcome === "AMBUSH" && "🎯 黃忠伏擊特技通關（草叢狙殺敵首）"}
            {tacticalOutcome === "GUARD" && "🛡️ 夏侯惇鐵血援護通關（正面推進全滅）"}
            {tacticalOutcome === "STANDARD" && "⚔️ 戰術碾壓全勝"}
          </div>
        )}

        <p className="mt-3 text-xs md:text-sm text-slate-300">
          {isVictory
            ? reward?.description || "成功平定黑風山劫匪，解鎖更高階修仙途徑！"
            : "修仙路上強敵環伺，調整名將布陣策略後重試！"}
        </p>

        {/* 戰利品結算區 */}
        {isVictory && reward && (
          <div className="my-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
            <h4 className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>繳獲戰利品與仙緣收益：</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 font-semibold">
                💰 靈石收益：+{reward.spiritStones}
              </div>
              <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-purple-200 font-semibold">
                ✨ 修仙經驗：+{reward.exp}
              </div>
            </div>

            <div className="space-y-1.5">
              {reward.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="font-bold text-slate-200">{item.name}</span>
                  </span>
                  <span className="text-amber-400 font-bold">x{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 按鈕組 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center justify-center gap-2 text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>再戰一次</span>
          </button>

          <button
            onClick={onExportSave}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 transition flex items-center justify-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            <span>匯出存檔 JSON</span>
          </button>

          <button
            onClick={onReturnHome}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-md transition flex items-center justify-center gap-2 text-xs"
          >
            <Home className="w-4 h-4" />
            <span>返回主選單</span>
          </button>
        </div>
      </div>
    </div>
  );
};
