"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useBattleStore } from "@/stores/useBattleStore";
import { useGameStore } from "@/stores/useGameStore";
import { useDevStore } from "@/stores/useDevStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { InGameHUD } from "@/components/game/InGameHUD";
import { RadialCommandMenu } from "@/components/game/RadialCommandMenu";
import { FanOutHandCards } from "@/components/game/FanOutHandCards";
import { BanditDialogueModal } from "@/components/game/BanditDialogueModal";
import { InventoryModal } from "@/components/game/InventoryModal";
import { BattleResultModal } from "@/components/game/BattleResultModal";
import { SummonModal } from "@/components/game/SummonModal";
import { BattleUnit, HeroConfig, TacticalActionType, StoryStep } from "@/types/game";
import { STAGE_1_BANDIT } from "@/game/config/stages";
import { SUMMONABLE_HEROES } from "@/game/config/heroes";
import { executeBattleStep } from "@/game/systems/CombatSystem";
import { isUnitInBush } from "@/game/systems/AmbushSystem";

const PhaserGame = dynamic(() => import("@/game/PhaserGame"), {
  ssr: false,
});

export default function GamePage() {
  const [isMounted, setIsMounted] = useState(false);

  const {
    phase,
    units,
    selectedUnitId,
    activeAction,
    currentTurn,
    setPhase,
    setUnits,
    setSelectedUnitId,
    setActiveAction,
    addCombatLog,
    emitEvents,
    setReward,
    setTacticalOutcome,
    resetBattle,
  } = useBattleStore();

  const { selectedHeroId, storyStep, setSelectedHeroId, setStoryStep } = useGameStore();
  const { spiritStones, heroSouls, heroInventories } = useInventoryStore();

  const [loading, setLoading] = useState(true);
  const [isDialogueActive, setIsDialogueActive] = useState(true);
  const battleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    };
  }, []);

  const buildUnit = (
    id: string,
    heroId: string,
    faction: "PLAYER" | "ENEMY",
    col: number,
    row: number
  ): BattleUnit => {
    const allHeroes = [
      ...SUMMONABLE_HEROES,
      {
        id: "enemy_bandit_chief",
        name: "獨眼寨主",
        title: "黑風首領",
        quality: "靈",
        faction: "群雄",
        role: "前鋒",
        avatar: "👹",
        imagePath: "/assets/heroes/bandit_chief.webp",
        description: "魔道散修",
        tacticalQuote: "此山是我開！",
        baseStats: { hp: 150, maxHp: 150, atk: 22, def: 12, speed: 11, moveRange: 3, attackRange: 1 },
        skills: [],
      },
      {
        id: "enemy_bandit_thug",
        name: "黑風嘍囉",
        title: "山寨嘍囉",
        quality: "凡",
        faction: "群雄",
        role: "前鋒",
        avatar: "🧌",
        imagePath: "/assets/heroes/bandit_thug.webp",
        description: "黑風寨劫匪",
        tacticalQuote: "老大衝啊！",
        baseStats: { hp: 60, maxHp: 60, atk: 14, def: 5, speed: 9, moveRange: 2, attackRange: 1 },
        skills: [],
      },
    ] as HeroConfig[];

    const cfg = allHeroes.find((h) => h.id === heroId) || SUMMONABLE_HEROES[0];

    return {
      instanceId: id,
      heroConfig: cfg,
      faction,
      x: col,
      y: row,
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
    // 敵人精確使用 STAGE_1_BANDIT 網格整數座標 (col, row)
    const enemyUnits = STAGE_1_BANDIT.enemies.map((e, i) =>
      buildUnit(`enemy_${i}`, e.heroId, "ENEMY", e.x, e.y)
    );
    setUnits([...playerUnits, ...enemyUnits]);
    setPhase("DEPLOYMENT");
  }, [selectedHeroId, setUnits, setPhase]);

  // 載入與還原 SQLite 真存檔 (Restore Full Game State)
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

  // 放置手牌單位到 4x10 整數網格 (col, row)
  const handlePlaceUnit = (unitInstanceId: string, col: number, row: number) => {
    const unit = units.find((u) => u.instanceId === unitInstanceId);
    if (!unit) return;

    const inAmbush = isUnitInBush({ x: col, y: row }, STAGE_1_BANDIT.tiles);

    setUnits(
      units.map((u) =>
        u.instanceId === unitInstanceId
          ? {
              ...u,
              x: col,
              y: row,
              statusEffects: inAmbush ? ["AMBUSH"] : [],
            }
          : u
      )
    );

    addCombatLog(
      `📍 ${unit.heroConfig.name} 部署至網格 (${col}, ${row})！${inAmbush ? " ✦ 進入草叢伏擊狀態！" : ""}`,
      inAmbush ? "skill" : "info"
    );
  };

  // ⭐ 一鍵推薦佈陣：自動將主角放在 (1, 7)，名將放在的最佳戰術網格 (如黃忠草叢伏擊 3, 5)
  const handleQuickAutoDeploy = () => {
    setUnits(
      units.map((u) => {
        if (u.heroConfig.id === "hero_protagonist") {
          return { ...u, x: 1, y: 7 };
        }
        if (u.heroConfig.id === "hero_huang_zhong") {
          return { ...u, x: 3, y: 5, statusEffects: ["AMBUSH"] };
        }
        if (u.heroConfig.id === "hero_xiahou_dun") {
          return { ...u, x: 2, y: 7 };
        }
        if (u.heroConfig.id === "hero_zhao_yun") {
          return { ...u, x: 0, y: 7 };
        }
        if (u.heroConfig.id === "hero_guo_jia") {
          return { ...u, x: 3, y: 7 };
        }
        return u;
      })
    );
    addCombatLog("✨ 【一鍵完美佈陣完成】名將各就各位，開啟仙家陣型！", "skill");
  };

  const handleBanditChoice = (choiceType: "ATTACK" | "AMBUSH" | "GUARD") => {
    setIsDialogueActive(false);
    if (choiceType === "AMBUSH") {
      setUnits(
        units.map((u) =>
          u.heroConfig.id === "hero_huang_zhong"
            ? { ...u, x: 3, y: 5, statusEffects: ["AMBUSH"] }
            : u
        )
      );
    }
  };

  const saveGameState = async (overrideStep?: StoryStep) => {
    const currentUnits = useBattleStore.getState().units;
    const currentHeroId = useGameStore.getState().selectedHeroId;
    const step = overrideStep || useGameStore.getState().storyStep;

    const fullSavePayload = {
      selectedHeroId: currentHeroId,
      storyStep: step,
      gameData: {
        spiritStones,
        heroSouls,
        heroInventories,
        units: currentUnits.map((u) => ({
          instanceId: u.instanceId,
          heroId: u.heroConfig.id,
          x: u.x,
          y: u.y,
          hp: u.currentHp,
          maxHp: u.maxHp,
          isDead: u.isDead,
        })),
      },
    };

    await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullSavePayload),
    });
  };

  const handleConfirmSummon = async (hero: HeroConfig) => {
    setSelectedHeroId(hero.id);
    setStoryStep("BATTLE");
    await saveGameState("BATTLE");
  };

  const handleStartBattle = () => {
    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    setPhase("BATTLE_IN_PROGRESS");
    addCombatLog("⚔️ 兩軍交鋒！黑風山谷遭遇戰正式開始！", "info");
    runBattleLoop();
  };

  const handleBaitAction = () => {
    addCombatLog("🏹 黃忠伏擊草叢，主角施展假逃誘敵之計！", "skill");
    handleStartBattle();
  };

  // 玩家代理指令即時響應模擬引擎 (Player Agency)
  const handleExecuteAction = (action: TacticalActionType) => {
    setActiveAction(action);
    const currentUnits = useBattleStore.getState().units;
    const result = executeBattleStep(currentUnits, currentTurn, action);

    result.logs.forEach((l) => addCombatLog(l.text, l.type));
    setUnits(result.updatedUnits);
    emitEvents(result.events);

    if (result.isFinished) {
      if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
      if (result.outcome) setTacticalOutcome(result.outcome);
      if (result.reward) {
        setReward(result.reward);
        setPhase("VICTORY");
        setStoryStep("COMPLETED");
        saveGameState("COMPLETED");
      } else {
        setPhase("DEFEAT");
      }
    }
  };

  const handleExportSave = () => {
    const currentUnits = useBattleStore.getState().units;
    const saveObj = {
      selectedHeroId,
      storyStep,
      spiritStones,
      heroSouls,
      heroInventories,
      units: currentUnits.map((u) => ({
        instanceId: u.instanceId,
        heroId: u.heroConfig.id,
        x: u.x,
        y: u.y,
        hp: u.currentHp,
        isDead: u.isDead,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(saveObj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `three_kingdoms_save_${Date.now()}.json`;
    a.click();
  };

  const runBattleLoop = () => {
    let turn = 1;
    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);

    battleIntervalRef.current = setInterval(() => {
      const currentUnits = useBattleStore.getState().units;
      const currentAction = useBattleStore.getState().activeAction;
      const result = executeBattleStep(currentUnits, turn, currentAction);

      result.logs.forEach((l) => addCombatLog(l.text, l.type));
      setUnits(result.updatedUnits);
      emitEvents(result.events);

      if (result.isFinished || turn >= 15) {
        if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
        if (result.outcome) setTacticalOutcome(result.outcome);
        if (result.reward) {
          setReward(result.reward);
          setPhase("VICTORY");
          setStoryStep("COMPLETED");
          saveGameState("COMPLETED");
        } else {
          setPhase("DEFEAT");
        }
      }
      turn++;
    }, 1000);
  };

  const selectedUnit = units.find((u) => u.instanceId === selectedUnitId);

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-stone-200">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif-title tracking-widest text-sm text-amber-300">結界開啟中...</p>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none">
      <PhaserGame />

      {storyStep === "SUMMON" && <SummonModal onConfirmSummon={handleConfirmSummon} />}

      {storyStep === "BATTLE" && isDialogueActive && (
        <BanditDialogueModal onConfirmChoice={handleBanditChoice} onDismiss={() => setIsDialogueActive(false)} />
      )}

      {storyStep === "BATTLE" && !isDialogueActive && (
        <>
          <InGameHUD
            onStartBattle={handleStartBattle}
            onBaitAction={handleBaitAction}
            onResetDeployment={() => {
              if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
              resetBattle();
              initBattleUnits();
            }}
            onReturnHome={() => {
              if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
              window.location.href = "/";
            }}
            onExportSave={handleExportSave}
            onQuickAutoDeploy={handleQuickAutoDeploy}
            onExecuteAction={handleExecuteAction}
          />

          <FanOutHandCards onPlaceUnit={handlePlaceUnit} />

          {phase === "BATTLE_IN_PROGRESS" && selectedUnit && (
            <RadialCommandMenu
              x={typeof window !== "undefined" ? window.innerWidth / 2 : 400}
              y={typeof window !== "undefined" ? window.innerHeight / 2 : 300}
              isInAmbushRegion={selectedUnit ? isUnitInBush({ x: selectedUnit.x, y: selectedUnit.y }, STAGE_1_BANDIT.tiles) : false}
              onSelectAction={handleExecuteAction}
              onClose={() => setSelectedUnitId(null)}
            />
          )}

          <InventoryModal />
          <BattleResultModal
            onRestart={() => {
              if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
              resetBattle();
              initBattleUnits();
            }}
            onReturnHome={() => {
              if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
              window.location.href = "/";
            }}
            onExportSave={handleExportSave}
          />
        </>
      )}
    </main>
  );
}
