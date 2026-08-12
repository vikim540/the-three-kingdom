"use client";

import React, { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { MAP_SIZE, TILE_SIZE } from "./config/constants";

export const PhaserGameContent: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const canvasWidth = MAP_SIZE * TILE_SIZE; // 512px
    const canvasHeight = MAP_SIZE * TILE_SIZE; // 512px

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: canvasWidth,
      height: canvasHeight,
      parent: containerRef.current,
      backgroundColor: "#0d0f17",
      scene: [BootScene, BattleScene],
      physics: {
        default: "arcade",
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center p-3 rounded-2xl bg-slate-900/80 border-2 border-amber-500/30 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
      <div ref={containerRef} className="w-[512px] h-[512px] rounded-xl overflow-hidden shadow-inner" />
    </div>
  );
};

export default PhaserGameContent;
