"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useBattleStore } from "@/stores/useBattleStore";
import { useGameStore } from "@/stores/useGameStore";
import { useDevStore } from "@/stores/useDevStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { InGameHUD } from "@/components/game/InGameHUD";
import { RadialCommandMenu } from "@/components/game/RadialCommandMenu";
import { BanditDialogueModal } from "@/components/game/BanditDialogueModal";
import { InventoryModal } from "@/components/game/InventoryModal";
import { BattleResultModal } from "@/components/game/BattleResultModal";
import { SummonModal } from "@/components/game/SummonModal";
import { IntroNarration } from "@/components/game/IntroNarration";
import { ARPGActionBar } from "@/components/game/ARPGActionBar";
import { RoguelikeUpgradeModal } from "@/components/game/RoguelikeUpgradeModal";
import { EventBus } from "@/game/EventBus";
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
    setCurrentTurn,
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const battleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", handleContextMenu);

    // 監聽肉鴿升級選卡事件
    const handleLevelUp = () => {
      setShowUpgradeModal(true);
    };
    EventBus.on("roguelike-level-up", handleLevelUp);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      EventBus.off("roguelike-level-up", handleLevelUp);
      if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    };
  }, []);

  // 🟠 裝備屬性真實融入戰鬥數值 (Equipment Stats Integration)
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

    // 讀取背包裝備屬性加成 (武器、防具、飾品、功法)
    let bonusAtk = 0;
    let bonusDef = 0;
    let bonusHp = 0;
    let bonusSpeed = 0;
    let bonusMove = 0;

    const heroEquip = heroInventories[heroId]?.equipment;
    if (heroEquip) {
      Object.values(heroEquip).forEach((item) => {
        if (item?.stats) {
          if (item.stats.atk) bonusAtk += item.stats.atk;
          if (item.stats.def) bonusDef += item.stats.def;
          if (item.stats.hp) bonusHp += item.stats.hp;
          if (item.stats.speed) bonusSpeed += item.stats.speed;
          if (item.stats.moveRange) bonusMove += item.stats.moveRange;
        }
      });
    }

    const finalHp = cfg.baseStats.hp + bonusHp;
    const finalAtk = cfg.baseStats.atk + bonusAtk;
    const finalDef = cfg.baseStats.def + bonusDef;
    const finalSpeed = cfg.baseStats.speed + bonusSpeed;
    const finalMove = cfg.baseStats.moveRange + bonusMove;

    return {
      instanceId: id,
      heroConfig: cfg,
      faction,
      x: col,
      y: row,
      currentHp: finalHp,
      maxHp: finalHp,
      atk: finalAtk,
      def: finalDef,
      speed: finalSpeed,
      moveRange: finalMove,
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
      buildUnit(`enemy_${i}`, e.heroId, "ENEMY", e.x, e.y)
    );
    setUnits([...playerUnits, ...enemyUnits]);
    setPhase("DEPLOYMENT");
  }, [selectedHeroId, setUnits, setPhase]);

  // 🟠 真跨會話存盤還原 (Restore Full Game State from SQLite)
  useEffect(() => {
    fetch("/api/save")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.save) {
          if (data.save.selectedHeroId) setSelectedHeroId(data.save.selectedHeroId);
          const loadedStep = data.save.storyStep === "COMPLETED" ? "BATTLE" : (data.save.storyStep as StoryStep);
          if (loadedStep) setStoryStep(loadedStep);

          // 若存檔包含真實單位網格與 HP，精確還原原地續上！
          if (data.gameData?.units && Array.isArray(data.gameData.units) && data.gameData.units.length > 0) {
            const restoredUnits: BattleUnit[] = data.gameData.units.map((u: any) => {
              const base = buildUnit(u.instanceId, u.heroId, u.heroId.startsWith("enemy") ? "ENEMY" : "PLAYER", u.x, u.y);
              return {
                ...base,
                currentHp: u.hp !== undefined ? u.hp : base.currentHp,
                maxHp: u.maxHp !== undefined ? u.maxHp : base.maxHp,
                isDead: u.isDead !== undefined ? u.isDead : u.hp === 0,
              };
            });
            setUnits(restoredUnits);
            setIsDialogueActive(false);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setSelectedHeroId, setStoryStep, setUnits]);

  useEffect(() => {
    if ((storyStep === "BATTLE" || storyStep === "COMPLETED") && units.length === 0) {
      initBattleUnits();
    }
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

  // 一鍵推薦佈陣：自動將主角放在 (1, 7)，黃忠草叢伏擊 (3, 5)
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
    setIsDialogueActive(true);
    initBattleUnits();
    await saveGameState("BATTLE");
  };

  const handleStartBattle = () => {
    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    setPhase("BATTLE_IN_PROGRESS");
    setCurrentTurn(1);
    addCombatLog("⚔️ 兩軍交鋒！黑風山谷遭遇戰正式開始！", "info");
    runBattleLoop();
  };

  const handleBaitAction = () => {
    addCombatLog("🏹 黃忠伏擊草叢，主角施展假逃誘敵之計！", "skill");
    handleStartBattle();
  };

  // 🔴 玩家戰術代理指令即時響應（一次性消費 + 玩家接管自動 tick）
  const handleExecuteAction = (action: TacticalActionType) => {
    // 玩家下指令時，先暫停自動迴圈，避免雙寫競態
    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    battleIntervalRef.current = null;

    setActiveAction(action);
    const currentUnits = useBattleStore.getState().units;
    const turn = useBattleStore.getState().currentTurn;

    const result = executeBattleStep(currentUnits, turn, action);

    result.logs.forEach((l) => addCombatLog(l.text, l.type));
    setUnits(result.updatedUnits);
    emitEvents(result.events);
    setActiveAction(result.consumedAction); // 一次性消費：執行完畢後重置為 SELECT
    setCurrentTurn(turn + 1);

    if (result.isFinished) {
      if (result.outcome) setTacticalOutcome(result.outcome);
      if (result.reward) {
        setReward(result.reward);
        if (result.outcome === "RETREAT") {
          setPhase("RETREAT");
        } else {
          setPhase("VICTORY");
        }
        setStoryStep("COMPLETED");
        saveGameState("COMPLETED");
      } else {
        setPhase("DEFEAT");
      }
    } else {
      // 玩家指令完成後，延遲 1.5s 再恢復自動迴圈
      // 給玩家足夠時間觀察結果再決定下一步
      const nextTurn = turn + 1;
      battleIntervalRef.current = setTimeout(() => {
        restartBattleLoop(nextTurn);
      }, 1500) as unknown as NodeJS.Timeout;
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

  // 🟠 回合數同步遞增 (Turn Counter Sync)
  // restartBattleLoop：從指定回合恢復自動推進，由玩家指令後延遲呼叫
  const restartBattleLoop = (fromTurn: number) => {
    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    let turn = fromTurn;

    battleIntervalRef.current = setInterval(() => {
      // 若玩家剛下了指令（activeAction !== SELECT），跳過本 tick 避免雙寫
      const currentAction = useBattleStore.getState().activeAction;
      if (currentAction !== "SELECT") {
        setActiveAction("SELECT");
        turn++;
        return;
      }

      const currentUnits = useBattleStore.getState().units;
      const result = executeBattleStep(currentUnits, turn, "SELECT");

      result.logs.forEach((l) => addCombatLog(l.text, l.type));
      setUnits(result.updatedUnits);
      emitEvents(result.events);
      setCurrentTurn(turn);

      if (result.isFinished || turn >= 15) {
        if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
        if (result.outcome) setTacticalOutcome(result.outcome);
        if (result.reward) {
          setReward(result.reward);
          if (result.outcome === "RETREAT") {
            setPhase("RETREAT");
          } else {
            setPhase("VICTORY");
          }
          setStoryStep("COMPLETED");
          saveGameState("COMPLETED");
        } else {
          setPhase("DEFEAT");
        }
      }
      turn++;
    }, 1000);
  };

  const runBattleLoop = () => {
    restartBattleLoop(1);
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

  const showBattleUI = storyStep === "BATTLE" || storyStep === "COMPLETED";

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none">
      <PhaserGame />

      {storyStep === "INTRO" && (
        <IntroNarration onComplete={() => setStoryStep("SUMMON")} />
      )}

      {storyStep === "SUMMON" && <SummonModal onConfirmSummon={handleConfirmSummon} />}

      {showBattleUI && isDialogueActive && (
        <BanditDialogueModal onConfirmChoice={handleBanditChoice} onDismiss={() => setIsDialogueActive(false)} />
      )}

      {showBattleUI && !isDialogueActive && (
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

          <ARPGActionBar />

          {showUpgradeModal && (
            <RoguelikeUpgradeModal
              onSelectUpgrade={(selectedHero) => {
                setShowUpgradeModal(false);
                EventBus.emit("add-team-member", selectedHero);
              }}
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
