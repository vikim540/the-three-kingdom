"use client";

import React, { useState, useEffect, useRef } from "react";

interface NarrativeLine {
  text: string;
  speaker?: string;
  type: "narration" | "dialogue" | "title";
  delay?: number;
}

const INTRO_SCRIPT: NarrativeLine[] = [
  { type: "title", text: "第一章・黑風山谷" },
  { type: "narration", text: "漢末，天下大亂，修仙道統式微，群雄割據爭鳴。", delay: 100 },
  { type: "narration", text: "荒野之中，一隊山賊盤踞黑風山谷，截殺過路商旅，無惡不作。", delay: 80 },
  { type: "narration", text: "靈宵天尊奉命入谷，胸懷制魔伏邪之念，踏入叢林深處……", delay: 80 },
  { type: "dialogue", speaker: "黑風嘍囉", text: "哇！有人闖山！給老子攔住！攔住！", delay: 60 },
  { type: "dialogue", speaker: "靈宵天尊", text: "哼，雕蟲小技——黃老將軍，可準備好了？", delay: 60 },
  { type: "dialogue", speaker: "黃忠", text: "老夫百步穿楊，從未失手！", delay: 60 },
  { type: "narration", text: "命運的棋局，即將由你展開……", delay: 100 },
];

interface IntroNarrationProps {
  onComplete: () => void;
}

export const IntroNarration: React.FC<IntroNarrationProps> = ({ onComplete }) => {
  const [currentLine, setCurrentLine] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [linesDone, setLinesDone] = useState<NarrativeLine[]>([]);
  const [showSkip, setShowSkip] = useState(false);
  const typeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lineTimerRef = useRef<NodeJS.Timeout | null>(null);

  const line = INTRO_SCRIPT[currentLine];

  // Typewriter effect
  useEffect(() => {
    if (!line) return;
    setIsTyping(true);
    setDisplayedText("");
    let i = 0;

    const speed = line.type === "title" ? 60 : 35;

    const tick = () => {
      if (i < line.text.length) {
        setDisplayedText(line.text.slice(0, i + 1));
        i++;
        typeTimerRef.current = setTimeout(tick, speed);
      } else {
        setIsTyping(false);
        // Auto-advance after a pause
        lineTimerRef.current = setTimeout(() => {
          advanceLine();
        }, line.type === "title" ? 1800 : 1200);
      }
    };
    tick();

    // Show skip hint after 1s
    const skipTimer = setTimeout(() => setShowSkip(true), 1000);

    return () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      if (lineTimerRef.current) clearTimeout(lineTimerRef.current);
      clearTimeout(skipTimer);
    };
  }, [currentLine]);

  const advanceLine = () => {
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    if (lineTimerRef.current) clearTimeout(lineTimerRef.current);

    if (isTyping) {
      // If still typing, complete the line immediately
      setDisplayedText(line.text);
      setIsTyping(false);
      lineTimerRef.current = setTimeout(advanceLine, 800);
      return;
    }

    if (currentLine + 1 >= INTRO_SCRIPT.length) {
      onComplete();
    } else {
      setLinesDone((prev) => [...prev, line]);
      setCurrentLine((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    if (lineTimerRef.current) clearTimeout(lineTimerRef.current);
    onComplete();
  };

  if (!line) return null;

  const isTitle = line.type === "title";

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-end pb-16 cursor-pointer select-none"
      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)" }}
      onClick={advanceLine}
    >
      {/* Chapter Title */}
      {isTitle && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs tracking-[0.5em] text-amber-400/70 mb-3 font-serif-title">三國修仙傳</div>
            <h2
              className="text-5xl md:text-6xl font-black font-serif-title tracking-widest text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #fef3c7, #f59e0b, #d97706)" }}
            >
              {displayedText}
            </h2>
            <div className="mt-4 w-24 h-0.5 mx-auto bg-amber-400/40" />
          </div>
        </div>
      )}

      {/* Previous lines (faded) */}
      {!isTitle && (
        <div className="w-full max-w-2xl px-8 space-y-2 mb-4">
          {linesDone.slice(-3).map((l, i) => (
            <div key={i} className={`text-center opacity-${i === linesDone.length - 1 ? "30" : "15"} transition-opacity`}>
              {l.type === "dialogue" && l.speaker && (
                <span className="text-amber-400/40 text-xs mr-2 font-serif-title">【{l.speaker}】</span>
              )}
              <span className="text-stone-400 text-xs font-serif-title">{l.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Current line */}
      {!isTitle && (
        <div className="w-full max-w-2xl px-8 py-5 text-center">
          {line.type === "dialogue" && line.speaker && (
            <div className="text-amber-300 text-sm font-bold font-serif-title mb-2 tracking-wider">
              ——【{line.speaker}】
            </div>
          )}
          <p
            className={`font-serif-title leading-loose ${
              line.type === "narration"
                ? "text-stone-200 text-base md:text-lg italic"
                : "text-amber-100 text-lg md:text-xl font-semibold"
            }`}
          >
            {displayedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-5 bg-amber-400 ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-4 mb-2">
        {INTRO_SCRIPT.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i < currentLine
                ? "bg-amber-400"
                : i === currentLine
                ? "bg-amber-300 scale-125"
                : "bg-stone-600"
            }`}
          />
        ))}
      </div>

      {/* Tap to continue hint */}
      {!isTyping && !isTitle && (
        <div className="text-stone-500 text-xs font-serif-title tracking-widest animate-pulse mt-1">
          點擊繼續 ▶
        </div>
      )}

      {/* Skip button */}
      {showSkip && (
        <button
          onClick={(e) => { e.stopPropagation(); handleSkip(); }}
          className="absolute top-6 right-6 px-3 py-1.5 rounded-lg text-xs text-stone-400 bg-black/40 border border-stone-700/50 hover:text-stone-200 hover:border-stone-500 transition font-serif-title"
        >
          跳過序章 ▶▶
        </button>
      )}
    </div>
  );
};
