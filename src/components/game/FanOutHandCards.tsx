"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useBattleStore } from "@/stores/useBattleStore";
import { useDevStore } from "@/stores/useDevStore";
import { isPointInPolygon } from "@/types/region";
import { BattleUnit } from "@/types/game";

interface FanOutHandCardsProps {
  onPlaceUnit: (unitInstanceId: string, normX: number, normY: number) => void;
}

export const FanOutHandCards: React.FC<FanOutHandCardsProps> = ({ onPlaceUnit }) => {
  const { phase, units, setSelectedUnitId } = useBattleStore();
  const { regions } = useDevStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // 尚未放置在場景上的手牌單位 (PLAYER 陣營)
  const unplacedUnits = units.filter((u) => u.faction === "PLAYER" && !u.isDead);

  const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  // 1. 登場 GSAP 扇形展開動畫
  useEffect(() => {
    if (phase !== "DEPLOYMENT" || unplacedUnits.length === 0) return;

    const cards = cardsRef.current.filter(Boolean);
    if (cards.length === 0) return;

    // 清除既有動畫
    gsap.killTweensOf(cards);

    // 初始隱藏於下方
    gsap.set(cards, { y: 120, opacity: 0, scale: 0.8 });

    // GSAP 彈出並扇形展開
    const count = cards.length;
    cards.forEach((card, idx) => {
      const angle = count > 1 ? -12 + (idx / (count - 1)) * 24 : 0;
      const xOffset = count > 1 ? -40 + (idx / (count - 1)) * 80 : 0;

      gsap.to(card, {
        y: 0,
        x: xOffset,
        rotation: angle,
        opacity: 1,
        scale: 1,
        duration: 0.55,
        delay: idx * 0.06,
        ease: "back.out(1.5)",
      });
    });
  }, [phase, unplacedUnits.length]);

  if (phase !== "DEPLOYMENT") return null;

  // 滑鼠懸停動畫
  const handleMouseEnter = (idx: number, cardEl: HTMLDivElement) => {
    if (draggingUnitId) return;
    gsap.to(cardEl, {
      y: -28,
      scale: 1.15,
      rotation: 0,
      zIndex: 100,
      boxShadow: "0 0 25px rgba(245, 158, 11, 0.6)",
      duration: 0.22,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = (idx: number, cardEl: HTMLDivElement) => {
    if (draggingUnitId) return;
    const count = unplacedUnits.length;
    const angle = count > 1 ? -12 + (idx / (count - 1)) * 24 : 0;
    const xOffset = count > 1 ? -40 + (idx / (count - 1)) * 80 : 0;

    gsap.to(cardEl, {
      y: 0,
      x: xOffset,
      rotation: angle,
      scale: 1,
      zIndex: idx + 1,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
      duration: 0.25,
      ease: "power2.out",
    });
  };

  // 拖拽開始
  const handleMouseDown = (unit: BattleUnit, e: React.MouseEvent) => {
    setDraggingUnitId(unit.instanceId);
    setSelectedUnitId(unit.instanceId);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  // 拖拽移動
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingUnitId) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  // 拖拽結束
  const handleMouseUp = () => {
    if (!draggingUnitId || !dragPos) {
      setDraggingUnitId(null);
      setDragPos(null);
      return;
    }

    const normX = dragPos.x / window.innerWidth;
    const normY = dragPos.y / window.innerHeight;

    // 檢查放置目標是否在合法 PLAYER_SPAWN 或 AMBUSH 多邊形區域內
    const validRegion = regions.find((r) =>
      (r.type === "PLAYER_SPAWN" || r.type === "AMBUSH") && isPointInPolygon({ x: normX, y: normY }, r.points)
    );

    if (validRegion) {
      onPlaceUnit(draggingUnitId, normX, normY);
    }

    setDraggingUnitId(null);
    setDragPos(null);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 pointer-events-none z-30 flex items-end justify-center pb-6 overflow-hidden"
    >
      {/* 底部扇形手牌容器 */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center pointer-events-auto h-44"
      >
        {unplacedUnits.map((unit, idx) => {
          const isHuangZhong = unit.heroConfig.id === "hero_huang_zhong";
          const quality = unit.heroConfig.quality || "靈";

          const qualityBorders: Record<string, string> = {
            仙: "border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.5)]",
            帝: "border-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.5)]",
            王: "border-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.5)]",
            靈: "border-emerald-400 shadow-[0_0_18px_rgba(34,197,94,0.5)]",
            凡: "border-slate-400",
          };

          return (
            <div
              key={unit.instanceId}
              ref={(el) => { cardsRef.current[idx] = el; }}
              onMouseEnter={(e) => handleMouseEnter(idx, e.currentTarget)}
              onMouseLeave={(e) => handleMouseLeave(idx, e.currentTarget)}
              onMouseDown={(e) => handleMouseDown(unit, e)}
              className={`absolute bottom-0 w-32 h-44 rounded-2xl border-2 bg-stone-950/95 p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-shadow select-none ${
                qualityBorders[quality] || qualityBorders["靈"]
              }`}
              style={{
                background: "linear-gradient(180deg, rgba(24,19,15,0.98), rgba(9,9,11,0.95))",
                transformOrigin: "bottom center",
              }}
            >
              {/* 頂部品質與陣營標籤 */}
              <div className="flex items-center justify-between text-[10px] font-bold border-b border-stone-800 pb-1">
                <span className="text-amber-300 font-serif-title">{unit.heroConfig.faction}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  {quality}階
                </span>
              </div>

              {/* 中央立繪圖片 */}
              <div className="relative flex-1 my-1 overflow-hidden rounded-lg bg-stone-900 flex items-center justify-center border border-stone-800">
                {/* eslint-disable-next-html-element-fallback */}
                <img
                  src={unit.heroConfig.imagePath}
                  alt={unit.heroConfig.name}
                  className="w-full h-full object-cover object-top"
                />
                {isHuangZhong && (
                  <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[9px] font-bold">
                    🏹 伏擊
                  </div>
                )}
              </div>

              {/* 底部名字與稱號 */}
              <div className="text-center pt-1 border-t border-stone-800">
                <div className="text-xs font-bold text-amber-200 font-serif-title">
                  {unit.heroConfig.name}
                </div>
                <div className="text-[9px] text-stone-400 leading-tight">
                  {unit.heroConfig.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 拖拽跟隨中的浮動卡牌 */}
      {draggingUnitId && dragPos && (
        <div
          className="fixed pointer-events-none z-50 w-28 h-36 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-amber-400 bg-stone-950/90 shadow-[0_0_30px_rgba(245,158,11,0.8)] p-2 flex flex-col justify-between"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <div className="text-center text-xs font-bold text-amber-300 font-serif-title">
            放置中...
          </div>
          <div className="text-[10px] text-center text-emerald-300 animate-pulse">
            移至藍色/綠色區域放下
          </div>
        </div>
      )}
    </div>
  );
};
