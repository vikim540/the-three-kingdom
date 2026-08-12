"use client";

import React, { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";

interface PhaserGameContentProps {
  onSceneReady?: () => void;
}

export const PhaserGameContent: React.FC<PhaserGameContentProps> = ({ onSceneReady }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: container,
      backgroundColor: "#09090b",
      scene: [BootScene, BattleScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: "100%",
        height: "100%",
      },
      callbacks: {
        postBoot: () => {
          onSceneReady?.();
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    const handleResize = () => {
      gameRef.current?.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (container) container.innerHTML = "";
    };
  }, [onSceneReady]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full"
    />
  );
};

export default PhaserGameContent;
