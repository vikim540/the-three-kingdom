"use client";

import React, { useState, useEffect, useRef } from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { useGameStore } from "@/stores/useGameStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { TacticalActionType } from "@/types/game";
import { DevModeEditor } from "./DevModeEditor";
import { Menu, RotateCcw, X, ScrollText, Backpack, Users } from "lucide-react";

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
  onReturnHome,
  onExportSave,
}) => {
  const { phase, currentTurn, units, combatLogs } = useBattleStore();
  const { selectedHeroId } = useGameStore();
  const { spiritStones, heroSouls, toggleB, toggleTab } = useInventoryStore();

  const [showMenu, setShowMenu] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const playerAlive = units.filter((u) => u.faction === "PLAYER" && !u.isDead).length;
  const enemyAlive = units.filter((u) => u.faction === "ENEMY" && !u.isDead).length;

  const isHuangZhong = selectedHeroId === "hero_huang_zhong";
  const recentLogs = combatLogs.slice(0, 8);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [combatLogs]);

  return (
    <>
      {/* ─── 開發模式編輯器 (右上角常駐 ⚙️ 按鈕) ─── */}
      <DevModeEditor />

      {/* ─── 頂部左側：回合數與存活數 ─── */}
      <div className="fixed top-4 left-4 z-30 flex items-start gap-3 pointer-events-none">
        <div
          className="px-5 py-2.5 rounded-xl border-2 border-amber-600/50 shadow-2xl backdrop-blur-md"
          style={{ background: "linear-gradient(135deg, rgba(15,13,10,0.88), rgba(28,25,23,0.78))" }}
        >
          <div className="text-amber-300 font-black font-serif-title text-xl tracking-widest flex items-center gap-2">
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

      {/* ─── 上方中央：當前階段 ─── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div
          className="px-6 py-1.5 rounded-full border border-amber-500/40 text-amber-200 text-xs font-black font-serif-title tracking-widest shadow-lg backdrop-blur-md flex items-center gap-2"
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

      {/* ─── 頂部右側：系統選單與日誌 ─── */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setShowLog((v) => !v)}
          className="p-2.5 rounded-xl border border-stone-600/50 text-stone-200 hover:text-amber-300 hover:border-amber-500/60 transition backdrop-blur-md shadow-lg"
          style={{ background: "rgba(15,13,10,0.82)" }}
          title="戰鬥日誌"
        >
          <ScrollText className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="p-2.5 rounded-xl border border-stone-600/50 text-stone-200 hover:text-amber-300 hover:border-amber-500/60 transition backdrop-blur-md shadow-lg"
          style={{ background: "rgba(15,13,10,0.82)" }}
        >
          {showMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
          </div>
        </div>
      )}

      {/* ─── 左側中部：操作提示氣泡 (可關閉) ─── */}
      {showTip && phase === "DEPLOYMENT" && (
        <div className="fixed top-1/3 left-4 z-30 max-w-[210px] pointer-events-auto animate-fade-in">
          <div
            className="p-3.5 rounded-xl border-2 border-amber-600/60 shadow-2xl backdrop-blur-md flex items-start justify-between gap-2"
            style={{ background: "linear-gradient(135deg, rgba(24,19,15,0.9), rgba(12,10,9,0.85))" }}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl mt-0.5">🏮</span>
              <div className="text-xs leading-relaxed text-stone-200">
                {isHuangZhong ? (
                  <>
                    拖拽<strong className="text-amber-300">黃忠</strong>至側翼<span className="text-emerald-400">草叢埋伏區</span>，觸發神箭狙殺敵首！
                  </>
                ) : (
                  <>
                    拖拽名將卡牌至藍色/綠色多邊形區域，按<strong className="text-emerald-400">【開始戰鬥】</strong>！
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowTip(false)}
              className="text-stone-500 hover:text-stone-300 text-xs p-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── 底部中央：僅在布陣階段顯示大按鈕 ─── */}
      {phase === "DEPLOYMENT" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-5 pointer-events-auto">
          {isHuangZhong && (
            <button
              onClick={onBaitAction}
              className="px-7 py-3 rounded-2xl border-2 border-amber-500/80 font-black font-serif-title text-sm text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(120,40,10,0.92), rgba(180,70,15,0.85))",
              }}
            >
              🏹 假逃誘敵 (伏擊)
            </button>
          )}

          <button
            onClick={onStartBattle}
            className="px-9 py-3.5 rounded-2xl border-2 border-emerald-400/90 font-black font-serif-title text-base text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(4,120,87,0.88))",
            }}
          >
            ⚔️ 開始戰鬥！
          </button>
        </div>
      )}

      {/* ─── 右下角：資源與快捷物品欄入口 (B / TAB) ─── */}
      <div className="fixed bottom-5 right-5 z-30 flex items-center gap-3 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-xl border border-stone-700 bg-stone-950/85 text-xs font-bold flex items-center gap-3 backdrop-blur-md">
          <span className="text-amber-300">💰 {spiritStones}</span>
          <span className="text-purple-300">✨ {heroSouls}</span>
        </div>

        <button
          onClick={() => toggleB()}
          className="p-2.5 rounded-xl border-2 border-amber-500/60 bg-stone-900/90 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center gap-1 transition shadow-lg"
          title="按 B 鍵開啟主角個人背包"
        >
          <Backpack className="w-4 h-4" />
          <span>背包 (B)</span>
        </button>

        <button
          onClick={toggleTab}
          className="p-2.5 rounded-xl border-2 border-purple-500/60 bg-stone-900/90 hover:bg-stone-800 text-purple-300 font-bold text-xs flex items-center gap-1 transition shadow-lg"
          title="按 TAB 鍵開啟全隊物品欄"
        >
          <Users className="w-4 h-4" />
          <span>全隊 (TAB)</span>
        </button>
      </div>
    </>
  );
};
