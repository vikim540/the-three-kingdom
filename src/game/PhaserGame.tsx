"use client";

import React, { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from "./config/constants";

export const PhaserGameContent: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current) return;

    const canvasWidth = MAP_COLS * TILE_SIZE; // 288px
    const canvasHeight = MAP_ROWS * TILE_SIZE; // 720px

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: canvasWidth,
      height: canvasHeight,
      parent: container,
      backgroundColor: "#09090b",
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
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center p-2 rounded-2xl bg-zinc-900/90 border-2 border-amber-500/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
      <div ref={containerRef} className="w-[288px] h-[720px] rounded-xl overflow-hidden shadow-inner" />
    </div>
  );
};

export default PhaserGameContent;
