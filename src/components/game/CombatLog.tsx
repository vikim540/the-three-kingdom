"use client";

import React from "react";
import { useBattleStore } from "@/stores/useBattleStore";
import { Scroll, Terminal } from "lucide-react";

export const CombatLog: React.FC = () => {
  const { combatLogs } = useBattleStore();

  return (
    <div className="w-full h-full max-h-[512px] flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
      {/* 標頭 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-amber-400 font-bold text-sm">
        <Terminal className="w-4 h-4 text-amber-400" />
        <span>修仙戰鬥日誌</span>
      </div>

      {/* 日誌內容列表 */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5 font-mono text-xs">
        {combatLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
            <Scroll className="w-8 h-8 opacity-40" />
            <span>布陣完畢後，點擊「開始戰鬥」觀看戰鬥過程</span>
          </div>
        ) : (
          combatLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-lg border leading-relaxed transition-all ${
                log.type === "skill"
                  ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                  : log.type === "damage"
                  ? "bg-red-950/30 border-red-500/30 text-red-200"
                  : log.type === "rout"
                  ? "bg-purple-950/30 border-purple-500/30 text-purple-200"
                  : log.type === "victory"
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold"
                  : "bg-slate-950/40 border-slate-800 text-slate-300"
              }`}
            >
              <span className="text-[10px] opacity-60 mr-2">[{log.timestamp}]</span>
              {log.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
