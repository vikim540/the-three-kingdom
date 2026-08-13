"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/useGameStore";
import { Sparkles, Play, FolderOpen, Upload, BookOpen, Compass, Award } from "lucide-react";

export default function MainMenuPage() {
  const router = useRouter();
  const { setStoryStep, resetGame } = useGameStore();
  const [hasSave, setHasSave] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  useEffect(() => {
    // 檢查是否有歷史修仙存檔
    fetch("/api/save")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.save) {
          setHasSave(true);
        }
      })
      .catch((err) => console.error("檢查存檔時發生錯誤:", err));
  }, []);

  const handleStartNewGame = async () => {
    setIsStarting(true);
    resetGame();
    try {
      await fetch("/api/save", { method: "DELETE" });
    } catch (err) {
      console.error("重置存檔失敗:", err);
    }
    setStoryStep("INTRO");
    router.push("/game");
  };

  const handleContinueGame = () => {
    router.push("/game");
  };

  const handleImportSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        if (jsonContent.selectedHeroId) {
          await fetch("/api/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonContent),
          });
          alert("✅ 存檔匯入成功！即將進入修仙戰場...");
          router.push("/game");
        } else {
          alert("❌ 存檔格式無效");
        }
      } catch (err) {
        console.error(err);
        alert("❌ 無法解析存檔檔案");
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black overflow-hidden select-none">
      {/* 背景修仙靈光陣 */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none animate-pulse" />

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* 遊戲頂部徽章 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-6 tracking-widest">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>【黑風山谷 · 降魔篇】</span>
        </div>

        {/* 水墨書法大標題 */}
        <h1 className="text-5xl md:text-6xl font-black font-serif-title tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.4)] mb-4">
          三國修仙傳
        </h1>
        <p className="text-xs md:text-sm text-stone-300 max-w-lg mx-auto mb-10 leading-relaxed font-serif-title">
          水墨寫意 • 回合布陣 • 靈導名將渡劫伏魔！
        </p>

        {/* 選單按鈕區 */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto mb-8">
          <button
            onClick={handleStartNewGame}
            disabled={isStarting}
            className="w-full py-4 rounded-xl font-bold font-serif-title text-zinc-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:shadow-[0_0_35px_rgba(245,158,11,0.8)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 text-base tracking-widest disabled:opacity-50"
          >
            {isStarting ? (
              <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
            <span>{isStarting ? "開啟靈光陣..." : "踏入修仙界"}</span>
          </button>

          {hasSave && (
            <button
              onClick={handleContinueGame}
              className="w-full py-3.5 rounded-xl font-bold font-serif-title text-amber-300 bg-zinc-900/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-800/90 transition-all flex items-center justify-center gap-2 text-sm shadow-md tracking-wider"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>重返修仙戰場</span>
            </button>
          )}

          <label className="w-full py-3.5 rounded-xl font-semibold text-stone-300 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-md">
            <Upload className="w-4 h-4 text-stone-400" />
            <span>載入仙印存檔</span>
            <input type="file" accept=".json" onChange={handleImportSave} className="hidden" />
          </label>

          <button
            onClick={() => setShowGuide(true)}
            className="w-full py-3.5 rounded-xl font-semibold text-stone-400 hover:text-stone-200 transition flex items-center justify-center gap-2 text-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>修仙心法與伏魔要訣</span>
          </button>
        </div>

        {/* 頁尾版本 */}
        <div className="text-xs text-stone-500 font-serif-title tracking-widest">
          三國修仙傳 • 第一章【山谷遭遇戰】
        </div>
      </div>

      {/* 玩法說明 Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-lg w-full rounded-2xl p-6 border border-amber-500/40 bg-zinc-900 text-left">
            <h3 className="text-xl font-bold font-serif-title text-amber-300 mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" />
              <span>伏魔要訣與名將心法</span>
            </h3>

            <div className="space-y-4 text-xs text-stone-300 leading-relaxed">
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30">
                <h4 className="font-bold text-amber-300 mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎯 黃忠草叢伏擊心法</span>
                </h4>
                <p>將黃忠部署在側翼草叢即可進入「伏擊」形態。配合主角【假逃誘敵】，當敵首【獨眼寨主】進入射程時，即觸發神箭秒殺敵首！</p>
              </div>

              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30">
                <h4 className="font-bold text-blue-300 mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  <span>🛡️ 夏侯惇鐵血防禦心法</span>
                </h4>
                <p>夏侯惇與主角相鄰時自動觸發「鐵血援護」，享有 40% 傷害豁免與反擊推進。</p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full py-2.5 rounded-xl font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 transition text-xs"
            >
              領悟，返回主選單
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
