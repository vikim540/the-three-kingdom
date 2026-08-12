"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGameStore, StoryStep } from "@/stores/useGameStore";
import { useBattleStore } from "@/stores/useBattleStore";
import { useDevStore } from "@/stores/useDevStore";
import { StoryDialog } from "@/components/game/StoryDialog";
import { SummonModal } from "@/components/game/SummonModal";
import { BanditDialogueModal } from "@/components/game/BanditDialogueModal";
import { InGameHUD } from "@/components/game/InGameHUD";
import { FanOutHandCards } from "@/components/game/FanOutHandCards";
import { RadialCommandMenu } from "@/components/game/RadialCommandMenu";
import { InventoryModal } from "@/components/game/InventoryModal";
import { BattleResultModal } from "@/components/game/BattleResultModal";
import { HeroConfig } from "@/types/hero";
import { BattleUnit, TacticalActionType } from "@/types/game";
import { isPointInPolygon } from "@/types/region";
import { STAGE_1_BANDIT } from "@/game/config/stages";
import {
  PROTAGONIST_HERO,
  SUMMONABLE_HEROES,
  ENEMY_BANDIT_CHIEF,
  ENEMY_BANDIT_THUG,
} from "@/game/config/heroes";
import { executeBattleStep } from "@/game/systems/CombatSystem";

const PhaserGame = dynamic(() => import("@/game/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="text-5xl animate-bounce">⚔️</div>
      <div className="text-amber-400 font-bold font-serif-title text-2xl tracking-widest animate-pulse">
        修仙戰場 正在加載...
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
    selectedUnitId, setSelectedUnitId,
  } = useBattleStore();

  const { regions } = useDevStore();

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
      buildUnit("u_protagonist", "hero_protagonist", "PLAYER", -1, -1),
      buildUnit(`u_${heroId}`, heroId, "PLAYER", -1, -1),
    ];
    const enemyUnits = STAGE_1_BANDIT.enemies.map((e, i) =>
      buildUnit(`enemy_${i}`, e.heroId, "ENEMY", 0.38 + i * 0.06, 0.22 + (i % 2) * 0.05)
    );
    setUnits([...playerUnits, ...enemyUnits]);
    setPhase("DEPLOYMENT");
  }, [selectedHeroId, setUnits, setPhase]);

  // 載入 SQLite 存檔
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

  // 放置手牌單位到場面多邊形區域
  const handlePlaceUnit = (unitInstanceId: string, normX: number, normY: number) => {
    const unit = units.find((u) => u.instanceId === unitInstanceId);
    if (!unit) return;

    const inAmbush = regions.some(
      (r) => r.type === "AMBUSH" && isPointInPolygon({ x: normX, y: normY }, r.points)
    );

    setUnits(
      units.map((u) =>
        u.instanceId === unitInstanceId
          ? {
              ...u,
              x: normX,
              y: normY,
              statusEffects: inAmbush ? ["AMBUSH"] : [],
            }
          : u
      )
    );

    addCombatLog(
      `📍 ${unit.heroConfig.name} 登場！${inAmbush ? " ✦ 進入草叢伏擊狀態！" : ""}`,
      inAmbush ? "skill" : "info"
    );
  };

  const [isDialogueActive, setIsDialogueActive] = useState(true);

  const handleBanditChoice = (choiceType: "ATTACK" | "AMBUSH" | "GUARD") => {
    setIsDialogueActive(false);
    if (choiceType === "AMBUSH") {
      // 自動將黃忠部署至左側伏擊區 (0.12, 0.72)
      setUnits(
        units.map((u) =>
          u.heroConfig.id === "hero_huang_zhong"
            ? { ...u, x: 0.12, y: 0.72, statusEffects: ["AMBUSH"] }
            : u
        )
      );
    }
  };

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
    addCombatLog("⚔️ 兩軍交鋒！黑風山谷遭遇戰正式開始！", "info");
    runBattleLoop();
  };

  const handleBaitAction = () => {
    addCombatLog("🏹 黃忠伏擊草叢，主角施展假逃誘敵之計！", "skill");
    handleStartBattle();
  };

  const handleExecuteAction = (action: TacticalActionType) => {
    setActiveAction(action);
    if (action === "SKILL") {
      addCombatLog("🏹 觸發【神箭伏擊】：黃忠於草叢一箭爆頭敵首！", "skill");
    } else if (action === "ITEM") {
      addCombatLog("🧪 服用紫霄修仙丹，恢復全隊 50 生命！", "skill");
      setUnits(
        units.map((u) =>
          u.faction === "PLAYER" && !u.isDead
            ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + 50) }
            : u
        )
      );
    } else if (action === "FLEE") {
      addCombatLog("🏃 全隊向後方安全區撤退！", "info");
      handleStartBattle();
    }
  };

  const handleExportSave = () => {
    const blob = new Blob([JSON.stringify({ selectedHeroId, storyStep, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `three_kingdoms_save_${Date.now()}.json`;
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

  const selectedUnit = units.find((u) => u.instanceId === selectedUnitId);
  const selectedUnitIsInAmbush = selectedUnit
    ? regions.some(
        (r) => r.type === "AMBUSH" && isPointInPolygon({ x: selectedUnit.x, y: selectedUnit.y }, r.points)
      )
    : false;

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
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* 1. Phaser 全螢幕 Canvas 底層 */}
      {isMounted && (storyStep === "BATTLE" || storyStep === "COMPLETED") && <PhaserGame />}

      {/* 2. 穿越劇情對話 */}
      {storyStep === "INTRO" && <StoryDialog onComplete={() => setStoryStep("SUMMON")} />}

      {/* 3. 4選1名將召喚 */}
      {storyStep === "SUMMON" && <SummonModal onConfirmSummon={handleConfirmSummon} />}

      {/* 4. 山賊攔路對白對策 Modal (布陣階段觸發) */}
      {(storyStep === "BATTLE" || storyStep === "COMPLETED") && (
        <BanditDialogueModal
          onConfirmChoice={handleBanditChoice}
          onDismiss={() => setIsDialogueActive(false)}
        />
      )}

      {/* 5. 全螢幕戰鬥 In-Game HUD 覆蓋層 */}
      {(storyStep === "BATTLE" || storyStep === "COMPLETED") && (
        <>
          <InGameHUD
            onStartBattle={handleStartBattle}
            onBaitAction={handleBaitAction}
            onResetDeployment={() => {
              setIsDialogueActive(true);
              initBattleUnits();
            }}
            onReturnHome={() => router.push("/")}
            onExportSave={handleExportSave}
          />

          {/* 6. 底部 GSAP 扇形展開手牌 (對白關閉後乾淨展示，獨占底部區域) */}
          {!isDialogueActive && <FanOutHandCards onPlaceUnit={handlePlaceUnit} />}

          {/* 7. 兩軍交鋒階段選中 2D 角色才彈出指令輪盤 (布陣階段不混淆彈出) */}
          {useBattleStore.getState().phase === "BATTLE_IN_PROGRESS" && selectedUnitId && selectedUnit && selectedUnit.faction === "PLAYER" && (
            <RadialCommandMenu
              x={selectedUnit.x <= 1 ? selectedUnit.x * window.innerWidth : selectedUnit.x}
              y={selectedUnit.y <= 1 ? selectedUnit.y * window.innerHeight : selectedUnit.y}
              isInAmbushRegion={selectedUnitIsInAmbush}
              onSelectAction={handleExecuteAction}
              onClose={() => setSelectedUnitId(null)}
            />
          )}

          {/* 8. 博德之門 3 風格物品欄 (B / TAB) */}
          <InventoryModal />
        </>
      )}

      {/* 9. 戰鬥結算 Modal */}
      <BattleResultModal
        onRestart={() => {
          resetBattle();
          initBattleUnits();
        }}
        onReturnHome={() => router.push("/")}
        onExportSave={handleExportSave}
      />
    </div>
  );
}
