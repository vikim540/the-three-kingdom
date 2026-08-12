"use client";

import React, { useState, useEffect, useRef } from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { useGameStore } from "@/stores/useGameStore";
import { TacticalActionType } from "@/types/game";
import { Menu, RotateCcw, X, ScrollText } from "lucide-react";

interface InGameHUDProps {
  onStartBattle: () => void;
  onBaitAction: () => void;
  onResetDeployment: () => void;
  onExecuteAction: (action: TacticalActionType) => void;
  onReturnHome: () => void;
  onExportSave: () => void;
}

export const InGameHUD: React.FC<InGameHUDProps> = ({
  onStartBattle,
  onBaitAction,
  onResetDeployment,
  onExecuteAction,
  onReturnHome,
  onExportSave,
}) => {
  const { phase, currentTurn, units, combatLogs, activeAction } = useBattleStore();
  const { selectedHeroId } = useGameStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const playerAlive = units.filter((u) => u.faction === "PLAYER" && !u.isDead).length;
  const enemyAlive = units.filter((u) => u.faction === "ENEMY" && !u.isDead).length;

  const isHuangZhong = selectedHeroId === "hero_huang_zhong";

  // 最新日誌
  const recentLogs = combatLogs.slice(0, 8);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [combatLogs]);

  return (
    <>
      {/* ─── 頂部左側：古典金框 [第 1 回合] ─── */}
      <div className="fixed top-4 left-4 z-30 flex items-start gap-3 pointer-events-none">
        <div
          className="px-5 py-2.5 rounded-xl border-2 border-amber-600/50 shadow-2xl backdrop-blur-md"
          style={{ background: "linear-gradient(135deg, rgba(15,13,10,0.88), rgba(28,25,23,0.78))" }}
        >
          <div className="text-amber-300 font-black font-serif-title text-2xl tracking-widest flex items-center gap-2">
            <span>第 {currentTurn} 回合</span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs font-bold">
            <span className="flex items-center gap-1 text-sky-400">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              我方：{playerAlive}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
              敵方：{enemyAlive}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 頂部中央：階段標籤 ─── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div
          className="px-6 py-1.5 rounded-full border border-amber-500/40 text-amber-200 text-sm font-black font-serif-title tracking-widest shadow-lg backdrop-blur-md flex items-center gap-2"
          style={{ background: "linear-gradient(180deg, rgba(20,16,10,0.85), rgba(9,9,11,0.9))" }}
        >
          <span className="text-amber-400">❖</span>
          <span>
            {phase === "DEPLOYMENT" && "布陣中"}
            {phase === "BATTLE_IN_PROGRESS" && "戰鬥中"}
            {phase === "VICTORY" && "大獲全勝"}
            {phase === "DEFEAT" && "戰敗失陷"}
          </span>
          <span className="text-amber-400">❖</span>
        </div>
      </div>

      {/* ─── 頂部右側：日誌與選單按鈕 ─── */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setShowLog((v) => !v)}
          className="p-2.5 rounded-xl border border-stone-600/50 text-stone-200 hover:text-amber-300 hover:border-amber-500/60 transition backdrop-blur-md shadow-lg"
          style={{ background: "rgba(15,13,10,0.82)" }}
          title="戰鬥日誌"
        >
          <ScrollText className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="p-2.5 rounded-xl border border-stone-600/50 text-stone-200 hover:text-amber-300 hover:border-amber-500/60 transition backdrop-blur-md shadow-lg"
          style={{ background: "rgba(15,13,10,0.82)" }}
        >
          {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── 選單下拉 ─── */}
      {showMenu && (
        <div
          className="fixed top-16 right-4 z-50 w-48 rounded-xl overflow-hidden border-2 border-amber-600/40 shadow-2xl"
          style={{ background: "rgba(15,13,10,0.95)", backdropFilter: "blur(16px)" }}
        >
          <button
            onClick={() => { onExportSave(); setShowMenu(false); }}
            className="w-full px-4 py-3 text-left text-xs font-semibold text-stone-200 hover:bg-amber-500/20 hover:text-amber-300 transition border-b border-stone-800"
          >
            💾 儲存修仙進度
          </button>
          <button
            onClick={() => { onResetDeployment(); setShowMenu(false); }}
            className="w-full px-4 py-3 text-left text-xs font-semibold text-stone-200 hover:bg-amber-500/20 hover:text-amber-300 transition border-b border-stone-800 flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重置名將布陣
          </button>
          <button
            onClick={() => { onReturnHome(); setShowMenu(false); }}
            className="w-full px-4 py-3 text-left text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            ← 返回主選單
          </button>
        </div>
      )}

      {/* ─── 戰鬥日誌浮層 ─── */}
      {showLog && (
        <div
          className="fixed top-16 right-16 z-50 w-80 max-h-64 overflow-y-auto rounded-xl border-2 border-stone-700/60 shadow-2xl"
          style={{ background: "rgba(12,10,9,0.92)", backdropFilter: "blur(14px)" }}
          ref={logRef}
        >
          <div className="px-4 py-2.5 border-b border-stone-800 text-xs font-bold text-amber-400 flex items-center justify-between">
            <span>📜 戰鬥與伏擊日誌</span>
            <span className="text-[10px] text-stone-500">即時更新</span>
          </div>
          <div className="p-2 space-y-1">
            {recentLogs.map((log) => (
              <div key={log.id} className={`text-xs leading-relaxed px-2.5 py-1.5 rounded border ${
                log.type === "damage" ? "bg-red-950/30 text-red-300 border-red-900/40" :
                log.type === "skill" ? "bg-amber-950/30 text-amber-300 border-amber-900/40" :
                log.type === "victory" ? "bg-emerald-950/30 text-emerald-300 border-emerald-900/40" :
                "bg-stone-900/40 text-stone-300 border-stone-800/40"
              }`}>
                {log.text}
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div className="text-xs text-stone-500 p-3 text-center">尚無戰鬥記錄</div>
            )}
          </div>
        </div>
      )}

      {/* ─── 左側古典提示氣泡（黃忠伏擊提示） ─── */}
      {phase === "DEPLOYMENT" && (
        <div
          className="fixed top-1/3 left-4 z-30 max-w-[210px] pointer-events-none animate-fade-in"
        >
          <div
            className="p-3.5 rounded-xl border-2 border-amber-600/60 shadow-2xl backdrop-blur-md flex items-start gap-2.5"
            style={{ background: "linear-gradient(135deg, rgba(24,19,15,0.9), rgba(12,10,9,0.85))" }}
          >
            <span className="text-2xl mt-0.5">🏮</span>
            <div className="text-xs leading-relaxed text-stone-200">
              {isHuangZhong ? (
                <>
                  將<strong className="text-amber-300">黃忠</strong>拖至側翼<span className="text-emerald-400">草叢</span>，可觸發一箭秒殺敵首！
                </>
              ) : (
                <>
                  拖拽近處名將進行卡牌布陣，按<strong className="text-emerald-400">【開陣】</strong>開始戰鬥！
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 底部古典大按鈕操作區 (匹配參考原型圖) ─── */}
      <div className="fixed bottom-4 left-0 right-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-6 px-6 py-2">

          {/* 布陣階段按鈕 */}
          {phase === "DEPLOYMENT" && (
            <>
              {isHuangZhong && (
                <button
                  onClick={onBaitAction}
                  className="group relative flex items-center gap-3 px-8 py-3.5 rounded-2xl border-2 border-amber-500/80 font-black font-serif-title text-base text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, rgba(120,40,10,0.92), rgba(180,70,15,0.85))",
                  }}
                >
                  <span className="text-2xl">🏹</span>
                  <span className="tracking-widest text-shadow">假逃誘敵</span>
                </button>
              )}

              <button
                onClick={onStartBattle}
                className="group relative flex items-center gap-3 px-10 py-3.5 rounded-2xl border-2 border-emerald-400/90 font-black font-serif-title text-lg text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(4,120,87,0.88))",
                }}
              >
                <span className="text-2xl">⚔️</span>
                <span className="tracking-widest text-shadow">開陣！</span>
              </button>
            </>
          )}

          {/* 戰鬥進行中動作指令 */}
          {phase === "BATTLE_IN_PROGRESS" && (
            <div className="flex items-center gap-3">
              {[
                { action: "ATTACK" as TacticalActionType, icon: "⚔️", label: "普攻", bg: "linear-gradient(135deg, rgba(153,27,27,0.9), rgba(185,28,28,0.8))", border: "rgba(239,68,68,0.8)", glow: "rgba(239,68,68,0.4)" },
                { action: "SKILL" as TacticalActionType, icon: "🔮", label: "神通", bg: "linear-gradient(135deg, rgba(146,64,14,0.9), rgba(180,83,9,0.8))", border: "rgba(245,158,11,0.8)", glow: "rgba(245,158,11,0.4)" },
                { action: "ITEM" as TacticalActionType, icon: "🧪", label: "丹藥", bg: "linear-gradient(135deg, rgba(6,78,59,0.9), rgba(4,120,87,0.8))", border: "rgba(16,185,129,0.8)", glow: "rgba(16,185,129,0.4)" },
                { action: "FLEE" as TacticalActionType, icon: "🏃", label: "撤退", bg: "linear-gradient(135deg, rgba(12,74,110,0.9), rgba(14,116,144,0.8))", border: "rgba(56,189,248,0.8)", glow: "rgba(56,189,248,0.4)" },
              ].map(({ action, icon, label, bg, border, glow }) => (
                <button
                  key={action}
                  onClick={() => onExecuteAction(action)}
                  className="group flex flex-col items-center justify-center gap-1 w-20 h-20 rounded-2xl border-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                  style={{
                    background: activeAction === action ? "rgba(255,255,255,0.25)" : bg,
                    borderColor: border,
                    boxShadow: activeAction === action ? `0 0 25px ${glow}, inset 0 0 15px rgba(255,255,255,0.2)` : `0 0 12px ${glow}`,
                  }}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-white text-xs font-bold tracking-wider">{label}</span>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
};
