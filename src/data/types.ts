// ===== 数据模型：严格沿用汉制四级行政（郡→县→乡/亭→里），里为最小操作单元 =====

// 行政层级：里(村落) → 亭 → 乡 → 县(主城) → 郡(大区)
export type Tier = 'li' | 'ting' | 'xiang' | 'xian' | 'jun';
export const TIER_NAME: Record<Tier, string> = {
  li: '里',
  ting: '亭',
  xiang: '乡',
  xian: '县',
  jun: '郡',
};
// 层级晋升顺序（升格递进：里→亭→乡→县→郡）
export const TIER_ORDER: Tier[] = ['li', 'ting', 'xiang', 'xian', 'jun'];
// 空地容量（按层级比例设定：里4→亭7→乡11→县16→郡24，逐级约 1.6–1.7 倍）
export const TIER_PLOTS: Record<Tier, number> = {
  li: 4,
  ting: 7,
  xiang: 11,
  xian: 16,
  jun: 24,
};

export type Terrain = 'plain' | 'forest' | 'hill' | 'mountain' | 'river' | 'pass' | 'city';
export type FactionId = 'player' | 'yellow_turban' | 'neutral';

// 村落特产地标（按正史填充）：织席贩履 / 畜牧肉食
export type Specialty = 'weave' | 'livestock' | null;

// ===== 历法：回合=1旬，一月=3旬 =====
export interface Calendar {
  ad: number; // 公元年（用于纪年与剧本触发）
  month: number; // 1-12
  xun: number; // 1-3（上/中/下旬）
}

// ===== 剧情/任务（数据驱动，可由 AI 批量灌入）=====
export type QuestTrigger =
  | { type: 'start' } // 开局即开放
  | { type: 'date'; ad: number } // 到达公元年（含）触发
  | { type: 'flag'; key: string } // 某标记达成后触发
  | { type: 'hero'; heroId: string }; // 招揽某英雄后触发

export type QuestComplete =
  | { type: 'manual' } // 玩家手动承接即完成
  | { type: 'villageHas'; id: string; chief?: boolean; buildings?: BuildType[]; level?: number }
  | { type: 'heroUnlocked'; heroId: string }
  | { type: 'flag'; key: string };

export type QuestEffect =
  | { kind: 'resource'; gold?: number; food?: number; production?: number }
  | { kind: 'reputation'; value: number }
  | { kind: 'flag'; key: string }
  | { kind: 'unlockHero'; heroId: string }
  | { kind: 'title'; value: string };

export interface Quest {
  id: string;
  chapter: string; // 章节（如「青年蓄力」）
  title: string;
  era: string; // 时间标注（如「光和六年」）
  trigger: QuestTrigger;
  complete: QuestComplete;
  desc: string; // 历史原文/剧情
  objective: string; // 任务目标
  effects: QuestEffect[];
}

// 建筑类型（内政维度），含等级门槛与造价
export type BuildType = 'farm' | 'well' | 'workshop' | 'granary' | 'school';
export const BUILD_INFO: Record<
  BuildType,
  { name: string; desc: string; levelGate: number; cost: { grain: number; gold: number } }
> = {
  farm: { name: '农田', desc: '开垦田地，提升粮食产出', levelGate: 1, cost: { grain: 0, gold: 4 } },
  well: { name: '水井仓储', desc: '打井修仓，稳固补给', levelGate: 1, cost: { grain: 6, gold: 2 } },
  workshop: { name: '村坊', desc: 'Lv2 解锁：简易作坊，增基础物资', levelGate: 2, cost: { grain: 8, gold: 6 } },
  granary: { name: '粮仓', desc: 'Lv3 解锁：自建粮仓，长期囤粮', levelGate: 3, cost: { grain: 10, gold: 8 } },
  school: { name: '村塾', desc: 'Lv4 解锁：培育基层小吏', levelGate: 4, cost: { grain: 6, gold: 12 } },
};

// 英雄五维数值（RPG 化：统率/武力/智力/政治/魅力）
export interface HeroStat {
  lead: number; // 统率
  war: number; // 武力
  int: number; // 智力
  pol: number; // 政治
  cha: number; // 魅力
}

// 开发状态（组件化徽章，避免散落硬编码）
export type DevStatus = 'developed' | 'to_develop';

// NPC 人物（非英雄角色，集中定义；关系网络统一引用，避免名字硬编码）
export interface Npc {
  id: string;
  name: string;
  relation: string; // 关系标签：父 / 母 / 师 / 友 / 主君 / 义兄弟 …
  note?: string;
  boundVillage?: string; // 已开发地点（点击可跳转聚焦）
  region?: string; // 地名（待开发地点的描述）
  status: DevStatus; // 已开发 / 待开发
}

// 人物关系引用（统一指向英雄或 NPC，渲染时解析，杜绝重复硬编码）
export type CharRef = { kind: 'hero'; id: string } | { kind: 'npc'; id: string };

// 英雄人物（绑定特定聚落，带羁绊增益 + RPG 数值 + 故里/宗族 + 立绘）
export interface Hero {
  id: string;
  name: string;
  title: string;
  emoji: string; // 头像/立绘占位 emoji（数据驱动，避免散落硬编码）
  boundVillage: string; // 对应 Village.id
  bond: string; // 羁绊描述
  bonus: string; // 增益描述
  unlocked: boolean;
  stats: HeroStat; // 五维数值
  hometown: string; // 故里故事（代入视角可见）
  clan: CharRef[]; // 宗族 / 人际网络（引用 NPC 或英雄）
  biography: string; // 人物小传
  portrait?: string; // 立绘路径（预留，长方形 3:4）
}

export interface Village {
  id: string;
  name: string;
  tier: Tier; // 初始皆 'li'，满级升格为 'ting'
  level: number; // 1..5
  position: [number, number];
  terrain: Terrain;
  elevation: number;
  owner: FactionId;
  population: number; // 人口（稳定人口，升级判定项）
  minxin: number; // 民心 0-100（政治核心指标）
  tax: number; // 赋税 0-100（政治操作）
  chief: boolean; // 是否任命里长（人事）
  militia: number; // 乡勇（人事/防御）
  buildings: BuildType[];
  yields: { food: number; production: number; gold: number };
  heroVillage?: string; // 若为本初英雄村，填 Hero.id
  specialty?: Specialty; // 特产（织席贩履/畜牧肉食）
  explored: boolean;
  desc?: string;
}

export interface Route {
  from: string;
  to: string;
  type: 'road' | 'river' | 'pass';
  movementCost: number;
}

export interface Faction {
  id: FactionId;
  name: string;
  color: string;
  isAI: boolean;
}

// 世界资源点（奇遇卡牌解锁「慢慢增加」，可开采产出资源——为大世界补充开采细节）
export type ResourceKind = 'iron' | 'wood' | 'stone' | 'clay' | 'fish' | 'salt' | 'herb';
export interface ResourcePoint {
  id: string;
  name: string; // 资源点名（如「铁矿」「渔场」）
  kind: ResourceKind;
  emoji: string; // 主视觉
  position: [number, number]; // 大世界坐标（与村落同一坐标系）
  owner: FactionId | null; // null = 无主（待开发）
  developed: boolean; // 是否已开发（可开采）
  depleted?: boolean; // 储量耗尽
  stock: number; // 当前储量
  maxStock: number;
  yieldPerTurn: number; // 每回合被动产出
  desc?: string;
}

// 势力层级元信息（汉制四级容器，用于 UI 展示与后续晋升）
export interface Realm {
  jun: string; // 郡
  xian: string; // 县（主城）
}

// ===== 树状奇遇系统（主线「非线性树状奇遇」）=====
// 设计：每棵 Adventure 是一张扁平节点表（nodes），节点之间用 choice.next 关联形成分支树；
// 玩家从 rootId 进入，逐层选择分支，最终收敛到「无 next」的叶子节点（done）。
export type AdventureEffect =
  | { kind: 'resource'; gold?: number; food?: number; production?: number }
  | { kind: 'reputation'; value: number }
  | { kind: 'flag'; key: string }
  | { kind: 'unlockHero'; heroId: string }
  | { kind: 'title'; value: string }
  | { kind: 'minxin'; villageId: string; value: number } // 指定村落民心增减
  | { kind: 'population'; villageId: string; value: number } // 指定村落人口增减
  | { kind: 'militia'; villageId: string; value: number }; // 指定村落乡勇增减（事件/危机用）

export interface AdventureReq {
  flag?: string; // 需已达成某 flag
  reputation?: number; // 需声望 ≥ 该值
  villageLevel?: { id: string; level: number }; // 需某村落等级 ≥
}

export interface AdventureChoice {
  id: string;
  label: string; // 玩家可见的选项文字
  desc?: string; // 选项说明（辅助决策）
  require?: AdventureReq; // 前置要求（未满足则灰显不可选）
  effects: AdventureEffect[];
  next?: string; // 选择后进入的子节点 id；缺省则该分支结束（done）
}

export interface AdventureNode {
  id: string;
  situation: string; // 当前情境（剧情文本）
  era?: string; // 时间标注
  choices: AdventureChoice[];
}

export interface Adventure {
  id: string;
  chapter: string; // 章节（同 Quest.chapter）
  title: string;
  rootId: string; // 入口节点
  trigger: QuestTrigger; // 复用任务触发机制
  nodes: AdventureNode[]; // 全部节点（扁平，按 id 关联）
}

// ===== 月度行动事件卡（6 大类事件模板，驱动政治/人事/内政/外交玩法）=====
// 设计：每月朔日抽 3 张「未知内容、仅露大类」的候选卡，玩家择 1 作为本月行动主题；
// 选中卡即成为「本月事件」，其行动分支（EVENT_BRANCHES）在当月 3 旬内自由施行，
// 完成拿五维/人脉/资源，部分分支在大世界生成可开采资源点。卡=事件机会，非武将角色卡。
export type EventLine = '政治' | '人事' | '内政' | '外交'; // 四大玩法线（事件种类绑定到线）

// 行动分支成效（与 CardEffect 同源，扩展人脉揭示 / 大世界资源点）
export interface BranchReward {
  attr?: Partial<HeroStat>; // 五维增减（统武智政魅）
  res?: { gold?: number; food?: number; production?: number };
  flags?: string[]; // 置位 flag（人脉 / 解锁状态）
  spawnResource?: ResourceKind; // 在大世界新增一处可开采资源点（慢慢丰富世界）
  unlockNpc?: string; // 揭示既定 NPC（人物志/人际树），置 developed
  log?: string;
}
export interface EventBranch {
  id: string;
  label: string; // 行动分支（玩家可见）
  desc?: string;
  requireOfficial?: boolean; // true = 布衣不可执行（需授官后方可，权限闸门）
  reward: BranchReward;
  resultText: string; // 执行后叙事反馈
}

// ===== 动态事件 / 危机系统（让游戏有张力：流寇、天灾、告急、机遇）=====
export type EventTrigger =
  | { type: 'everyTurn'; chance: number } // 每回合按概率触发（0-1）
  | { type: 'date'; ad: number }
  | { type: 'flag'; key: string }
  | { type: 'repBelow'; value: number }
  | { type: 'minxinBelow'; villageId: string; value: number };

export type EventEffect = AdventureEffect; // 复用奇遇成效（含 militia）

export interface EventChoice {
  id: string;
  label: string;
  desc?: string;
  require?: AdventureReq; // 前置要求（未满足则灰显不可选）
  cost?: { gold?: number; food?: number }; // 执行所需资源，不足则不可选
  effects: EventEffect[];
  resultText: string; // 选择后的叙事反馈
}

export interface GameEvent {
  id: string;
  title: string;
  emoji: string;
  situation: string; // 事件情境（叙事文本）
  trigger: EventTrigger;
  once?: boolean; // 仅触发一次（如豪商投靠）
  choices: EventChoice[];
}

export interface Scenario {
  name: string;
  playerStart: string;
  realm: Realm;
  opening: string; // 开场白（史实据《三国志》）
  startReputation?: number; // 开局声望
  startTitle?: string; // 开局官职
  startAttr?: HeroStat; // 主角初始资质（统武智政魅），缺省用 liubei 基准
  factions: Faction[];
  villages: Village[];
  routes: Route[];
  heroes: Hero[];
  npcs: Npc[]; // NPC 角色（刘备相关地点与待开发角色）
  quests: Quest[]; // 主线剧情任务链
  adventures: Adventure[]; // 非线性树状奇遇
  events: GameEvent[]; // 动态事件/危机池
}
