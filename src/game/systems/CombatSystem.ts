import { BattleUnit, BattleReward } from "@/types/game";
import { STAGE_1_BANDIT } from "@/game/config/stages";
import { checkHuangZhongAmbushCondition, checkXiahouGuardCondition, getManhattanDistance } from "./AmbushSystem";

export interface TurnStepResult {
  logs: { text: string; type?: "info" | "skill" | "damage" | "rout" | "victory" }[];
  updatedUnits: BattleUnit[];
  isFinished: boolean;
  outcome: "AMBUSH" | "GUARD" | "STANDARD" | null;
  reward: BattleReward | null;
}

export function executeBattleStep(
  currentUnits: BattleUnit[],
  turnNumber: number
): TurnStepResult {
  const logs: TurnStepResult["logs"] = [];
  let units = currentUnits.map((u) => ({ ...u }));
  const tiles = STAGE_1_BANDIT.tiles;

  // 1. 檢查黃忠伏擊觸發
  const { ready: huangZhongAmbushReady, huangZhongUnit } = checkHuangZhongAmbushCondition(units, tiles);
  const chiefUnit = units.find((u) => u.heroConfig.id === "enemy_bandit_chief" && !u.isDead);

  if (huangZhongAmbushReady && huangZhongUnit && chiefUnit) {
    const distToChief = getManhattanDistance(huangZhongUnit, chiefUnit);
    if (distToChief <= huangZhongUnit.attackRange) {
      // 伏擊觸發！
      logs.push({
        text: `🎯 【伏擊觸發】黃忠置身密草叢，眼中精光一閃，開弓如滿月！`,
        type: "skill",
      });
      logs.push({
        text: `💥 技能【猛將一箭】：神射仙光穿透虛空，瞬間爆頭敵首【獨眼寨主】（造成 9999 點致命傷害）！`,
        type: "damage",
      });

      // 擊殺首領
      units = units.map((u) =>
        u.instanceId === chiefUnit.instanceId ? { ...u, currentHp: 0, isDead: true } : u
      );

      // 潰逃判定
      let routedCount = 0;
      units = units.map((u) => {
        if (u.faction === "ENEMY" && !u.isDead) {
          if (Math.random() < 0.75) {
            routedCount++;
            return { ...u, isDead: true, statusEffects: [...u.statusEffects, "ROUTED"] };
          }
        }
        return u;
      });

      logs.push({
        text: `😱 首領伏誅，寨內人心惶惶！${routedCount} 名黑風嘍囉嚇得魂飛魄散，棄甲潰逃！`,
        type: "rout",
      });

      const aliveEnemies = units.filter((u) => u.faction === "ENEMY" && !u.isDead);
      if (aliveEnemies.length === 0) {
        logs.push({
          text: `🏆 戰鬥勝利！黃忠神弓伏擊大獲全勝！`,
          type: "victory",
        });

        const reward: BattleReward = {
          lootType: "AMBUSH_SPECIAL",
          title: "伏擊奇襲捷報",
          description: "以極小代價秒殺敵首，獲得山寨密藏的高階修仙寶物！",
          items: [
            { name: "紫霄修仙丹", count: 2, quality: "仙", icon: "💊" },
            { name: "萬年玄鐵", count: 1, quality: "帝", icon: "💎" },
          ],
          spiritStones: 300,
          exp: 500,
        };

        return {
          logs,
          updatedUnits: units,
          isFinished: true,
          outcome: "AMBUSH",
          reward,
        };
      }
    }
  }

  // 2. 檢查夏侯惇援護狀態
  const isXiahouGuarded = checkXiahouGuardCondition(units);
  if (isXiahouGuarded) {
    logs.push({
      text: `🔰 【夏侯惇援護】夏侯惇與主角並肩作戰，發動【鐵血援護】，防禦力大幅提升 40%！`,
      type: "skill",
    });
  }

  // 3. 按照 Speed 排序進行普通回合攻擊
  const aliveUnits = units
    .filter((u) => !u.isDead)
    .sort((a, b) => b.speed - a.speed);

  for (const attacker of aliveUnits) {
    // 重新確認攻擊者存活
    const currentAttacker = units.find((u) => u.instanceId === attacker.instanceId);
    if (!currentAttacker || currentAttacker.isDead) continue;

    // 尋找最近的敵方目標
    const enemies = units.filter(
      (u) => u.faction !== currentAttacker.faction && !u.isDead
    );
    if (enemies.length === 0) break;

    // 按距離排序目標
    enemies.sort(
      (a, b) =>
        getManhattanDistance(currentAttacker, a) -
        getManhattanDistance(currentAttacker, b)
    );
    const target = enemies[0];
    const dist = getManhattanDistance(currentAttacker, target);

    // 若不在射程內，朝目標推進 1~2 格
    if (dist > currentAttacker.attackRange) {
      const dx = Math.sign(target.x - currentAttacker.x);
      const dy = Math.sign(target.y - currentAttacker.y);
      const newX = currentAttacker.x + (Math.abs(target.x - currentAttacker.x) > Math.abs(target.y - currentAttacker.y) ? dx : 0);
      const newY = currentAttacker.y + (Math.abs(target.y - currentAttacker.y) >= Math.abs(target.x - currentAttacker.x) ? dy : 0);

      units = units.map((u) =>
        u.instanceId === currentAttacker.instanceId ? { ...u, x: newX, y: newY } : u
      );
      logs.push({
        text: `🚶 ${currentAttacker.heroConfig.name} 向 (${newX}, ${newY}) 推進。`,
        type: "info",
      });
    } else {
      // 進行攻擊
      let effectiveDef = target.def;
      if (target.heroConfig.id === "hero_xiahou_dun" && isXiahouGuarded) {
        effectiveDef = Math.floor(effectiveDef * 1.4);
      }

      const rawDamage = Math.max(5, currentAttacker.atk - Math.floor(effectiveDef / 2));
      const newHp = Math.max(0, target.currentHp - rawDamage);
      const isDead = newHp === 0;

      units = units.map((u) =>
        u.instanceId === target.instanceId
          ? { ...u, currentHp: newHp, isDead }
          : u
      );

      logs.push({
        text: `⚔️ 回合 ${turnNumber}: 【${currentAttacker.heroConfig.name}】攻擊【${target.heroConfig.name}】，造成 ${rawDamage} 點傷害！${
          isDead ? "（目標倒下！）" : ""
        }`,
        type: "damage",
      });
    }
  }

  // 4. 勝負檢查
  const alivePlayers = units.filter((u) => u.faction === "PLAYER" && !u.isDead);
  const aliveEnemies = units.filter((u) => u.faction === "ENEMY" && !u.isDead);

  if (aliveEnemies.length === 0) {
    logs.push({
      text: `🏆 正面硬剛戰鬥勝利！全滅黑風山劫匪！`,
      type: "victory",
    });

    const reward: BattleReward = {
      lootType: "STANDARD_FULL",
      title: "正面強攻全勝捷報",
      description: "憑藉堅強戰力全滅劫匪山寨，搜刮全部戰利品與素材！",
      items: [
        { name: "靈石袋", count: 5, quality: "靈", icon: "💰" },
        { name: "山賊鋼刀", count: 2, quality: "凡", icon: "🗡️" },
        { name: "精純靈氣丹", count: 3, quality: "王", icon: "🧪" },
      ],
      spiritStones: 500,
      exp: 400,
    };

    return {
      logs,
      updatedUnits: units,
      isFinished: true,
      outcome: isXiahouGuarded ? "GUARD" : "STANDARD",
      reward,
    };
  }

  if (alivePlayers.length === 0) {
    return {
      logs: [{ text: "💀 主角與名將皆已倒下，戰鬥失敗...", type: "info" }],
      updatedUnits: units,
      isFinished: true,
      outcome: null,
      reward: null,
    };
  }

  return {
    logs,
    updatedUnits: units,
    isFinished: false,
    outcome: null,
    reward: null,
  };
}
