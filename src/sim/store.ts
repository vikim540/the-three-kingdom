import type { Scenario, FactionId, Route, Village, Hero, Realm, BuildType, Quest, Npc, HeroStat, ResourcePoint } from '../data/types';
import {
  setTax,
  pacify,
  resolveDispute,
  appointChief,
  conscriptFarm,
  conscriptMilitia,
  discoverCommoner,
  unlockHero,
  build,
  trade,
  mutualDefense,
  upgrade,
  processTurn,
  recomputeYields,
  advanceCalendar,
  questAvailable,
  questComplete,
  applyQuestEffects,
  chooseAdventure,
  rollEvents,
  chooseEvent,
  checkDefeat,
  weave,
  chopWood,
  goHome,
  visitShrine,
  checkPromotion,
  applyBranchReward,
  mineResource,
} from './engine';
import {
  rollEventCandidates,
  EVENT_LINE,
  MONTHLY_DRAW,
  CARD_CATEGORIES,
  rankValue,
  type GachaCandidate,
  type CardCategory,
} from '../data/config';
import { serialize, deserialize, storage, SAVE_PREFIX } from './persistence';
import { deepMerge, setByPath } from './path';

// 主角/世界的可替换视觉资源（编辑态上传存为 dataURL；卡面/背景亦支持 public/assets 路径）
export interface GameAssets {
  mapBackground?: string; // 大世界画布底图
  protagonistPortrait?: string; // 主角立绘
  heroPortraits?: Record<string, string>; // 英雄 id → 立绘
  cardBackgrounds?: Record<string, string>; // 卡种类 → 卡面背景
}

export type MapMode = 'owner' | 'terrain' | 'elevation';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface Resources {
  food: number;
  production: number;
  gold: number;
}

export interface GameState {
  scenarioName: string;
  realm: Realm;
  turn: number;
  calendar: { ad: number; month: number; xun: number };
  reputation: number; // 声望（影响招募）
  title: string; // 官职
  attr: HeroStat; // 主角资质（统武智政魅），由奇遇卡牌抽象改变
  flags: Record<string, boolean>;
  questsCompleted: string[];
  announcedQuests: string[];
  introVisible: boolean; // 开场白弹窗
  villages: Village[];
  routes: Route[];
  factions: Scenario['factions'];
  heroes: Hero[];
  npcs: Npc[];
  resources: Record<FactionId, Resources>;
  selectedId: string | null;
  log: string[];
  status: GameStatus;
  mapMode: MapMode;
  // 树状奇遇进度：每棵奇遇当前所在节点（current），及是否已收敛完成（done）
  adventureState: Record<string, { current: string | null; done: boolean }>;
  pendingEventId: string | null; // 当前等待抉择的危机事件（回合结束抽取）
  assets: GameAssets; // 可替换视觉资源（编辑态上传 / 默认 public/assets）
  // ===== 月度行动事件卡 =====
  resourcePoints: ResourcePoint[]; // 大世界可开采资源点（由事件分支生成，慢慢丰富世界）
  gachaCandidates: GachaCandidate[]; // 本月朔日生成的 3 张未知候选（大类/稀有度/预 rolled 分支数值已固化）
  activeEvent: GachaCandidate | null; // 本月进行中的事件（择 1 后固化，含预 rolled 分支数值）
  completedBranches: string[]; // 本月已施行的分支 id（避免重复）
  eventDrawDue: boolean; // 朔日已可抽卡（供 UI 自动弹窗）
}

export class GameStore {
  state: GameState;
  private listeners = new Set<() => void>();
  private scenario: Scenario;

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.state = {
      scenarioName: scenario.name,
      realm: scenario.realm,
      turn: 1,
      calendar: { ad: 183, month: 1, xun: 1 }, // 汉灵帝光和六年·正月·上旬
      reputation: scenario.startReputation ?? 5,
      title: scenario.startTitle ?? '布衣',
      attr: scenario.startAttr ?? { lead: 60, war: 66, int: 72, pol: 78, cha: 84 },
      flags: {},
      questsCompleted: [],
      announcedQuests: [],
      introVisible: true,
      villages: scenario.villages.map((v) => ({ ...v, buildings: [...v.buildings] })),
      routes: scenario.routes.map((r) => ({ ...r })),
      factions: scenario.factions,
      heroes: scenario.heroes.map((h) => ({ ...h })),
      npcs: scenario.npcs.map((n) => ({ ...n })),
      adventureState: Object.fromEntries(
        scenario.adventures.map((a) => [a.id, { current: a.rootId, done: false }]),
      ),
      resources: {
        player: { food: 20, production: 0, gold: 30 },
        yellow_turban: { food: 0, production: 0, gold: 0 },
        neutral: { food: 0, production: 0, gold: 0 },
      },
      selectedId: scenario.playerStart,
      log: [
        `【${scenario.name}】公元183年（汉灵帝光和六年），刘备聚族于大树楼桑里，织席贩履，志在安邦。`,
      ],
      status: 'playing',
      mapMode: 'owner',
      pendingEventId: null,
      assets: { heroPortraits: {}, cardBackgrounds: {} },
      resourcePoints: [],
      gachaCandidates: [],
      activeEvent: null,
      completedBranches: [],
      eventDrawDue: false,
    };
    recomputeYields(this.state);
    // 开局即开放的任务，记入已公告
    for (const q of scenario.quests) {
      if (questAvailable(this.state, q)) {
        this.state.announcedQuests.push(q.id);
        this.state.log.unshift(`📜 新剧情解锁：${q.title}（${q.era}）`);
      }
    }
    // 开局即给出首月行动事件候选（朔日抽卡）
    this.maybeStartMonthEvent();
    // replay 开发覆盖层（编辑模式 v2：与玩家存档分离的独立层）
    this.applyDevOverridesNow();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private notify(): void {
    this.listeners.forEach((f) => f());
  }
  private act(msg: string | null): void {
    if (msg) this.state.log.unshift(msg);
    recomputeYields(this.state);
    checkPromotion(this.state);
    this.notify();
  }

  select(id: string | null): void {
    this.state.selectedId = id;
    this.notify();
  }

  // 政治
  setTax(id: string, value: number): void {
    this.act(setTax(this.state, id, value));
  }
  pacify(id: string): void {
    this.act(pacify(this.state, id));
  }
  resolveDispute(id: string): void {
    this.act(resolveDispute(this.state, id));
  }
  // 人事
  appointChief(id: string): void {
    this.act(appointChief(this.state, id));
  }
  conscriptFarm(id: string): void {
    this.act(conscriptFarm(this.state, id));
  }
  conscriptMilitia(id: string): void {
    this.act(conscriptMilitia(this.state, id));
  }
  discoverCommoner(id: string): void {
    this.act(discoverCommoner(this.state, id));
  }
  unlockHero(id: string): void {
    this.act(unlockHero(this.state, id));
  }
  // 内政
  build(id: string, type: BuildType): void {
    this.act(build(this.state, id, type));
  }
  // 外交
  trade(id: string, targetId: string): void {
    this.act(trade(this.state, id, targetId));
  }
  mutualDefense(id: string, targetId: string): void {
    this.act(mutualDefense(this.state, id, targetId));
  }
  // 升级
  upgrade(id: string): void {
    this.act(upgrade(this.state, id));
  }
  // 个人营生（布衣阶段主体玩法）
  weave(): void {
    this.act(weave(this.state));
  }
  chopWood(): void {
    this.act(chopWood(this.state));
  }
  goHome(id: string): void {
    this.act(goHome(this.state, id));
  }
  visitShrine(id: string): void {
    this.act(visitShrine(this.state, id));
  }

  // 朔日触发：生成 3 张未知候选（含营生保底），待玩家择 1。每月仅一次。
  maybeStartMonthEvent(): void {
    const s = this.state;
    if (s.activeEvent || s.gachaCandidates.length) return;
    s.gachaCandidates = rollEventCandidates(MONTHLY_DRAW.candidates, true);
    s.eventDrawDue = true;
    this.state.log.unshift('🎴 朔日已至：可抽本月行动事件卡（顶栏「🎴 抽卡」）。');
  }

  // 择 1：从候选中选一张作为本月事件；扣铜钱、固化为本月事件、清空候选。
  pickEventCard(cardId: string): { ok: boolean; msg: string; card?: GachaCandidate } {
    const s = this.state;
    const card = s.gachaCandidates.find((c) => c.id === cardId);
    if (!card) return { ok: false, msg: '该卡不在本月候选中。' };
    if (s.resources.player.gold < MONTHLY_DRAW.cost)
      return {
        ok: false,
        msg: `铜钱不足，需 💰${MONTHLY_DRAW.cost}（现有 💰${s.resources.player.gold}）。可织席贩履积攒后再来抽卡。`,
      };
    s.resources.player.gold -= MONTHLY_DRAW.cost;
    s.gachaCandidates = [];
    s.eventDrawDue = false;
    s.activeEvent = card; // 择 1 即固化本月事件（含预 rolled 分支数值）
    s.completedBranches = [];
    const cat = CARD_CATEGORIES[card.category];
    this.act(
      `🎴 选定本月事件：【${cat.name}·${card.name}】(${EVENT_LINE[card.category]}线 · ${card.rarityName})，耗💰${MONTHLY_DRAW.cost}。`,
    );
    return { ok: true, msg: '', card };
  }

  // 执行事件分支（本月内可多次；布衣受 requireOfficial 闸门）
  executeBranch(branchId: string): { ok: boolean; msg: string } {
    const s = this.state;
    const ae = s.activeEvent;
    if (!ae) return { ok: false, msg: '本月尚无进行中的事件。' };
    if (s.completedBranches.includes(branchId)) return { ok: false, msg: '该行动本月已施行。' };
    const b = ae.branches.find((x) => x.id === branchId);
    if (!b) return { ok: false, msg: '分支不存在。' };
    if (b.requireOfficial && rankValue(s.title) === 0)
      return { ok: false, msg: '此乃官府之事，布衣未授官不可为（晋升后解锁）。' };
    applyBranchReward(s, b.rolledReward); // 落地预 rolled 的成效（五维/资源/flag/资源点/揭示NPC）
    s.completedBranches.push(branchId);
    this.act(`✅ ${b.label}：${b.resultText}`);
    // 全部分支完成 → 本月事件了结，下月朔日再抽
    if (s.completedBranches.length >= ae.branches.length) {
      s.activeEvent = null;
      s.log.unshift('🗓️ 本月事件已了，静待朔日再启新机。');
    }
    return { ok: true, msg: b.resultText };
  }

  // 开采资源点（大世界细节）：包装引擎 mineResource
  extractResource(pointId: string): { ok: boolean; msg: string } {
    return mineResource(this.state, pointId);
  }

  // 剧情：承接并完成一条任务
  acknowledgeQuest(id: string): void {
    const q = this.scenario.quests.find((x) => x.id === id);
    if (!q) return;
    if (this.state.questsCompleted.includes(id)) return;
    if (!questAvailable(this.state, q)) return;
    if (!questComplete(this.state, q) && q.complete.type !== 'manual') return;
    applyQuestEffects(this.state, q);
    this.state.questsCompleted.push(id);
    this.state.log.unshift(`📜 承接并完成：${q.title}`);
    this.notify();
  }

  dismissIntro(): void {
    this.state.introVisible = false;
    this.notify();
  }

  // 树状奇遇：选择一个分支（校验/成效/推进由引擎处理）
  chooseAdventure(advId: string, choiceId: string): void {
    const adv = this.scenario.adventures.find((x) => x.id === advId);
    if (!adv) return;
    const res = chooseAdventure(this.state, adv, choiceId);
    this.act(res.msg);
  }

  // 动态事件：选择一个危机选项（校验/成效/失败判定由引擎处理），返回结果供 UI 播报
  resolveEvent(eventId: string, choiceId: string): { ok: boolean; msg: string } {
    const res = chooseEvent(this.state, this.scenario.events, eventId, choiceId);
    this.act(res.msg);
    return res;
  }

  endTurn(): void {
    if (this.state.status !== 'playing') return;
    this.state.log.unshift(`—— 第 ${this.state.turn} 回合（旬）结束 ——`);
    advanceCalendar(this.state);
    processTurn(this.state);
    checkPromotion(this.state);
    // 朔日（xun===1 且已历至少一回）= 新一月开始 → 触发本月抽卡
    if (this.state.calendar.xun === 1 && this.state.turn > 1) this.maybeStartMonthEvent();
    // 评测任务解锁
    for (const q of this.scenario.quests) {
      if (
        questAvailable(this.state, q) &&
        !this.state.announcedQuests.includes(q.id)
      ) {
        this.state.announcedQuests.push(q.id);
        this.state.log.unshift(`📜 新剧情解锁：${q.title}（${q.era}）`);
      }
    }
    // 抽取危机事件（每回合按概率/条件触发），交由 UI 弹窗抉择
    const evtId = rollEvents(this.state, this.scenario.events);
    if (evtId) {
      const ev = this.scenario.events.find((e) => e.id === evtId);
      this.state.pendingEventId = evtId;
      this.state.log.unshift(`⚠️ 突发事件：${ev?.title ?? evtId}`);
    }
    checkDefeat(this.state);
    this.autoSave();
    this.notify();
  }

  // ===== 存档 / 读档（存储适配器可替换）=====
  save(slot: string): void {
    storage.save(SAVE_PREFIX + slot, serialize(this.state));
    this.state.log.unshift(`💾 已存档（${slot}）。`);
    this.notify();
  }
  load(slot: string): boolean {
    const raw = storage.load(SAVE_PREFIX + slot);
    if (!raw) {
      this.state.log.unshift(`⚠️ 存档（${slot}）不存在。`);
      this.notify();
      return false;
    }
    this.hydrate(deserialize(raw));
    this.notify();
    return true;
  }
  hasSave(slot: string): boolean {
    return storage.load(SAVE_PREFIX + slot) !== null;
  }
  private autoSave(): void {
    storage.save(SAVE_PREFIX + 'auto', serialize(this.state));
  }

  private hydrate(d: any): void {
    this.state.scenarioName = d.scenarioName ?? this.state.scenarioName;
    this.state.realm = d.realm ?? this.state.realm;
    this.state.turn = d.turn ?? this.state.turn;
    this.state.calendar = d.calendar ?? this.state.calendar;
    this.state.reputation = d.reputation ?? this.state.reputation;
    this.state.title = d.title ?? this.state.title;
    this.state.attr = d.attr ?? { lead: 60, war: 66, int: 72, pol: 78, cha: 84 };
    this.state.flags = d.flags ?? {};
    this.state.assets = d.assets ?? { heroPortraits: {}, cardBackgrounds: {} };
    this.state.questsCompleted = d.questsCompleted ?? [];
    this.state.announcedQuests = d.announcedQuests ?? [];
    this.state.resources = d.resources ?? this.state.resources;
    this.state.villages = d.villages ?? this.state.villages;
    this.state.heroes = d.heroes ?? this.state.heroes;
    this.state.npcs = d.npcs ?? this.state.npcs;
    this.state.log = d.log ?? this.state.log;
    this.state.selectedId = d.selectedId ?? this.state.selectedId;
    this.state.status = d.status ?? this.state.status;
    this.state.mapMode = d.mapMode ?? this.state.mapMode;
    this.state.adventureState = d.adventureState ?? {};
    this.state.pendingEventId = d.pendingEventId ?? null;
    this.state.resourcePoints = d.resourcePoints ?? [];
    this.state.gachaCandidates = Array.isArray(d.gachaCandidates) ? d.gachaCandidates : [];
    this.state.activeEvent = d.activeEvent ?? null;
    this.state.completedBranches = Array.isArray(d.completedBranches) ? d.completedBranches : [];
    this.state.eventDrawDue = d.eventDrawDue ?? false;
    this.state.introVisible = false;
    // replay 开发覆盖层（编辑模式 v2：独立于玩家存档的覆盖层，最高优先级）
    const dev = loadDevOverrides();
    this.state = deepMerge(this.state, dev);
    recomputeYields(this.state);
  }

  setMapMode(mode: MapMode): void {
    this.state.mapMode = mode;
    this.notify();
  }

  // 轻量通知：地图层级切换等不改变游戏状态、但需刷新 UI（面包屑）的场景使用
  touch(): void {
    this.notify();
  }

  // 开发/编辑模式专用：绕过游戏规则、直接落地 state 改动并自动存档（不写日志、不重算产出）
  commit(): void {
    storage.save(SAVE_PREFIX + 'auto', serialize(this.state));
    this.notify();
  }
  reset(scenario: Scenario): void {
    this.state = new GameStore(scenario).state;
    this.notify();
  }

  // ===== 开发覆盖层（编辑模式 v2：独立于玩家存档的覆盖层 + 独立 localStorage 键）=====
  private devOverrides: any = loadDevOverrides();

  // 把某路径写回到 devOverrides 并即时应用于 live state（与玩家存档分离，存独立键）
  setDevOverride(path: string, value: any): void {
    setByPath(this.devOverrides, path, value);
    setByPath(this.state, path, value);
    saveDevOverrides(this.devOverrides);
    this.notify();
  }
  getDevOverrides(): any {
    return JSON.parse(JSON.stringify(this.devOverrides));
  }
  // 一键导出开发覆盖（供提交/复用，不影响玩家存档）
  exportDev(): string {
    return JSON.stringify(this.devOverrides, null, 2);
  }
  // 清空开发覆盖（仅清覆盖层与独立键；如需完全复原请重载页面重新开始）
  clearDevOverrides(): void {
    this.devOverrides = {};
    saveDevOverrides(this.devOverrides);
    this.notify();
  }
  private applyDevOverridesNow(): void {
    this.state = deepMerge(this.state, this.devOverrides);
    recomputeYields(this.state);
  }
}

// 开发覆盖层独立存储键（与玩家存档 sank_save_* 完全隔离）
const DEV_OVERRIDES_KEY = 'sank_dev_overrides';
function loadDevOverrides(): any {
  try {
    const raw = storage.load(DEV_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveDevOverrides(o: any): void {
  try {
    storage.save(DEV_OVERRIDES_KEY, JSON.stringify(o));
  } catch {
    /* 配额超限静默 */
  }
}
