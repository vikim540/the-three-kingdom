"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, FastForward } from "lucide-react";

interface StoryDialogProps {
  onComplete: () => void;
}

const STORY_STEPS = [
  {
    speaker: "天道秘語",
    avatar: "🌌",
    text: "天道裂變，九霄雲動！你自異界穿越而來，神魂落入這個『三國名將皆修仙』的洪荒大世界...",
  },
  {
    speaker: "靈宵天尊（主角）",
    avatar: "⚔️",
    text: "這裡竟是黑風山谷？修仙靈氣極其充沛，但我尚未掌握高階仙術，若遭遇魔道散修劫匪...",
  },
  {
    speaker: "天道秘語",
    avatar: "📜",
    text: "莫慌！天命神魂已為你開啟『三國英魂召喚台』！首次召喚即可引導一位絕世名將降世輔佐！",
  },
];

export const StoryDialog: React.FC<StoryDialogProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const currentStep = STORY_STEPS[currentStepIndex];

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      if (index < currentStep.text.length) {
        setDisplayedText(currentStep.text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [currentStepIndex, currentStep.text]);

  const handleNext = () => {
    if (displayedText.length < currentStep.text.length) {
      setDisplayedText(currentStep.text);
      return;
    }
    if (currentStepIndex < STORY_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        onClick={handleNext}
        className="w-full max-w-4xl cursor-pointer rounded-2xl p-6 md:p-8 border border-amber-500/40 bg-slate-900/95 shadow-[0_0_40px_rgba(234,179,8,0.25)] transition-all hover:border-amber-400"
      >
        {/* 說話者標頭與跳過按鈕 */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-black/40 border border-amber-500/30">
              {currentStep.avatar}
            </span>
            <div>
              <h3 className="text-lg font-bold text-amber-300">{currentStep.speaker}</h3>
              <p className="text-xs text-amber-400/60">第一章 • 異世降臨</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 跳過劇情按鈕 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              title="直接跳過劇情並開啟名將召喚"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>跳過劇情</span>
            </button>

            <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              ({currentStepIndex + 1}/{STORY_STEPS.length})
            </span>
          </div>
        </div>

        {/* 劇情內文 */}
        <div className="min-h-[4rem] text-base md:text-lg text-slate-100 font-medium leading-relaxed tracking-wide">
          {displayedText}
          {displayedText.length < currentStep.text.length && (
            <span className="inline-block w-2 h-5 ml-1 bg-amber-400 animate-pulse" />
          )}
        </div>

        {/* 提示箭頭與按鈕區 */}
        <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400">點擊對話框任意處可加快打字...</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-sm font-semibold transition"
          >
            <span>{currentStepIndex === STORY_STEPS.length - 1 ? "開啟名將召喚" : "下一步"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
