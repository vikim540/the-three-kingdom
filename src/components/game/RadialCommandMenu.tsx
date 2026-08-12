"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { TacticalActionType } from "@/types/game";

interface RadialCommandMenuProps {
  x: number; // screen pixel X
  y: number; // screen pixel Y
  isInAmbushRegion: boolean;
  onSelectAction: (action: TacticalActionType) => void;
  onClose: () => void;
}

export const RadialCommandMenu: React.FC<RadialCommandMenuProps> = ({
  x,
  y,
  isInAmbushRegion,
  onSelectAction,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const options: { action: TacticalActionType; label: string; icon: string; enabled: boolean; tooltip?: string }[] = [
    { action: "SELECT", label: "待機", icon: "🛡️", enabled: true },
    {
      action: "SKILL",
      label: "埋伏",
      icon: "🏹",
      enabled: isInAmbushRegion,
      tooltip: isInAmbushRegion ? "草叢伏擊爆頭敵首！" : "需在草叢埋伏區才可用",
    },
    { action: "ATTACK", label: "攻擊", icon: "⚔️", enabled: true },
    { action: "FLEE", label: "逃跑", icon: "🏃", enabled: true },
  ];

  // 1. GSAP 登場縮放 + 扇形彈出動畫
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const items = itemsRef.current.filter(Boolean);

    gsap.set(container, { scale: 0, opacity: 0 });
    gsap.to(container, {
      scale: 1,
      opacity: 1,
      duration: 0.35,
      ease: "back.out(1.7)",
    });

    // 扇形按鈕彈出 (順時針 4 個方向)
    const radius = 64;
    items.forEach((item, idx) => {
      // 從右上 ~ 右下弧度 -45deg 到 +135deg
      const angleDeg = -45 + idx * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const targetX = Math.cos(angleRad) * radius;
      const targetY = Math.sin(angleRad) * radius;

      gsap.fromTo(
        item,
        { x: 0, y: 0, scale: 0, opacity: 0 },
        {
          x: targetX,
          y: targetY,
          scale: 1,
          opacity: 1,
          duration: 0.3,
          delay: idx * 0.05 + 0.1,
          ease: "back.out(1.6)",
        }
      );
    });
  }, []);

  const handleExecute = (action: TacticalActionType, enabled: boolean) => {
    if (!enabled) return;
    // GSAP 收回動畫
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          onSelectAction(action);
          onClose();
        },
      });
    } else {
      onSelectAction(action);
      onClose();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 pointer-events-auto"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    >
      {/* 核心圓環底盤 */}
      <div className="relative w-12 h-12 rounded-full border-2 border-amber-400 bg-stone-950/90 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center">
        <span className="text-amber-300 font-bold text-xs animate-pulse">指令</span>

        {/* 順時針扇形按鈕 */}
        {options.map((opt, idx) => (
          <button
            key={opt.action}
            ref={(el) => { itemsRef.current[idx] = el; }}
            disabled={!opt.enabled}
            onClick={() => handleExecute(opt.action, opt.enabled)}
            title={opt.tooltip || opt.label}
            className={`absolute top-0 left-0 w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center shadow-lg transition-all ${
              opt.enabled
                ? "border-amber-400/80 bg-stone-900 text-stone-100 hover:scale-115 hover:border-amber-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.8)] active:scale-95"
                : "border-stone-800 bg-stone-950 text-stone-600 opacity-40 cursor-not-allowed"
            }`}
          >
            <span className="text-sm leading-none">{opt.icon}</span>
            <span className="text-[9px] font-bold mt-0.5 leading-none">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
