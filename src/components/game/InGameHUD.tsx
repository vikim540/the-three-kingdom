"use client";

import React, { useState, useEffect, useRef } from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { useGameStore } from "@/stores/useGameStore";
import { TacticalActionType } from "@/types/game";
import { Menu, RotateCcw, X } from "lucide-react";

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

  // 最新5條日誌
  const recentLogs = combatLogs.slice(0, 5);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [combatLogs]);

  return (
    <>
      {/* ─── 頂部左側：回合 + 兵力 ─── */}
      <div className="fixed top-4 left-4 z-30 flex items-center gap-3 pointer-events-none">
        <div
          style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.75), rgba(0,0,0,0.55))" }}
          className="px-4 py-2 rounded-xl border border-amber-500/40 backdrop-blur-sm"
        >
          <div className="text-amber-300 font-black font-serif-title text-xl leading-none">
            第 {currentTurn} 回合
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-sky-400">🔵 我方 {playerAlive}</span>
            <span className="text-red-400">🔴 敵方 {enemyAlive}</span>
          </div>
        </div>

        {/* 階段標示 */}
        <div
          style={{ background: "rgba(0,0,0,0.65)" }}
          className="px-3 py-1.5 rounded-lg border border-stone-600/40 backdrop-blur-sm"
        >
          <span className="text-xs font-semibold text-stone-300">
            {phase === "DEPLOYMENT" && "⚑ 布陣中"}
            {phase === "BATTLE_IN_PROGRESS" && "⚔ 戰鬥中"}
            {phase === "VICTORY" && "🏆 勝利"}
            {phase === "DEFEAT" && "💀 戰敗"}
          </span>
        </div>
      </div>

      {/* ─── 頂部右側：選單按鈕 ─── */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setShowLog((v) => !v)}
          style={{ background: "rgba(0,0,0,0.7)" }}
          className="p-2.5 rounded-xl border border-stone-600/40 text-stone-300 hover:text-amber-300 hover:border-amber-500/40 transition backdrop-blur-sm"
          title="戰鬥日誌"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
          </svg>
        </button>
        <button
          onClick={() => setShowMenu((v) => !v)}
          style={{ background: "rgba(0,0,0,0.7)" }}
          className="p-2.5 rounded-xl border border-stone-600/40 text-stone-300 hover:text-amber-300 hover:border-amber-500/40 transition backdrop-blur-sm"
        >
          {showMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* ─── 選單下拉 ─── */}
      {showMenu && (
        <div
          className="fixed top-16 right-4 z-50 w-44 rounded-xl overflow-hidden border border-stone-700/60 shadow-2xl"
          style={{ background: "rgba(9,9,11,0.92)", backdropFilter: "blur(12px)" }}
        >
          <button
            onClick={() => { onExportSave(); setShowMenu(false); }}
            className="w-full px-4 py-3 text-left text-xs text-stone-200 hover:bg-amber-500/20 hover:text-amber-300 transition border-b border-stone-800"
          >
            💾 儲存進度
          </button>
          <button
            onClick={() => { onResetDeployment(); setShowMenu(false); }}
            className="w-full px-4 py-3 text-left text-xs text-stone-200 hover:bg-amber-500/20 hover:text-amber-300 transition border-b border-stone-800 flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重置布陣
          </button>
          <button
            onClick={() => { onReturnHome(); setShowMenu(false); }}
            className="w-full px-4 py-3 text-left text-xs text-red-400 hover:bg-red-500/20 transition"
          >
            ← 返回主選單
          </button>
        </div>
      )}

      {/* ─── 戰鬥日誌浮層 ─── */}
      {showLog && (
        <div
          className="fixed top-16 right-16 z-50 w-72 max-h-52 overflow-y-auto rounded-xl border border-stone-700/50 shadow-2xl"
          style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(12px)" }}
          ref={logRef}
        >
          <div className="px-3 py-2 border-b border-stone-800 text-xs text-amber-400 font-bold">戰鬥日誌</div>
          <div className="p-2 space-y-0.5">
            {recentLogs.map((log) => (
              <div key={log.id} className={`text-[11px] leading-snug px-2 py-1 rounded ${
                log.type === "damage" ? "text-red-300" :
                log.type === "skill" ? "text-amber-300" :
                log.type === "victory" ? "text-emerald-300" :
                "text-stone-400"
              }`}>
                {log.text}
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div className="text-xs text-stone-600 p-2">尚無戰鬥記錄</div>
            )}
          </div>
        </div>
      )}

      {/* ─── 布陣階段提示（黃忠路線）── 小型浮動文字 ─── */}
      {phase === "DEPLOYMENT" && isHuangZhong && (
        <div
          className="fixed top-1/2 left-4 -translate-y-1/2 z-30 max-w-[160px] pointer-events-none"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
          <div className="px-3 py-2 rounded-xl border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
            💡 將<strong className="text-amber-300">黃忠</strong>拖至<span className="text-emerald-400">草叢</span>可觸發致命一箭！
          </div>
        </div>
      )}

      {/* ─── 底部主操作 HUD ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        {/* 背景遮罩漸層 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)" }}
        />

        <div className="relative z-10 flex items-end justify-center gap-4 px-6 pb-5 pt-8">

          {/* 布陣階段動作 */}
          {phase === "DEPLOYMENT" && (
            <>
              {isHuangZhong && (
                <button
                  onClick={onBaitAction}
                  className="group flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border-2 border-amber-500/70 transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, rgba(180,83,9,0.85), rgba(146,64,14,0.7))",
                    boxShadow: "0 0 20px rgba(245,158,11,0.4)",
                  }}
                >
                  <span className="text-2xl">🏹</span>
                  <span className="text-amber-200 text-xs font-bold tracking-wide">假逃誘敵</span>
                </button>
              )}

              <button
                onClick={onStartBattle}
                className="group flex flex-col items-center gap-1.5 px-8 py-3.5 rounded-xl border-2 border-emerald-500/80 transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, rgba(5,100,62,0.9), rgba(6,78,59,0.75))",
                  boxShadow: "0 0 25px rgba(16,185,129,0.5)",
                }}
              >
                <span className="text-2xl">⚔️</span>
                <span className="text-emerald-200 text-sm font-black tracking-widest font-serif-title">開陣！</span>
              </button>
            </>
          )}

          {/* 戰鬥中動作指令 */}
          {phase === "BATTLE_IN_PROGRESS" && (
            <>
              {[
                { action: "ATTACK" as TacticalActionType, icon: "⚔️", label: "普攻", color: "rgba(185,28,28,0.85)", border: "rgba(239,68,68,0.8)", glow: "rgba(239,68,68,0.4)" },
                { action: "SKILL" as TacticalActionType, icon: "🔮", label: "神通", color: "rgba(146,64,14,0.85)", border: "rgba(245,158,11,0.8)", glow: "rgba(245,158,11,0.4)" },
                { action: "ITEM" as TacticalActionType, icon: "🧪", label: "丹藥", color: "rgba(6,78,59,0.85)", border: "rgba(16,185,129,0.8)", glow: "rgba(16,185,129,0.4)" },
                { action: "FLEE" as TacticalActionType, icon: "🏃", label: "撤退", color: "rgba(7,89,133,0.85)", border: "rgba(56,189,248,0.8)", glow: "rgba(56,189,248,0.4)" },
              ].map(({ action, icon, label, color, border, glow }) => (
                <button
                  key={action}
                  onClick={() => onExecuteAction(action)}
                  className="group flex flex-col items-center gap-1.5 w-20 py-3 rounded-xl border-2 transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    background: activeAction === action ? `rgba(255,255,255,0.15)` : color,
                    borderColor: border,
                    boxShadow: activeAction === action ? `0 0 25px ${glow}, inset 0 0 15px rgba(255,255,255,0.1)` : `0 0 12px ${glow}`,
                  }}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-white text-xs font-bold tracking-wider">{label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};
