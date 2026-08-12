"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGameStore, StoryStep } from "@/stores/useGameStore";
import { useBattleStore } from "@/stores/useBattleStore";
import { StoryDialog } from "@/components/game/StoryDialog";
import { SummonModal } from "@/components/game/SummonModal";
import { InGameHUD } from "@/components/game/InGameHUD";
import { BattleResultModal } from "@/components/game/BattleResultModal";
import { HeroConfig } from "@/types/hero";
import { BattleUnit, TacticalActionType } from "@/types/game";
import { STAGE_1_BANDIT } from "@/game/config/stages";
import {
  PROTAGONIST_HERO,
  SUMMONABLE_HEROES,
  ENEMY_BANDIT_CHIEF,
  ENEMY_BANDIT_THUG,
} from "@/game/config/heroes";
import { executeBattleStep } from "@/game/systems/CombatSystem";

// Phaser 全螢幕 Canvas（fixed inset-0）
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="text-4xl animate-bounce">⚔️</div>
      <div className="text-amber-400 font-bold font-serif-title text-xl tracking-widest animate-pulse">
        黑風山谷 正在顯現...
      </div>
    </div>
  ),
});

export default function GamePage() {
  const router = useRouter();
  const { storyStep, selectedHeroId, setStoryStep, setSelectedHeroId } = useGameStore();
  const {
    units, setPhase, setUnits, setActiveAction,
    addCombatLog, setReward, setTacticalOutcome, resetBattle,
  } = useBattleStore();

  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const buildUnit = (id: string, heroId: string, faction: "PLAYER" | "ENEMY", x: number, y: number): BattleUnit => {
    const heroConfigs: Record<string, typeof PROTAGONIST_HERO> = {
      hero_protagonist: PROTAGONIST_HERO,
      hero_huang_zhong: SUMMONABLE_HEROES.find((h) => h.id === "hero_huang_zhong")!,
      hero_xiahou_dun: SUMMONABLE_HEROES.find((h) => h.id === "hero_xiahou_dun")!,
      hero_zhao_yun: SUMMONABLE_HEROES.find((h) => h.id === "hero_zhao_yun")!,
      hero_guo_jia: SUMMONABLE_HEROES.find((h) => h.id === "hero_guo_jia")!,
      enemy_bandit_chief: ENEMY_BANDIT_CHIEF,
      enemy_bandit_thug: ENEMY_BANDIT_THUG,
    };
    const cfg = heroConfigs[heroId] || PROTAGONIST_HERO;
    return {
      instanceId: id,
      heroConfig: cfg,
      faction,
      x, y,
      currentHp: cfg.baseStats.hp,
      maxHp: cfg.baseStats.hp,
      atk: cfg.baseStats.atk,
      def: cfg.baseStats.def,
      speed: cfg.baseStats.speed,
      moveRange: cfg.baseStats.moveRange,
      attackRange: cfg.baseStats.attackRange,
      statusEffects: [],
      hasActedThisTurn: false,
      isDead: false,
    };
  };

  const initBattleUnits = useCallback(() => {
    const heroId = selectedHeroId || SUMMONABLE_HEROES[0].id;
    const playerUnits = [
      buildUnit("u_protagonist", "hero_protagonist", "PLAYER", STAGE_1_BANDIT.playerSpawnTiles[0].x, STAGE_1_BANDIT.playerSpawnTiles[0].y),
      buildUnit(`u_${heroId}`, heroId, "PLAYER", STAGE_1_BANDIT.playerSpawnTiles[1].x, STAGE_1_BANDIT.playerSpawnTiles[1].y),
    ];
    const enemyUnits = STAGE_1_BANDIT.enemies.map((e, i) =>
      buildUnit(`enemy_${i}`, e.heroId, "ENEMY", e.x, e.y)
    );
    setUnits([...playerUnits, ...enemyUnits]);
    setPhase("DEPLOYMENT");
  }, [selectedHeroId, setUnits, setPhase]);

  // 載入存檔
  useEffect(() => {
    fetch("/api/save")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.save) {
          if (data.save.selectedHeroId) setSelectedHeroId(data.save.selectedHeroId);
          if (data.save.storyStep) setStoryStep(data.save.storyStep as StoryStep);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setSelectedHeroId, setStoryStep]);

  useEffect(() => {
    if (storyStep === "BATTLE" && units.length === 0) initBattleUnits();
  }, [storyStep, units.length, initBattleUnits]);

  const handleConfirmSummon = async (hero: HeroConfig) => {
    setSelectedHeroId(hero.id);
    setStoryStep("BATTLE");
    await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedHeroId: hero.id, storyStep: "BATTLE", gameData: {} }),
    });
  };

  const handleStartBattle = () => {
    setPhase("BATTLE_IN_PROGRESS");
    addCombatLog("⚔️ 兩軍交鋒！黑風山谷之戰開始！", "info");
    runBattleLoop();
  };

  const handleBaitAction = () => {
    addCombatLog("🏹 黃忠蟄伏草叢，主角施展假逃誘敵之計！", "skill");
    handleStartBattle();
  };

  const handleExecuteAction = (action: TacticalActionType) => {
    setActiveAction(action);
    if (action === "ITEM") {
      addCombatLog("🧪 服用紫霄丹，恢復 50 生命！", "skill");
      setUnits(units.map((u) =>
        u.faction === "PLAYER" && !u.isDead
          ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + 50) }
          : u
      ));
    } else if (action === "FLEE") {
      addCombatLog("🏃 向逃生法陣撤退！", "info");
      handleStartBattle();
    }
  };

  const handleExportSave = () => {
    const blob = new Blob([JSON.stringify({ selectedHeroId, storyStep, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sgxian_save_${Date.now()}.json`;
    a.click();
  };

  const runBattleLoop = () => {
    let turn = 1;
    const interval = setInterval(() => {
      const currentUnits = useBattleStore.getState().units;
      const result = executeBattleStep(currentUnits, turn);
      result.logs.forEach((l) => addCombatLog(l.text, l.type));
      setUnits(result.updatedUnits);
      if (result.isFinished || turn >= 15) {
        clearInterval(interval);
        if (result.outcome) setTacticalOutcome(result.outcome);
        if (result.reward) {
          setReward(result.reward);
          setPhase("VICTORY");
          setStoryStep("COMPLETED");
        } else {
          setPhase("DEFEAT");
        }
      }
      turn++;
    }, 1000);
  };

  // ── 載入畫面 ──
  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl animate-spin">☯</div>
        <div className="text-amber-400 font-bold font-serif-title text-2xl tracking-widest">
          修仙戰場召喚中...
        </div>
      </div>
    );
  }

  return (
    // fixed inset-0 → 全螢幕沉浸式容器，無任何 padding、header
    <div className="fixed inset-0 overflow-hidden bg-black">

      {/* Phaser 全螢幕 Canvas 底層 */}
      {isMounted && (storyStep === "BATTLE" || storyStep === "COMPLETED") && <PhaserGame />}

      {/* 劇情對話（全螢幕覆蓋層） */}
      {storyStep === "INTRO" && (
        <StoryDialog onComplete={() => setStoryStep("SUMMON")} />
      )}

      {/* 4 選 1 召喚（全螢幕覆蓋層） */}
      {storyStep === "SUMMON" && (
        <SummonModal onConfirmSummon={handleConfirmSummon} />
      )}

      {/* 全螢幕戰鬥 In-Game HUD（只在戰鬥時顯示） */}
      {(storyStep === "BATTLE" || storyStep === "COMPLETED") && (
        <InGameHUD
          onStartBattle={handleStartBattle}
          onBaitAction={handleBaitAction}
          onResetDeployment={initBattleUnits}
          onExecuteAction={handleExecuteAction}
          onReturnHome={() => router.push("/")}
          onExportSave={handleExportSave}
        />
      )}

      {/* 戰鬥結算 Modal */}
      <BattleResultModal
        onRestart={() => { resetBattle(); initBattleUnits(); }}
        onReturnHome={() => router.push("/")}
        onExportSave={handleExportSave}
      />
    </div>
  );
}
