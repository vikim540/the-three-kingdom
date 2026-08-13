import { BattleUnit, BattleReward, CombatEvent, TacticalActionType } from "@/types/game";
import { STAGE_1_BANDIT } from "@/game/config/stages";
import { checkHuangZhongAmbushCondition, checkXiahouGuardCondition, getManhattanDistance, isUnitInBush } from "./AmbushSystem";

export interface TurnStepResult {
  logs: { text: string; type?: "info" | "skill" | "damage" | "rout" | "victory" }[];
  events: CombatEvent[];
  updatedUnits: BattleUnit[];
  isFinished: boolean;
  outcome: "AMBUSH" | "GUARD" | "STANDARD" | null;
  reward: BattleReward | null;
}

/**
 * 單一戰鬥真相源計算引擎 (Single Source of Truth)
 * 模擬邏輯層：純函數計算所有移動、名將技能、傷害公式與勝負判定，輸出 event 事件流
 */
export function executeBattleStep(
  currentUnits: BattleUnit[],
  turnNumber: number,
  activeAction: TacticalActionType = "SELECT"
): TurnStepResult {
  const logs: TurnStepResult["logs"] = [];
  const events: CombatEvent[] = [];
  let units = currentUnits.map((u) => ({ ...u, statusEffects: [...u.statusEffects] }));
  const tiles = STAGE_1_BANDIT.tiles;

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // 0. 玩家戰術代理指令接入 (Player Agency)
  if (activeAction === "ITEM") {
    const wounded = units.find((u) => u.faction === "PLAYER" && !u.isDead && u.currentHp < u.maxHp);
    if (wounded) {
      const healAmount = 50;
      wounded.currentHp = Math.min(wounded.maxHp, wounded.currentHp + healAmount);
      logs.push({
        text: `🧪 玩家對【${wounded.heroConfig.name}】使用【靈芝仙草】，恢復 ${healAmount} 點生命！`,
        type: "skill",
      });
      events.push({
        id: generateId(),
        type: "SKILL_TRIGGERED",
        unitId: wounded.instanceId,
        skillName: "靈芝仙草治癒",
        description: `恢復 ${healAmount} 點生命`,
      });
    }
  } else if (activeAction === "FLEE") {
    const playerUnit = units.find((u) => u.faction === "PLAYER" && !u.isDead);
    if (playerUnit && playerUnit.y >= 7) {
      logs.push({ text: "🏃‍♂️ 我方戰術撤退成功！全員安全離場！", type: "info" });
      events.push({ id: generateId(), type: "BATTLE_VICTORY", description: "戰術撤退" });
      return {
        logs,
        events,
        updatedUnits: units,
        isFinished: true,
        outcome: "STANDARD",
        reward: null,
      };
    }
  }

  // 1. 檢查黃忠草叢伏擊一擊必殺 (AMBUSH_SNIPE)
  const { ready: huangZhongAmbushReady, huangZhongUnit } = checkHuangZhongAmbushCondition(units, tiles);
  const chiefUnit = units.find((u) => u.heroConfig.id === "enemy_bandit_chief" && !u.isDead);

  if (huangZhongAmbushReady && huangZhongUnit && chiefUnit) {
    logs.push({
      text: `🎯 【伏擊觸發】黃忠置身古樹密草叢，身法半隱，開弓如滿月！`,
      type: "skill",
    });
    logs.push({
      text: `💥 武將技【百步穿楊】：神射仙光穿透虛空，瞬間爆頭敵首【獨眼寨主】（造成 9999 點致命暴擊）！`,
      type: "damage",
    });

    events.push({
      id: generateId(),
      type: "SKILL_TRIGGERED",
      unitId: huangZhongUnit.instanceId,
      skillName: "百步穿楊",
      effectType: "AMBUSH_SNIPE",
    });

    events.push({
      id: generateId(),
      type: "ATTACK_HIT",
      attackerId: huangZhongUnit.instanceId,
      targetId: chiefUnit.instanceId,
      damage: 9999,
      isCrit: true,
    });

    // 擊殺首領
    units = units.map((u) =>
      u.instanceId === chiefUnit.instanceId ? { ...u, currentHp: 0, isDead: true } : u
    );
    events.push({ id: generateId(), type: "UNIT_DIED", unitId: chiefUnit.instanceId });

    // 敵眾慌亂潰逃
    const fleeingIds: string[] = [];
    units = units.map((u) => {
      if (u.faction === "ENEMY" && !u.isDead) {
        fleeingIds.push(u.instanceId);
        return { ...u, isDead: true, statusEffects: [...u.statusEffects, "ROUTED"] };
      }
      return u;
    });

    events.push({ id: generateId(), type: "PANIC_FLEE", fleeUnitIds: fleeingIds });

    logs.push({
      text: `😱 首領伏誅！剩餘黑風嘍囉嚇得魂飛魄散，拋頭鼠竄逃離戰場！`,
      type: "rout",
    });

    logs.push({
      text: `🏆 戰鬥勝利！黃忠神弓伏擊大獲全勝！`,
      type: "victory",
    });

    events.push({ id: generateId(), type: "BATTLE_VICTORY", description: "草叢伏擊大獲全勝" });

    const reward: BattleReward = {
      lootType: "AMBUSH_SPECIAL",
      title: "伏擊奇襲捷報",
      description: "以極小代價秒殺敵首，獲得山寨密藏的高階修仙寶物！",
      items: [
        { name: "紫霄修仙丹", count: 2, quality: "仙", icon: "💊" },
        { name: "萬年玄鐵", count: 1, quality: "帝", icon: "💎" },
      ],
      spiritStones: 350,
      exp: 600,
    };

    return {
      logs,
      events,
      updatedUnits: units,
      isFinished: true,
      outcome: "AMBUSH",
      reward,
    };
  }

  // 2. 檢查夏侯惇援護狀態 (GUARD_COVER)
  const isXiahouGuarded = checkXiahouGuardCondition(units);
  if (isXiahouGuarded) {
    logs.push({
      text: `🛡️ 【夏侯惇援護】夏侯惇與主角並肩作戰，發動【鐵血援護】，防禦力獲得 40% 豁免！`,
      type: "skill",
    });
    const xiahouUnit = units.find((u) => u.heroConfig.id === "hero_xiahou_dun");
    if (xiahouUnit) {
      events.push({
        id: generateId(),
        type: "SKILL_TRIGGERED",
        unitId: xiahouUnit.instanceId,
        skillName: "鐵血援護",
        effectType: "GUARD_COVER",
      });
    }
  }

  // 3. 按照 Speed 排序進行回合行動
  const aliveUnits = units
    .filter((u) => !u.isDead)
    .sort((a, b) => b.speed - a.speed);

  for (const attacker of aliveUnits) {
    const currentAttacker = units.find((u) => u.instanceId === attacker.instanceId);
    if (!currentAttacker || currentAttacker.isDead) continue;

    // 若被冰封，跳過本回合
    if (currentAttacker.statusEffects.includes("FROZEN")) {
      logs.push({ text: "❄️ 【" + currentAttacker.heroConfig.name + "】陷入冰封，無法行動！", type: "info" });
      currentAttacker.statusEffects = currentAttacker.statusEffects.filter((s) => s !== "FROZEN");
      continue;
    }

    const enemies = units.filter((u) => u.faction !== currentAttacker.faction && !u.isDead);
    if (enemies.length === 0) break;

    enemies.sort(
      (a, b) => getManhattanDistance(currentAttacker, a) - getManhattanDistance(currentAttacker, b)
    );
    const target = enemies[0];
    const dist = getManhattanDistance(currentAttacker, target);

    // 名將技能特化：趙雲 (PIERCE_CHARGE) & 郭嘉 (FREEZE_CONTROL)
    const heroId = currentAttacker.heroConfig.id;

    if (heroId === "hero_zhao_yun" && dist <= currentAttacker.moveRange + 1) {
      // 趙雲七進七出穿透
      logs.push({ text: `⚡ 趙雲發動【七進七出】：長槍穿透敵陣，無視 50% 防禦！`, type: "skill" });
      events.push({ id: generateId(), type: "SKILL_TRIGGERED", unitId: currentAttacker.instanceId, skillName: "七進七出" });

      const piercedDef = Math.floor(target.def * 0.5);
      const rawDamage = Math.max(10, Math.floor(currentAttacker.atk * 1.3 - piercedDef));
      const newHp = Math.max(0, target.currentHp - rawDamage);
      const isDead = newHp === 0;

      units = units.map((u) => (u.instanceId === target.instanceId ? { ...u, currentHp: newHp, isDead } : u));
      events.push({ id: generateId(), type: "ATTACK_HIT", attackerId: currentAttacker.instanceId, targetId: target.instanceId, damage: rawDamage, isCrit: true });
      if (isDead) events.push({ id: generateId(), type: "UNIT_DIED", unitId: target.instanceId });

      logs.push({ text: `⚔️ 趙雲槍芒刺穿【${target.heroConfig.name}】，造成 ${rawDamage} 點穿透暴擊傷害！${isDead ? "（目標倒下！）" : ""}`, type: "damage" });
      continue;
    }

    if (heroId === "hero_guo_jia" && dist <= currentAttacker.attackRange + 2) {
      // 郭嘉奇謀禁錮
      logs.push({ text: `📜 郭嘉發動【奇謀禁錮】：玄冰符陣封印【${target.heroConfig.name}】！`, type: "skill" });
      events.push({ id: generateId(), type: "SKILL_TRIGGERED", unitId: currentAttacker.instanceId, skillName: "奇謀禁錮" });

      const rawDamage = Math.max(12, Math.floor(currentAttacker.atk * 1.1 - target.def * 0.3));
      const newHp = Math.max(0, target.currentHp - rawDamage);
      const isDead = newHp === 0;

      units = units.map((u) =>
        u.instanceId === target.instanceId
          ? { ...u, currentHp: newHp, isDead, statusEffects: isDead ? u.statusEffects : [...u.statusEffects, "FROZEN"] }
          : u
      );
      events.push({ id: generateId(), type: "ATTACK_HIT", attackerId: currentAttacker.instanceId, targetId: target.instanceId, damage: rawDamage });
      if (isDead) events.push({ id: generateId(), type: "UNIT_DIED", unitId: target.instanceId });
      continue;
    }

    // 常規移動與攻擊
    if (dist > currentAttacker.attackRange) {
      const dx = Math.sign(target.x - currentAttacker.x);
      const dy = Math.sign(target.y - currentAttacker.y);
      const fromX = currentAttacker.x;
      const fromY = currentAttacker.y;
      const newX = currentAttacker.x + (Math.abs(target.x - currentAttacker.x) > Math.abs(target.y - currentAttacker.y) ? dx : 0);
      const newY = currentAttacker.y + (Math.abs(target.y - currentAttacker.y) >= Math.abs(target.x - currentAttacker.x) ? dy : 0);

      units = units.map((u) => (u.instanceId === currentAttacker.instanceId ? { ...u, x: newX, y: newY } : u));
      events.push({ id: generateId(), type: "UNIT_MOVED", unitId: currentAttacker.instanceId, fromX, fromY, toX: newX, toY: newY });
      logs.push({ text: `🚶 ${currentAttacker.heroConfig.name} 推進至網格 (${newX}, ${newY})。`, type: "info" });
    } else {
      // 計算地形與夏侯惇護甲加成
      let effectiveDef = target.def;
      if (target.heroConfig.id === "hero_xiahou_dun" && isXiahouGuarded) {
        effectiveDef = Math.floor(effectiveDef * 1.66); // 40% 傷害豁免
      }
      if (isUnitInBush(target, tiles)) {
        effectiveDef = Math.floor(effectiveDef * 1.2); // 草叢 +20% 防禦加成
      }

      // 正態方差 (0.9 ~ 1.1) 與暴擊判定
      const isCrit = Math.random() < currentAttacker.speed * 0.02;
      const variance = 0.9 + Math.random() * 0.2;
      const rawDamage = Math.max(5, Math.floor((currentAttacker.atk * (isCrit ? 1.5 : 1) - effectiveDef * 0.5) * variance));
      const newHp = Math.max(0, target.currentHp - rawDamage);
      const isDead = newHp === 0;

      units = units.map((u) => (u.instanceId === target.instanceId ? { ...u, currentHp: newHp, isDead } : u));
      events.push({ id: generateId(), type: "ATTACK_HIT", attackerId: currentAttacker.instanceId, targetId: target.instanceId, damage: rawDamage, isCrit });

      logs.push({
        text: `⚔️ 回合 ${turnNumber}: 【${currentAttacker.heroConfig.name}】攻擊【${target.heroConfig.name}】，造成 ${rawDamage} 點${isCrit ? "暴擊" : ""}傷害！${isDead ? "（目標倒下！）" : ""}`,
        type: "damage",
      });

      if (isDead) {
        events.push({ id: generateId(), type: "UNIT_DIED", unitId: target.instanceId });
      }
    }
  }

  // 4. 勝負檢查
  const alivePlayers = units.filter((u) => u.faction === "PLAYER" && !u.isDead);
  const aliveEnemies = units.filter((u) => u.faction === "ENEMY" && !u.isDead);

  if (aliveEnemies.length === 0) {
    logs.push({ text: `🏆 戰鬥勝利！全滅黑風山劫匪！`, type: "victory" });
    events.push({ id: generateId(), type: "BATTLE_VICTORY", description: "全滅敵軍" });

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
      events,
      updatedUnits: units,
      isFinished: true,
      outcome: isXiahouGuarded ? "GUARD" : "STANDARD",
      reward,
    };
  }

  if (alivePlayers.length === 0) {
    events.push({ id: generateId(), type: "BATTLE_DEFEAT", description: "全員倒下" });
    return {
      logs: [{ text: "💀 我方名將皆已倒下，戰鬥失敗...", type: "info" }],
      events,
      updatedUnits: units,
      isFinished: true,
      outcome: null,
      reward: null,
    };
  }

  return {
    logs,
    events,
    updatedUnits: units,
    isFinished: false,
    outcome: null,
    reward: null,
  };
}
