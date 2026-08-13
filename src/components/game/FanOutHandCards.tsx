"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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

  // 尚未放置在場景上的手牌單位 (PLAYER 陣營且 x < 0 或 y < 0)
  const unplacedUnits = units.filter((u) => u.faction === "PLAYER" && !u.isDead && (u.x < 0 || u.y < 0));

  const [draggingUnit, setDraggingUnit] = useState<BattleUnit | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringAmbush, setIsHoveringAmbush] = useState<boolean>(false);

  // 1. GSAP 登場與扇形展開動畫
  useEffect(() => {
    if (phase !== "DEPLOYMENT" || unplacedUnits.length === 0) return;

    const cards = cardsRef.current.filter(Boolean);
    if (cards.length === 0) return;

    gsap.killTweensOf(cards);
    gsap.set(cards, { y: 120, opacity: 0, scale: 0.8 });

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
        duration: 0.45,
        delay: idx * 0.05,
        ease: "back.out(1.4)",
      });
    });
  }, [phase, unplacedUnits.length]);

  // 2. 全局 Window 拖拽監聽器 (解決滑鼠離開手牌區域導致無法丟牌放下的 Bug)
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    setDragPos({ x: e.clientX, y: e.clientY });

    // 即時檢測是否懸停於草叢伏擊區
    const normX = e.clientX / window.innerWidth;
    const normY = e.clientY / window.innerHeight;
    const inAmbush = regions.some(
      (r) => r.type === "AMBUSH" && isPointInPolygon({ x: normX, y: normY }, r.points)
    );
    setIsHoveringAmbush(inAmbush);
  }, [regions]);

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (!draggingUnit) return;

    const dropX = e.clientX;
    const dropY = e.clientY;
    const normX = Number((dropX / window.innerWidth).toFixed(3));
    const normY = Number((dropY / window.innerHeight).toFixed(3));

    // 只要放下的位置高於手牌欄 (normY < 0.80)，或者位於戰場多邊形區域內，即判定成功放置！
    const validRegion = regions.find((r) =>
      r.type !== "AIR_WALL" && isPointInPolygon({ x: normX, y: normY }, r.points)
    );

    if (validRegion || normY < 0.80) {
      const finalY = Math.max(0.18, Math.min(0.85, normY));
      onPlaceUnit(draggingUnit.instanceId, normX, finalY);
    }

    // 重置拖拽狀態
    setDraggingUnit(null);
    setDragPos(null);
    setIsHoveringAmbush(false);
    document.body.style.cursor = "";
  }, [draggingUnit, regions, onPlaceUnit]);

  useEffect(() => {
    if (draggingUnit) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      document.body.style.cursor = "grabbing";
    } else {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      document.body.style.cursor = "";
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      document.body.style.cursor = "";
    };
  }, [draggingUnit, handleGlobalMouseMove, handleGlobalMouseUp]);

  if (phase !== "DEPLOYMENT") return null;

  // 滑鼠懸停手牌動效
  const handleMouseEnter = (idx: number, cardEl: HTMLDivElement) => {
    if (draggingUnit) return;
    gsap.to(cardEl, {
      y: -32,
      scale: 1.18,
      rotation: 0,
      zIndex: 100,
      boxShadow: "0 0 25px rgba(245, 158, 11, 0.7)",
      duration: 0.2,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = (idx: number, cardEl: HTMLDivElement) => {
    if (draggingUnit) return;
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
      duration: 0.2,
      ease: "power2.out",
    });
  };

  // 點擊手牌開始拖拽
  const handleMouseDown = (unit: BattleUnit, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingUnit(unit);
    setSelectedUnitId(unit.instanceId);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-end justify-center pb-6 overflow-hidden select-none">
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

          const isBeingDragged = draggingUnit?.instanceId === unit.instanceId;

          return (
            <div
              key={unit.instanceId}
              ref={(el) => { cardsRef.current[idx] = el; }}
              onMouseEnter={(e) => handleMouseEnter(idx, e.currentTarget)}
              onMouseLeave={(e) => handleMouseLeave(idx, e.currentTarget)}
              onMouseDown={(e) => handleMouseDown(unit, e)}
              className={`absolute bottom-0 w-32 h-44 rounded-2xl border-2 bg-stone-950/95 p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all select-none ${
                qualityBorders[quality] || qualityBorders["靈"]
              } ${isBeingDragged ? "opacity-30 scale-90" : "opacity-100"}`}
              style={{
                background: "linear-gradient(180deg, rgba(24,19,15,0.98), rgba(9,9,11,0.95))",
                transformOrigin: "bottom center",
              }}
            >
              {/* 頂部陣營與品質標籤 */}
              <div className="flex items-center justify-between text-[10px] font-bold border-b border-stone-800 pb-1">
                <span className="text-amber-300 font-serif-title">{unit.heroConfig.faction}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  {quality}階
                </span>
              </div>

              {/* 中央立繪 */}
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

              {/* 底部名稱 */}
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

      {/* 60fps 全局高流暢度拖拽跟隨 Preview + 登場陣芒亮圈 */}
      {draggingUnit && dragPos && (
        <>
          {/* 戰場地面降臨陣芒亮圈 */}
          <div
            className={`fixed pointer-events-none z-40 -translate-x-1/2 -translate-y-1/2 w-32 h-14 rounded-full border-2 transition-all duration-150 ${
              isHoveringAmbush
                ? "border-emerald-400 bg-emerald-500/30 shadow-[0_0_35px_rgba(34,197,94,0.9)]"
                : "border-amber-400 bg-amber-500/25 shadow-[0_0_30px_rgba(245,158,11,0.8)]"
            }`}
            style={{ left: dragPos.x, top: dragPos.y }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-amber-200 animate-pulse">
              {isHoveringAmbush ? "🌿 草叢伏擊區" : "✨ 松手登場"}
            </div>
          </div>

          {/* 手中跟隨的卡牌 Preview (帶 3D 懸浮傾斜感) */}
          <div
            className={`fixed pointer-events-none z-50 w-36 h-48 -translate-x-1/2 -translate-y-full rounded-2xl border-2 bg-stone-950/95 p-2.5 flex flex-col justify-between shadow-2xl transition-transform duration-75 ${
              isHoveringAmbush ? "border-emerald-400 shadow-[0_0_45px_rgba(34,197,94,0.9)]" : "border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.8)]"
            }`}
            style={{ left: dragPos.x, top: dragPos.y - 10 }}
          >
            <div className="flex items-center justify-between text-[11px] font-bold border-b border-amber-500/40 pb-1 text-amber-300 font-serif-title">
              <span>{draggingUnit.heroConfig.name}</span>
              <span className="text-[10px] text-emerald-300">拖拽布陣中</span>
            </div>

            <div className="relative flex-1 my-1 overflow-hidden rounded-lg bg-stone-900 flex items-center justify-center">
              {/* eslint-disable-next-html-element-fallback */}
              <img
                src={draggingUnit.heroConfig.imagePath}
                alt={draggingUnit.heroConfig.name}
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="text-center text-[10px] text-emerald-300 font-bold font-serif-title">
              {isHoveringAmbush ? "🌿 觸發神箭伏擊！" : "📍 松手直接登場"}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
