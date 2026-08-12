"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGameStore, StoryStep } from "@/stores/useGameStore";
import { useBattleStore } from "@/stores/useBattleStore";
import { StoryDialog } from "@/components/game/StoryDialog";
import { SummonModal } from "@/components/game/SummonModal";
import { BattleHUD } from "@/components/game/BattleHUD";
import { CombatLog } from "@/components/game/CombatLog";
import { BattleResultModal } from "@/components/game/BattleResultModal";
import { HeroConfig } from "@/types/hero";
import { BattleUnit, TacticalActionType } from "@/types/game";
import { STAGE_1_BANDIT } from "@/game/config/stages";
import { PROTAGONIST_HERO, SUMMONABLE_HEROES, ENEMY_BANDIT_CHIEF, ENEMY_BANDIT_THUG } from "@/game/config/heroes";
import { executeBattleStep } from "@/game/systems/CombatSystem";
import { Home, Save } from "lucide-react";

// Phaser 必須使用 next/dynamic 並設定 ssr: false 動態載入
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="w-[288px] h-[720px] rounded-xl bg-zinc-900 flex items-center justify-center text-amber-400 text-sm font-semibold border border-amber-500/30 animate-pulse">
      ⚔️ 載入 4×10 密林戰場...
    </div>
  ),
});

export default function GamePage() {
  const router = useRouter();
  const { storyStep, selectedHeroId, setStoryStep, setSelectedHeroId } = useGameStore();
  const {
    units,
    setPhase,
    setUnits,
    setActiveAction,
    addCombatLog,
    setReward,
    setTacticalOutcome,
    resetBattle,
  } = useBattleStore();

  const [loading, setLoading] = useState(true);

  // 初始化 4x10 戰鬥單位 (主角 + 召喚名將 + 5 劫匪)
  const initBattleUnits = useCallback(() => {
    const heroToSummon =
      SUMMONABLE_HEROES.find((h) => h.id === selectedHeroId) || SUMMONABLE_HEROES[0];

    const playerUnits: BattleUnit[] = [
      {
        instanceId: "u_protagonist",
        heroConfig: PROTAGONIST_HERO,
        faction: "PLAYER",
        x: STAGE_1_BANDIT.playerSpawnTiles[0].x,
        y: STAGE_1_BANDIT.playerSpawnTiles[0].y,
        currentHp: PROTAGONIST_HERO.baseStats.hp,
        maxHp: PROTAGONIST_HERO.baseStats.hp,
        atk: PROTAGONIST_HERO.baseStats.atk,
        def: PROTAGONIST_HERO.baseStats.def,
        speed: PROTAGONIST_HERO.baseStats.speed,
        moveRange: PROTAGONIST_HERO.baseStats.moveRange,
        attackRange: PROTAGONIST_HERO.baseStats.attackRange,
        statusEffects: [],
        hasActedThisTurn: false,
        isDead: false,
      },
      {
        instanceId: `u_${heroToSummon.id}`,
        heroConfig: heroToSummon,
        faction: "PLAYER",
        x: STAGE_1_BANDIT.playerSpawnTiles[1].x,
        y: STAGE_1_BANDIT.playerSpawnTiles[1].y,
        currentHp: heroToSummon.baseStats.hp,
        maxHp: heroToSummon.baseStats.hp,
        atk: heroToSummon.baseStats.atk,
        def: heroToSummon.baseStats.def,
        speed: heroToSummon.baseStats.speed,
        moveRange: heroToSummon.baseStats.moveRange,
        attackRange: heroToSummon.baseStats.attackRange,
        statusEffects: [],
        hasActedThisTurn: false,
        isDead: false,
      },
    ];

    const enemyUnits: BattleUnit[] = STAGE_1_BANDIT.enemies.map((e, idx) => {
      const cfg = e.heroId === "enemy_bandit_chief" ? ENEMY_BANDIT_CHIEF : ENEMY_BANDIT_THUG;
      return {
        instanceId: `enemy_${idx}`,
        heroConfig: cfg,
        faction: "ENEMY",
        x: e.x,
        y: e.y,
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
    });

    setUnits([...playerUnits, ...enemyUnits]);
    setPhase("DEPLOYMENT");
    addCombatLog("⚔️ 已進入黑風山谷 4×10 戰場！可在地圖直接拖拽擺位。", "info");
  }, [selectedHeroId, setUnits, setPhase, addCombatLog]);

  // 初始化或載入 SQLite 存檔
  useEffect(() => {
    fetch("/api/save")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.save) {
          const save = data.save;
          if (save.selectedHeroId) setSelectedHeroId(save.selectedHeroId);
          if (save.storyStep) setStoryStep(save.storyStep as StoryStep);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [setSelectedHeroId, setStoryStep]);

  useEffect(() => {
    if (storyStep === "BATTLE" && units.length === 0) {
      initBattleUnits();
    }
  }, [storyStep, units.length, initBattleUnits]);

  const handleStoryComplete = () => {
    setStoryStep("SUMMON");
  };

  const handleConfirmSummon = async (hero: HeroConfig) => {
    setSelectedHeroId(hero.id);
    setStoryStep("BATTLE");

    await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedHeroId: hero.id,
        storyStep: "BATTLE",
        gameData: { heroName: hero.name },
      }),
    });
  };

  const handleStartBattle = () => {
    setPhase("BATTLE_IN_PROGRESS");
    addCombatLog("🚀 開陣！兩軍在狹長山道正式交鋒！", "info");
    runBattleLoop();
  };

  const handleBaitAction = () => {
    addCombatLog("🏃 主角大喝【以身作餌】：『劫匪休走！有膽追我！』", "skill");
    handleStartBattle();
  };

  const handleResetDeployment = () => {
    initBattleUnits();
  };

  const handleExecuteAction = (action: TacticalActionType) => {
    setActiveAction(action);
    if (action === "ITEM") {
      addCombatLog("🧪 服用【紫霄修仙丹】：恢復全隊 50 點生命值！", "skill");
      setUnits(
        units.map((u) =>
          u.faction === "PLAYER" && !u.isDead
            ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + 50) }
            : u
        )
      );
    } else if (action === "FLEE") {
      addCombatLog("🏃 主角隊伍向底部 (1,9) 逃生法陣撤退！", "info");
      handleStartBattle();
    }
  };

  const runBattleLoop = () => {
    let turn = 1;
    const interval = setInterval(() => {
      const currentUnits = useBattleStore.getState().units;
      const stepResult = executeBattleStep(currentUnits, turn);

      stepResult.logs.forEach((log) => addCombatLog(log.text, log.type));
      setUnits(stepResult.updatedUnits);

      if (stepResult.isFinished) {
        clearInterval(interval);
        if (stepResult.outcome) setTacticalOutcome(stepResult.outcome);
        if (stepResult.reward) {
          setReward(stepResult.reward);
          setPhase("VICTORY");
          setStoryStep("COMPLETED");
        } else {
          setPhase("DEFEAT");
        }
      }

      turn++;
      if (turn > 15) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleExportSave = () => {
    const saveObj = {
      selectedHeroId,
      storyStep,
      units,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(saveObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `three_kingdoms_save_${Date.now()}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-amber-400 font-bold text-lg">
        ⚡ 正在初始化 4×10 三國修仙戰場...
      </div>
    );
  }

  return (
    <main className="min-h-screen p-3 md:p-5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-stone-100 flex flex-col">
      {/* 頂部輕量選單欄 */}
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-stone-300 transition border border-zinc-700"
            title="返回主選單"
          >
            <Home className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-black font-serif-title text-amber-400 tracking-wider">三國修仙 • 第一章黑風山谷</h1>
        </div>

        <button
          onClick={handleExportSave}
          className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-amber-300 flex items-center gap-1 transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>匯出存檔</span>
        </button>
      </header>

      {/* 穿越劇情對話框 (含右上角跳過按鈕) */}
      {storyStep === "INTRO" && <StoryDialog onComplete={handleStoryComplete} />}

      {/* 第一次 4 選 1 召喚 */}
      {storyStep === "SUMMON" && <SummonModal onConfirmSummon={handleConfirmSummon} />}

      {/* 全屏式 4x10 戰術沉浸戰場 */}
      {(storyStep === "BATTLE" || storyStep === "COMPLETED") && (
        <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col gap-3">
          <BattleHUD
            onStartBattle={handleStartBattle}
            onBaitAction={handleBaitAction}
            onResetDeployment={handleResetDeployment}
            onExecuteAction={handleExecuteAction}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start flex-1">
            {/* 左側：4×10 格子 2D 戰術畫布 (支援拖拽擺位) */}
            <div className="md:col-span-5 flex justify-center">
              <PhaserGame />
            </div>

            {/* 右側：修仙戰鬥日誌 */}
            <div className="md:col-span-7 h-full min-h-[500px]">
              <CombatLog />
            </div>
          </div>
        </div>
      )}

      {/* 結算獎勵 Modal */}
      <BattleResultModal
        onRestart={() => {
          resetBattle();
          initBattleUnits();
        }}
        onReturnHome={() => router.push("/")}
        onExportSave={handleExportSave}
      />
    </main>
  );
}
