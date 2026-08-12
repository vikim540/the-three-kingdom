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
import { BattleUnit } from "@/types/game";
import { STAGE_1_BANDIT } from "@/game/config/stages";
import { PROTAGONIST_HERO, SUMMONABLE_HEROES, ENEMY_BANDIT_CHIEF, ENEMY_BANDIT_THUG } from "@/game/config/heroes";
import { executeBattleStep } from "@/game/systems/CombatSystem";
import { Home, Save } from "lucide-react";

// Phaser 必須使用 next/dynamic 並設定 ssr: false 動態載入
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="w-[512px] h-[512px] rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 text-sm font-semibold border border-amber-500/30 animate-pulse">
      ⚔️ 載入三國修仙戰鬥陣圖中...
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
    addCombatLog,
    setReward,
    setTacticalOutcome,
    resetBattle,
  } = useBattleStore();

  const [loading, setLoading] = useState(true);

  // 初始化戰鬥單位 (主角 + 召喚名將 + 5 劫匪)
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
    addCombatLog("⚔️ 已進入黑風山遭遇劫匪關卡！請在地圖底部調整布陣。", "info");
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

    // 保存存檔至 SQLite
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
    addCombatLog("🚀 開陣！兩軍正式交鋒！", "info");
    runBattleLoop();
  };

  const handleBaitAction = () => {
    addCombatLog("🏃 主角大喝一聲【以身作餌】：『劫匪休走！有膽追我！』", "skill");
    handleStartBattle();
  };

  const handleResetDeployment = () => {
    initBattleUnits();
  };

  const runBattleLoop = () => {
    let turn = 1;
    const interval = setInterval(() => {
      const currentUnits = useBattleStore.getState().units;
      const stepResult = executeBattleStep(currentUnits, turn);

      // 輸出日誌
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-amber-400 font-bold text-lg">
        ⚡ 正在初始化三國修仙大世界...
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col">
      {/* 頂部 Navigation Bar */}
      <header className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition border border-slate-700"
            title="返回主選單"
          >
            <Home className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-black text-amber-400 tracking-wide">三國修仙 • 第一章</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportSave}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>匯出存檔</span>
          </button>
        </div>
      </header>

      {/* 穿越劇情對話框 */}
      {storyStep === "INTRO" && <StoryDialog onComplete={handleStoryComplete} />}

      {/* 第一次 4 選 1 召喚 */}
      {storyStep === "SUMMON" && <SummonModal onConfirmSummon={handleConfirmSummon} />}

      {/* 主戰鬥區域 */}
      {(storyStep === "BATTLE" || storyStep === "COMPLETED") && (
        <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col gap-4">
          <BattleHUD
            onStartBattle={handleStartBattle}
            onBaitAction={handleBaitAction}
            onResetDeployment={handleResetDeployment}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Phaser 8x8 格子畫布 */}
            <div className="lg:col-span-7 flex justify-center">
              <PhaserGame />
            </div>

            {/* 右側戰鬥日誌 */}
            <div className="lg:col-span-5 h-full">
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
