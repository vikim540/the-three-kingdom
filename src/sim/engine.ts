import type { GameState } from './store';
import type {
  Terrain,
  BuildType,
  Village,
  Calendar,
  Specialty,
  Quest,
  QuestComplete,
  QuestTrigger,
  Adventure,
  AdventureNode,
  AdventureChoice,
  AdventureReq,
  AdventureEffect,
  EventTrigger,
  GameEvent,
  ResourceKind,
  ResourcePoint,
  BranchReward,
} from '../data/types';
import { BUILD_INFO, TIER_PLOTS } from '../data/types';
import {
  LEVEL_MULT,
  LEVEL_REQ,
  TAX_MIN,
  TAX_MAX,
  canSetTax,
  taxUpperBound,
  HOME_VILLAGE_ID,
  rankValue,
  PROMOTE_LIZHANG_GOLD,
  RESOURCE_KIND_META,
} from '../data/config';

// ===== 模拟核心：纯函数，不依赖渲染/UI =====

export const TERRAIN_EMOJI: Record<Terrain, string> = {
  plain: '🌾',
  forest: '🌲',
  hill: '⛰️',
  mountain: '🏔️',
  river: '💧',
  pass: '🛡️',
  city: '🏯',
};
export const TERRAIN_NAME: Record<Terrain, string> = {
  plain: '平原',
  forest: '森林',
  hill: '丘陵',
  mountain: '山地',
  river: '江河',
  pass: '关隘',
  city: '城池',
};

const TERRAIN_BASE: Record<Terrain, { food: number; production: number; gold: number }> = {
  plain: { food: 4, production: 2, gold: 1 },
  forest: { food: 2, production: 4, gold: 1 },
  hill: { food: 2, production: 3, gold: 2 },
  mountain: { food: 1, production: 5, gold: 2 },
  river: { food: 3, production: 1, gold: 2 },
  pass: { food: 1, production: 2, gold: 1 },
  city: { food: 3, production: 3, gold: 5 },
};

// 特产（按正史填充）：织席贩履 / 畜牧肉食
export const SPECIALTY_EMOJI: Record<Exclude<Specialty, null>, string> = {
  weave: '👞',
  livestock: '🥩',
};
export const SPECIALTY_NAME: Record<Exclude<Specialty, null>, string> = {
  weave: '织席贩履（草鞋·草席）',
  livestock: '畜牧肉食',
};

// ===== 历法：回合=1旬，一月=3旬 =====
export const XUN_NAME = ['上旬', '中旬', '下旬'];
export const MONTH_NAME = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

// 公元年 → 汉廷年号（光和 178-183 / 中平 184-189 / 建安 196-220）
export function eraLabel(ad: number): { name: string; year: number } {
  if (ad <= 183) return { name: '光和', year: ad - 177 };
  if (ad <= 189) return { name: '中平', year: ad - 183 };
  if (ad <= 220) return { name: '建安', year: ad - 195 };
  return { name: '延康', year: 1 };
}
export function dateLabel(c: Calendar): string {
  const e = eraLabel(c.ad);
  const y = e.year === 1 ? '元' : String(e.year);
  return `${e.name}${y}年·${MONTH_NAME[c.month - 1]}·${XUN_NAME[c.xun - 1]}`;
}
// 公元年（数字纪年，用于顶栏与存档标注）
export function adLabel(c: Calendar): string {
  return `公元${c.ad}年`;
}
// 推进一旬（一回合一旬）
export function advanceCalendar(state: GameState): void {
  const c = state.calendar;
  c.xun += 1;
  if (c.xun > 3) {
    c.xun = 1;
    c.month += 1;
  }
  if (c.month > 12) {
    c.month = 1;
    c.ad += 1;
  }
}

// 等级产出乘数 / 升级阈值 已迁移至 src/data/config.ts（LAYER_MULT / LEVEL_REQ），此处不再写死。

export function neighbors(state: GameState, id: string): string[] {
  const res: string[] = [];
  for (const r of state.routes) {
    if (r.from === id) res.push(r.to);
    else if (r.to === id) res.push(r.from);
  }
  return res;
}

// 重算每个村落的有效产出（地形×等级×建筑×英雄）
export function recomputeYields(state: GameState): void {
  for (const v of state.villages) {
    const base = TERRAIN_BASE[v.terrain];
    const m = LEVEL_MULT[v.level - 1];
    let food = base.food * m + (v.buildings.includes('farm') ? 2 : 0) + (v.buildings.includes('well') ? 1 : 0) + (v.buildings.includes('granary') ? 3 : 0);
    let prod = base.production * m + (v.buildings.includes('workshop') ? 3 : 0);
    let gold = base.gold * m + (v.buildings.includes('school') ? 2 : 0);
    const hero = v.heroVillage ? state.heroes.find((h) => h.id === v.heroVillage) : null;
    if (hero && hero.unlocked) {
      food *= 1.3;
      prod *= 1.3;
    }
    // 特产加成（织席贩履→物资；畜牧肉食→粮）
    if (v.specialty === 'weave') prod += 2;
    else if (v.specialty === 'livestock') food += 2;
    v.yields = {
      food: Math.round(food),
      production: Math.round(prod),
      gold: Math.round(gold),
    };
  }
}

function village(state: GameState, id: string): Village {
  return state.villages.find((v) => v.id === id)!;
}
function spend(state: GameState, grain: number, gold: number): boolean {
  const r = state.resources.player;
  if (r.food < grain || r.gold < gold) return false;
  r.food -= grain;
  r.gold -= gold;
  return true;
}

// ===== 政治（控秩序）=====
export function setTax(state: GameState, id: string, value: number): string {
  const v = village(state, id);
  if (!canSetTax(state.title, id)) {
    return `🔒 ${v.name}尚非你可辖制之地，无权调税（晋升官职解锁）。`;
  }
  const cap = taxUpperBound(state.title, id);
  v.tax = Math.max(TAX_MIN, Math.min(cap, Math.round(value)));
  return `⚖️ 调整${v.name}赋税为 ${v.tax}${cap < TAX_MAX ? `（布衣限征，上限${cap}）` : ''}。`;
}
export function pacify(state: GameState, id: string): string | null {
  const v = village(state, id);
  if (!spend(state, 0, 5)) return '钱粮不足，无法安抚。';
  v.minxin = Math.min(100, v.minxin + 8);
  return `🕊️ 安抚${v.name}民心，民心 +8。`;
}
export function resolveDispute(state: GameState, id: string): string | null {
  const v = village(state, id);
  if (!spend(state, 0, 2)) return '钱粮不足，无法断案。';
  v.minxin = Math.min(100, v.minxin + 4);
  return `📜 处理${v.name}村内纠纷，民心 +4。`;
}

// ===== 人事（用人权）=====
export function appointChief(state: GameState, id: string): string | null {
  const v = village(state, id);
  if (v.chief) return `${v.name}已任命里长。`;
  if (v.population < 20) return `${v.name}人口不足，无法任命里长。`;
  v.chief = true;
  v.minxin = Math.min(100, v.minxin + 3);
  return `👤 ${v.name}任命里长，治理井然，民心 +3。`;
}
export function conscriptFarm(state: GameState, id: string): string {
  const v = village(state, id);
  const hero = v.heroVillage ? state.heroes.find((h) => h.id === v.heroVillage) : null;
  // 名声越高，招募越得人心（刘备善下人，加成显著）
  const repBonus = Math.floor(state.reputation / 15);
  const gain = (hero && hero.unlocked ? 6 : 4) + repBonus;
  v.population += gain;
  v.minxin = Math.max(0, v.minxin - 1);
  return `🌱 ${v.name}征召族人务农，人口 +${gain}${repBonus ? `（名声加成 +${repBonus}）` : ''}。`;
}
export function conscriptMilitia(state: GameState, id: string): string | null {
  const v = village(state, id);
  if (v.level < 2) return `${v.name}需 Lv2 方可征召乡勇。`;
  if (v.population < 5) return `${v.name}人口不足，无法征召乡勇。`;
  const hero = v.heroVillage ? state.heroes.find((h) => h.id === v.heroVillage) : null;
  const repBonus = Math.floor(state.reputation / 20);
  const gain = (hero && hero.unlocked ? 6 : 5) + repBonus;
  v.population -= 3;
  v.militia += gain;
  v.minxin = Math.max(0, v.minxin - 2);
  return `⚔️ ${v.name}征召乡勇 +${gain}（现有 ${v.militia}）${repBonus ? `（名声加成 +${repBonus}）` : ''}。`;
}
export function discoverCommoner(state: GameState, id: string): string {
  const v = village(state, id);
  v.population += 3;
  return `🔍 于${v.name}发掘本地平民，人口 +3。`;
}
export function unlockHero(state: GameState, id: string): string | null {
  const v = village(state, id);
  if (!v.heroVillage) return null;
  const hero = state.heroes.find((h) => h.id === v.heroVillage)!;
  if (hero.unlocked) return `${hero.name}已在此聚义。`;
  hero.unlocked = true;
  v.population += 5;
  recomputeYields(state);
  return `🎉 于${v.name}招揽英雄 ${hero.name}！${hero.bonus}`;
}

// ===== 内政（搞生产）=====
export function build(state: GameState, id: string, type: BuildType): string | null {
  const v = village(state, id);
  const info = BUILD_INFO[type];
  if (v.level < info.levelGate) return `${info.name}需村落 Lv${info.levelGate} 解锁。`;
  if (v.buildings.length >= TIER_PLOTS[v.tier])
    return `${v.name}空地已用尽（${TIER_PLOTS[v.tier]}），需升格以拓展。`;
  if (v.buildings.includes(type)) return `${v.name}已兴建${info.name}。`;
  if (!spend(state, info.cost.grain, info.cost.gold)) return '资源不足，无法兴建。';
  v.buildings.push(type);
  recomputeYields(state);
  return `🏗️ 于${v.name}兴建${info.name}。`;
}

// ===== 外交（对外联动）=====
export function trade(state: GameState, id: string, targetId: string): string | null {
  if (id === targetId) return null;
  const a = village(state, id);
  const b = village(state, targetId);
  if (a.owner !== 'player' || b.owner !== 'player') return '仅能与己方村落通商。';
  state.resources.player.food += 2;
  state.resources.player.gold += 2;
  return `🤝 ${a.name}与${b.name}小额通商，获粮 +2 金 +2。`;
}
export function mutualDefense(state: GameState, id: string, targetId: string): string | null {
  if (id === targetId) return null;
  const a = village(state, id);
  const b = village(state, targetId);
  if (a.owner !== 'player' || b.owner !== 'player') return '仅能与己方村落联防。';
  a.militia += 2;
  b.militia += 2;
  return `🛡️ ${a.name}与${b.name}缔结邻里联防，乡勇互援各 +2。`;
}

// ===== 升级体系 =====
export function upgrade(state: GameState, id: string): string | null {
  const v = village(state, id);
  if (v.level >= 5) {
    if (v.tier === 'li') {
      v.tier = 'ting';
      return `🏯 ${v.name}升格为「亭」！可管辖周边普通村，脱离村落层级。`;
    }
    return `${v.name}已为亭级，后续晋升乡/县需合并更多据点（待扩展）。`;
  }
  const req = LEVEL_REQ[v.level];
  const miss = req.buildings.filter((b) => !v.buildings.includes(b));
  if (v.population < req.pop || v.minxin < req.minxin || miss.length) {
    const need = `人口≥${req.pop}、民心≥${req.minxin}、建筑[${miss.map((b) => BUILD_INFO[b].name).join('·') || '齐全'}]`;
    return `⛔ ${v.name}未达 Lv${v.level + 1} 条件：${need}。`;
  }
  v.level += 1;
  recomputeYields(state);
  return `⭐ ${v.name}升至 Lv${v.level}！解锁更高权限。`;
}

// ===== 个人营生（布衣阶段主体玩法；权限门槛在 UI/主程序复核，引擎只算成效）=====
export function weave(state: GameState): string {
  const r = state.resources.player;
  r.gold += 4;
  r.food += 1;
  return '👞 织席贩履，得铜钱 +4、粮食 +1。';
}
export function chopWood(state: GameState): string {
  const r = state.resources.player;
  r.production += 3;
  r.food += 1;
  return '🪓 入山砍柴，得麻布 +3、粮食 +1。';
}
export function goHome(state: GameState, id: string): string {
  const v = village(state, id);
  v.minxin = Math.min(100, v.minxin + 2);
  return `🏠 归家歇息，宗族慰藉，${v.name} 民心 +2。`;
}
export function visitShrine(state: GameState, id: string): string {
  const v = village(state, id);
  state.reputation += 3;
  v.minxin = Math.min(100, v.minxin + 2);
  return `⛩️ 于${v.name}祭祖聚族，宗族声望 +3、民心 +2。`;
}

// 自动晋升：权限随玩法自然提升，避免卡关（门槛全部来自 config）
export function checkPromotion(state: GameState): void {
  const r = rankValue(state.title);
  const home = village(state, HOME_VILLAGE_ID);
  const gold = state.resources.player.gold;
  const promote = (title: string, msg: string): void => {
    state.title = title;
    state.log.unshift('🎖️ ' + msg);
  };
  if (r === 0 && gold >= PROMOTE_LIZHANG_GOLD) {
    state.flags['rooted'] = true;
    promote('里长', `乡老见你织席贩履、积攒家业，举荐你为大树楼桑里里长——自此可理一里民政。`);
  } else if (r === 1 && home.level >= 2) {
    promote('亭长', `因治理有方，涿县擢你为亭长——得调税、征勇、通商之权。`);
  } else if (r === 2 && home.level >= 3) {
    promote('乡长', `声威日著，迁你为乡长——可升格村落、辖周边诸里。`);
  }
}

// 开采资源点：立即采掘一次（产出 = 基数×2，受剩余储量限制），储量递减；耗尽标记 depleted。
export function mineResource(state: GameState, pointId: string): { ok: boolean; msg: string } {
  const pts = state.resourcePoints ?? [];
  const pt = pts.find((p) => p.id === pointId);
  if (!pt || !pt.developed) return { ok: false, msg: '该资源点尚不可开采。' };
  if (pt.depleted || pt.stock <= 0) {
    pt.depleted = true;
    return { ok: false, msg: `【${pt.name}】已开采殆尽。` };
  }
  const meta = RESOURCE_KIND_META[pt.kind];
  const gain = Math.min(pt.stock, meta.yield * 2);
  pt.stock -= gain;
  const r = state.resources.player;
  if (meta.resource === 'food') r.food += gain;
  else if (meta.resource === 'gold') r.gold += gain;
  else r.production += gain;
  if (pt.stock <= 0) pt.depleted = true;
  return { ok: true, msg: `⛏️ 开采【${pt.name}】得 ${meta.label} ${gain}（余 ${pt.stock}）。` };
}

// 落地行动分支成效（五维 / 资源 / 人脉 flag / 揭示 NPC / 大世界资源点）
export function applyBranchReward(state: GameState, reward: BranchReward): void {
  if (reward.attr)
    for (const k of Object.keys(reward.attr) as (keyof typeof reward.attr)[])
      state.attr[k] = (state.attr[k] ?? 0) + (reward.attr[k] ?? 0);
  if (reward.res) {
    const r = state.resources.player;
    r.gold += reward.res.gold ?? 0;
    r.food += reward.res.food ?? 0;
    r.production += reward.res.production ?? 0;
  }
  if (reward.flags) for (const f of reward.flags) state.flags[f] = true;
  if (reward.unlockNpc) {
    const npc = state.npcs.find((n) => n.id === reward.unlockNpc);
    if (npc) npc.status = 'developed'; // 揭示既定 NPC（人物志/人际树）
    state.flags['met_' + reward.unlockNpc] = true;
  }
  if (reward.spawnResource) spawnResourcePoint(state, reward.spawnResource);
}

// 在大世界（玩家本村附近）生成一处可开采资源点，制造「慢慢增加」的观感
export function spawnResourcePoint(state: GameState, kind: ResourceKind): void {
  const meta = RESOURCE_KIND_META[kind];
  const pts = (state.resourcePoints ??= []);
  const home = state.villages.find((v) => v.id === HOME_VILLAGE_ID);
  const base = home ? home.position : [0, 0];
  const ang = Math.random() * Math.PI * 2;
  const dist = 130 + Math.random() * 140; // 本村附近散布
  const pos: [number, number] = [
    Math.round(base[0] + Math.cos(ang) * dist),
    Math.round(base[1] + Math.sin(ang) * dist),
  ];
  const id = `rp_${kind}_${pts.length + 1}`;
  const pt: ResourcePoint = {
    id,
    name: meta.name,
    kind,
    emoji: meta.emoji,
    position: pos,
    owner: 'player',
    developed: true,
    depleted: false,
    stock: meta.stock,
    maxStock: meta.stock,
    yieldPerTurn: meta.yield,
    desc: meta.desc,
  };
  pts.push(pt);
  state.log.unshift(`⛏️ 大世界新增资源点：【${meta.name}】——${meta.desc}`);
}

// ===== 回合结算 =====
export function processTurn(state: GameState): void {
  state.turn += 1;
  const r = state.resources.player;
  for (const v of state.villages) {
    recomputeYields(state);
    r.food += v.yields.food + (v.minxin > 50 ? 2 : 0);
    r.production += v.yields.production;
    r.gold += v.yields.gold + Math.round((v.population * v.tax) / 100 * 0.2);

    // 民心向目标漂移（赋税越高目标越低）
    const target = Math.max(20, 62 - (v.tax - 35) * 0.5);
    if (v.minxin < target) v.minxin = Math.min(target, v.minxin + 2);
    else if (v.minxin > target) v.minxin = Math.max(target, v.minxin - 2);

    // 人口自然增减
    if (v.minxin >= 60) v.population += 2;
    else if (v.minxin < 30) {
      v.population = Math.max(0, v.population - 2);
      if (v.minxin < 25) state.log.unshift(`⚠️ ${v.name}民心低迷，恐生流民动乱！`);
    }
  }

  // 大世界资源点：玩家已开发且未耗尽者，每回合被动产出（开采细节之一）
  for (const pt of state.resourcePoints ?? []) {
    if (!pt.developed || pt.depleted || pt.stock <= 0) {
      if (pt.stock <= 0) pt.depleted = true;
      continue;
    }
    const meta = RESOURCE_KIND_META[pt.kind];
    const gain = Math.min(pt.stock, meta.yield);
    pt.stock -= gain;
    if (meta.resource === 'food') r.food += gain;
    else if (meta.resource === 'gold') r.gold += gain;
    else r.production += gain;
    if (pt.stock <= 0) pt.depleted = true;
  }
}

// ===== 触发判定（任务与奇遇复用，避免重复逻辑）=====
function triggerOk(state: GameState, t: QuestTrigger): boolean {
  switch (t.type) {
    case 'start':
      return true;
    case 'date':
      return state.calendar.ad >= t.ad;
    case 'flag':
      return !!state.flags[t.key];
    case 'hero': {
      const heroId = t.heroId; // 闭包内捕获具体值，避免联合类型收窄丢失
      return state.heroes.some((h) => h.id === heroId && h.unlocked);
    }
  }
}

// ===== 剧情任务引擎 =====
export function questAvailable(state: GameState, q: Quest): boolean {
  return triggerOk(state, q.trigger);
}

// ===== 树状奇遇引擎 =====
export function adventureAvailable(state: GameState, adv: Adventure): boolean {
  return triggerOk(state, adv.trigger);
}

export function currentAdventureNode(state: GameState, adv: Adventure): AdventureNode | null {
  const prog = state.adventureState?.[adv.id];
  if (!prog || prog.done) return null;
  return adv.nodes.find((n) => n.id === prog.current) ?? null;
}

// 前置要求校验（不满足则不可选）
export function choiceMet(state: GameState, req?: AdventureReq): boolean {
  if (!req) return true;
  if (req.flag && !state.flags[req.flag]) return false;
  if (req.reputation !== undefined && state.reputation < req.reputation) return false;
  if (req.villageLevel) {
    const v = state.villages.find((x) => x.id === req.villageLevel!.id);
    if (!v || v.level < req.villageLevel.level) return false;
  }
  return true;
}

export interface AdventureResult {
  ok: boolean;
  msg: string;
}

function applyAdvEffect(state: GameState, e: AdventureEffect): void {
  const r = state.resources.player;
  switch (e.kind) {
    case 'resource':
      r.gold += e.gold ?? 0;
      r.food += e.food ?? 0;
      r.production += e.production ?? 0;
      break;
    case 'reputation':
      state.reputation += e.value;
      break;
    case 'flag':
      state.flags[e.key] = true;
      break;
    case 'unlockHero': {
      const h = state.heroes.find((x) => x.id === e.heroId);
      if (h) h.unlocked = true;
      break;
    }
    case 'title':
      state.title = e.value;
      break;
    case 'minxin': {
      const v = state.villages.find((x) => x.id === e.villageId);
      if (v) v.minxin = Math.max(0, Math.min(100, v.minxin + e.value));
      break;
    }
    case 'population': {
      const v = state.villages.find((x) => x.id === e.villageId);
      if (v) v.population = Math.max(0, v.population + e.value);
      break;
    }
    case 'militia': {
      const v = state.villages.find((x) => x.id === e.villageId);
      if (v) v.militia = Math.max(0, v.militia + e.value);
      break;
    }
  }
}

// 选择一个分支：校验 → 应用成效 → 推进到 next 节点或标记 done
export function chooseAdventure(
  state: GameState,
  adv: Adventure,
  choiceId: string,
): AdventureResult {
  const node = currentAdventureNode(state, adv);
  if (!node) return { ok: false, msg: '该奇遇已结束或尚未开放。' };
  const choice: AdventureChoice | undefined = node.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, msg: '无效的分支选项。' };
  if (!choiceMet(state, choice.require)) return { ok: false, msg: '前置条件未满足，无法选择此支。' };

  for (const e of choice.effects) applyAdvEffect(state, e);
  recomputeYields(state);

  const prog = state.adventureState[adv.id];
  if (choice.next) {
    prog.current = choice.next;
    return { ok: true, msg: `🌿 你选择了「${choice.label}」，际遇向前延展……` };
  }
  prog.done = true;
  prog.current = null;
  return { ok: true, msg: `🌿 你选择了「${choice.label}」，此段奇遇就此落定。` };
}

export function questComplete(state: GameState, q: Quest): boolean {
  const c = q.complete;
  switch (c.type) {
    case 'manual':
      return false; // 需玩家手动承接
    case 'flag':
      return !!state.flags[c.key];
    case 'heroUnlocked': {
      const heroId = c.heroId;
      return state.heroes.some((h) => h.id === heroId && h.unlocked);
    }
    case 'villageHas': {
      const vid = c.id;
      const chief = c.chief;
      const level = c.level;
      const buildings = c.buildings;
      const v = state.villages.find((x) => x.id === vid);
      if (!v) return false;
      if (chief !== undefined && v.chief !== chief) return false;
      if (level !== undefined && v.level < level) return false;
      if (buildings) for (const b of buildings) if (!v.buildings.includes(b)) return false;
      return true;
    }
  }
}

export function applyQuestEffects(state: GameState, q: Quest): void {
  for (const e of q.effects) {
    if (e.kind === 'resource') {
      state.resources.player.gold += e.gold ?? 0;
      state.resources.player.food += e.food ?? 0;
      state.resources.player.production += e.production ?? 0;
    } else if (e.kind === 'reputation') {
      state.reputation += e.value;
    } else if (e.kind === 'flag') {
      state.flags[e.key] = true;
    } else if (e.kind === 'unlockHero') {
      const h = state.heroes.find((x) => x.id === e.heroId);
      if (h) h.unlocked = true;
      recomputeYields(state);
    } else if (e.kind === 'title') {
      state.title = e.value;
    }
  }
}

// ===== 动态事件 / 危机系统 =====
function eventTriggerOk(state: GameState, t: EventTrigger): boolean {
  switch (t.type) {
    case 'everyTurn':
      return Math.random() < t.chance;
    case 'date':
      return state.calendar.ad >= t.ad;
    case 'flag':
      return !!state.flags[t.key];
    case 'repBelow':
      return state.reputation < t.value;
    case 'minxinBelow': {
      const v = state.villages.find((x) => x.id === t.villageId);
      return !!v && v.minxin <= t.value;
    }
    default:
      return false;
  }
}

// 回合结束抽取一个可触发事件（once 事件已触发过则不再出现）
export function rollEvents(state: GameState, events: GameEvent[]): string | null {
  if (state.status !== 'playing') return null;
  const cands = events.filter((e) => {
    if (e.once && state.flags['evt_done_' + e.id]) return false;
    return eventTriggerOk(state, e.trigger);
  });
  if (!cands.length) return null;
  const pick = cands[Math.floor(Math.random() * cands.length)];
  return pick.id;
}

// 选择一个事件选项：校验 → 应用成效(复用 applyAdvEffect) → 标记 once → 清 pending → 失败判定
export function chooseEvent(
  state: GameState,
  events: GameEvent[],
  eventId: string,
  choiceId: string,
): { ok: boolean; msg: string } {
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return { ok: false, msg: '事件不存在。' };
  const ch = ev.choices.find((c) => c.id === choiceId);
  if (!ch) return { ok: false, msg: '无效选项。' };
  if (ch.require) {
    if (ch.require.flag && !state.flags[ch.require.flag])
      return { ok: false, msg: '条件不足，无法选择此策。' };
    if (ch.require.reputation !== undefined && state.reputation < ch.require.reputation)
      return { ok: false, msg: '声望不足，难以为之。' };
  }
  if (ch.cost) {
    const r = state.resources.player;
    const g = ch.cost.gold ?? 0;
    const f = ch.cost.food ?? 0;
    if (r.gold < g || r.food < f) return { ok: false, msg: '资源不足以执行此策。' };
    r.gold -= g;
    r.food -= f;
  }
  for (const e of ch.effects) applyAdvEffect(state, e);
  recomputeYields(state);
  if (ev.once) state.flags['evt_done_' + ev.id] = true;
  state.pendingEventId = null;
  checkDefeat(state);
  return { ok: true, msg: ch.resultText };
}

// 失败判定（宽容）：本村民心归零或本村陷落 → 败北
export function checkDefeat(state: GameState): boolean {
  const home = state.villages.find((v) => v.id === HOME_VILLAGE_ID);
  if (home && home.minxin <= 0) {
    home.minxin = 0;
    state.status = 'lost';
    return true;
  }
  if (state.flags['home_fallen']) {
    state.status = 'lost';
    return true;
  }
  return false;
}
