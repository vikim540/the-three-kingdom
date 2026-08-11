// ===== 全局配置（强制集中）：所有阈值 / 权限 / 资源命名 / 文案索引集中于此 =====
// 业务代码（engine / hud / radialMenu / dashboard / mapRenderer）一律读取本文件，禁止在页面写死数值。
// 红线：官职阈值、村落名单、权限开关、赋税区间、升级数值、提示文案、地图地块 → 全部在此配置。
import type { BuildType, HeroStat, ResourceKind, EventLine, BranchReward } from './types';

// ===== 主角本村（最小操作单元的「家」）=====
// 布衣阶段仅此村可经营；其余村落只读。晋升官职后全域开放。
export const HOME_VILLAGE_ID = 'dashu'; // 大树楼桑里（刘备出生）

// ===== 地图渲染（俯视六边形格子）=====
// 六边形半径（像素）。视图层几何参数集中配置，禁止页面写死。
export const MAP_HEX_SIZE = 46;

// ===== 身份 / 权限分级（精细阶梯，权限随官职递增）=====
// 权限唯一依据：GameState.title → rankValue(title)（0=布衣）。
// 设计原则：官职越低权限越小；里长仅基础治理，亭长开方略（调税·征勇·通商），
// 乡长辖多里并得升格大权，县令/太守全域开放。刘备开局为布衣，仅能做个人营生，不可辖制任何村落。
export type IdentityTier = 'commoner' | 'official';

export interface IdentityRank {
  title: string; // 与 GameState.title 对齐（剧情/奇遇可动态改写 title）
  rank: number; // 阶梯序位（0 起，数字越大权限越高）
  note: string; // 权限说明
}

// 身份阶梯表：从「白身（布衣）」到「州牧」动态晋升；权限跟随身份实时联动，不永久锁定。
export const IDENTITY_RANKS: IdentityRank[] = [
  { title: '白身（布衣）', rank: 0, note: '开局默认：仅能织席贩履、砍柴、归家等个人营生，不可辖制任何村落' },
  { title: '里长', rank: 1, note: '一里之首：可安抚/断案/务农/发掘/任属吏，不可调税·营建·征勇·通商' },
  { title: '亭长', rank: 2, note: '一亭之长：开放调税·营建·征勇·通商·联防·招贤' },
  { title: '乡佐', rank: 3, note: '乡级属官：同亭长，参赞乡政' },
  { title: '乡长', rank: 4, note: '一乡之长：开放升格村落层级、管辖周边诸里' },
  { title: '安喜县尉', rank: 5, note: '县廷武官：全域开放，练兵积粮' },
  { title: '县令', rank: 5, note: '一县之长：全域开放' },
  { title: '太守', rank: 6, note: '一郡之守：全域开放' },
  { title: '州牧', rank: 7, note: '一州之牧：全域开放' },
];

// 当前身份阶梯序位（找不到映射时按 0=布衣 处理，确保布衣默认受限）
export function rankValue(title: string): number {
  const r = IDENTITY_RANKS.find((x) => x.title === title);
  return r ? r.rank : 0;
}
// 阶梯序位 → 身份名（用于顶栏/提示展示）
export function rankName(rank: number): string {
  const r = [...IDENTITY_RANKS].sort((a, b) => b.rank - a.rank).find((x) => x.rank <= rank);
  return r ? r.title : '白身（布衣）';
}
// 亭长及以上视为「正式官吏」（旧 isOfficial 语义保留，供兼容）
export function isOfficial(title: string): boolean {
  return rankValue(title) >= 2;
}
export function identityTier(title: string): IdentityTier {
  return rankValue(title) >= 1 ? 'official' : 'commoner';
}

// 左侧管理面板 Tab 的官职门槛：rank0 整体隐藏左侧；rank≥1 显面板，外交需亭长+
export const TAB_RANK_GATE: Record<string, number> = {
  政治: 1,
  人事: 1,
  内政: 1,
  外交: 2,
  剧情: 1,
  英雄: 1,
};

// ===== 赋税区间（全局统一，禁止页面写死）=====
export const TAX_MIN = 0;
export const TAX_MAX = 100;

// ===== 升级阈值（按层级递进，全部数据驱动）=====
// 等级产出乘数（Lv1→Lv5）
export const LEVEL_MULT = [1, 1.2, 1.45, 1.75, 2.1];
// 升级判定：当前等级 → 下一等级所需（人口 / 民心 / 建筑齐备）
export const LEVEL_REQ: Record<number, { pop: number; minxin: number; buildings: BuildType[] }> = {
  1: { pop: 35, minxin: 55, buildings: ['farm'] },
  2: { pop: 60, minxin: 60, buildings: ['farm', 'well', 'workshop'] },
  3: { pop: 100, minxin: 65, buildings: ['farm', 'well', 'workshop', 'granary'] },
  4: { pop: 150, minxin: 70, buildings: ['farm', 'well', 'workshop', 'granary', 'school'] },
};

// ===== 资源显示命名（个人私有资源，统一显示层）=====
// 内部字段不变（gold/food/production/reputation），仅显示改名，杜绝散落硬编码文案。
export const RESOURCE_LABELS: Record<'gold' | 'food' | 'production' | 'reputation', string> = {
  gold: '铜钱',
  food: '粮食',
  production: '麻布',
  reputation: '宗族声望',
};

// ===== 权限动作类型（供三处 UI 统一闸门引用）=====
export type PermAction =
  | 'pacify' // 安抚民心
  | 'dispute' // 处理纠纷
  | 'tax' // 调税
  | 'chief' // 任命里长/属吏
  | 'farm' // 征召务农
  | 'militia' // 征召乡勇
  | 'discover' // 发掘平民
  | 'unlockhero' // 招揽英雄
  | 'build' // 空地开发
  | 'upgrade' // 层级升级/升格
  | 'trade' // 通商
  | 'defense'; // 联防

// 各动作所需最低官职序位（权限随官职递增；里长仅得基础治理，使县令/乡长仍有意义）
export const PERM_RANK: Record<PermAction, number> = {
  pacify: 1, // 里长可
  dispute: 1,
  farm: 1,
  discover: 1,
  chief: 1, // 任属吏/副里
  tax: 2, // 亭长+
  build: 1, // 里长可营建基础（farm/well 等；高级建筑受 village.level 门槛约束）
  militia: 2, // 亭长+
  unlockhero: 2,
  trade: 2,
  defense: 2,
  upgrade: 4, // 乡长+（升格村落是大权）
};

// 某动作是否允许（统一闸门；三处 UI 必须都走这里）
export function canAct(title: string, action: PermAction): boolean {
  return rankValue(title) >= PERM_RANK[action];
}

// 村落可经营判定：本村（家）里长+ 可经营；外村需乡长（rank4）+ 方可辖制
export function canManageVillage(title: string, villageId: string): boolean {
  const r = rankValue(title);
  if (villageId === HOME_VILLAGE_ID) return r >= 1; // 里长+ 经营本村
  return r >= 4; // 乡长+ 辖周边诸里
}

// 某村「调税」是否可调（需可经营且亭长+）
export function canSetTax(title: string, villageId: string): boolean {
  return canManageVillage(title, villageId) && rankValue(title) >= 2;
}

// 某村当前赋税上限（亭长/乡佐限征 60；乡长+ 取 TAX_MAX；其余 0）
export function taxUpperBound(title: string, villageId: string): number {
  if (!canSetTax(title, villageId)) return TAX_MIN;
  return rankValue(title) >= 4 ? TAX_MAX : 60;
}

// 悬浮轮盘模式：full（完整经营）/ limited（仅通商·打听消息/进入）
export type RadialMode = 'full' | 'limited';
export function radialMode(title: string, villageId: string): RadialMode {
  if (canManageVillage(title, villageId) && rankValue(title) >= 2) return 'full';
  return 'limited';
}

// ===== 个人营生动作（布衣阶段主体玩法）=====
// 刘备初期只能织席贩履、砍柴、归家；里长+ 可祭祖聚族。成效集中在 engine 实现，此处仅定义展示。
export type PersonalActionId = 'weave' | 'chop' | 'home' | 'shrine';
export interface PersonalActionDef {
  name: string;
  emoji: string;
  desc: string;
  needRank: number; // 所需最低阶梯（shrine 需里长+）
}
export const PERSONAL_ACTIONS: Record<PersonalActionId, PersonalActionDef> = {
  weave: { name: '织席贩履', emoji: '👞', desc: '草鞋草席远销乡里，积攒些许本钱。', needRank: 0 },
  chop: { name: '入山砍柴', emoji: '🪓', desc: '伐薪为炭，聊补家用。', needRank: 0 },
  home: { name: '归家歇息', emoji: '🏠', desc: '回到家园，与母团聚，宗族慰藉。', needRank: 0 },
  shrine: { name: '祭祖聚族', emoji: '⛩️', desc: '于祠堂祭祖，凝聚宗族，声望渐起。', needRank: 1 },
};

// 晋升阈值：布衣→里长 需累计铜钱（织席贩履积攒）
export const PROMOTE_LIZHANG_GOLD = 25;

// ===== 三阶地图内容（L2 村落详图 / L3 房室）=====
// 不写死在渲染层；统一在此配置，复用 hex.ts 几何。
export type SpotAction =
  | { kind: 'personal'; id: PersonalActionId }
  | { kind: 'perm'; id: PermAction }
  | { kind: 'build'; type: BuildType }
  | { kind: 'upgrade' }
  | { kind: 'enter'; room: string } // 进入该建筑 → L3
  | { kind: 'none' };

export interface VillageSpot {
  type: string; // 地块类型 key（同时作为 L3 的 room key）
  name: string;
  emoji: string;
  desc: string;
  action: SpotAction; // 点击主地块的默认动作
}

// 村落内部地块（L2）：家园/织席所/树林/农田/祠堂/水井/市集
export const VILLAGE_SPOTS: VillageSpot[] = [
  { type: 'home', name: '家园', emoji: '🏠', desc: '刘宅。织席贩履、归家歇息之所。', action: { kind: 'enter', room: 'home' } },
  { type: 'weave', name: '织席所', emoji: '👞', desc: '草鞋草席作坊，营生之本。', action: { kind: 'personal', id: 'weave' } },
  { type: 'wood', name: '树林', emoji: '🌳', desc: '村侧林木，可砍柴为薪。', action: { kind: 'personal', id: 'chop' } },
  { type: 'farm', name: '农田', emoji: '🌾', desc: '垦田务农，足兵足食。', action: { kind: 'enter', room: 'farm' } },
  { type: 'shrine', name: '祠堂', emoji: '⛩️', desc: '刘氏宗祠，祭祖聚族。', action: { kind: 'enter', room: 'shrine' } },
  { type: 'well', name: '水井', emoji: '⛲', desc: '凿井修仓，稳固补给。', action: { kind: 'enter', room: 'well' } },
  { type: 'market', name: '市集', emoji: '🏪', desc: '互通有无，行商往来。', action: { kind: 'enter', room: 'market' } },
];

export interface BuildingRoom {
  name: string;
  emoji: string;
  desc: string;
  action: SpotAction; // 点击房间执行的动作
}

// 建筑内部房间（L3）：按 VILLAGE_SPOTS 的 type 取用
export const BUILDING_ROOMS: Record<string, BuildingRoom[]> = {
  home: [
    { name: '织机房', emoji: '🧵', desc: '机杼声声，织席贩履。', action: { kind: 'personal', id: 'weave' } },
    { name: '院落', emoji: '🌿', desc: '归家歇息，宗族慰藉。', action: { kind: 'personal', id: 'home' } },
    { name: '灶房', emoji: '🔥', desc: '炊事果腹，聊补家用。', action: { kind: 'personal', id: 'chop' } },
  ],
  shrine: [
    { name: '祭台', emoji: '🕯️', desc: '祭祖聚族，声望+。', action: { kind: 'personal', id: 'shrine' } },
    { name: '族谱阁', emoji: '📜', desc: '查阅宗谱，追本溯源。', action: { kind: 'none' } },
  ],
  farm: [
    { name: '田垄', emoji: '🌾', desc: '督农务垦，征集族人。', action: { kind: 'perm', id: 'farm' } },
    { name: '荒地', emoji: '🟫', desc: '开垦农田（需里长+）。', action: { kind: 'build', type: 'farm' } },
  ],
  well: [
    { name: '井台', emoji: '⛲', desc: '凿井修仓（需里长+）。', action: { kind: 'build', type: 'well' } },
    { name: '仓廪', emoji: '🛖', desc: '修缮粮仓（需里长+）。', action: { kind: 'build', type: 'granary' } },
  ],
  market: [
    { name: '摊肆', emoji: '🏪', desc: '行商往来之所（通商在村落「外交」维度与邻村进行）。', action: { kind: 'none' } },
    { name: '坊舍', emoji: '🏭', desc: '兴作坊（需里长+）。', action: { kind: 'build', type: 'workshop' } },
  ],
};

// 三阶地图标签（0=大世界 / 1=村落 / 2=房室）
export const MAP_LEVEL_LABELS = ['大世界', '村落详图', '房室内部'] as const;

// =====================================================================
// ===== 奇遇卡牌系统（抽卡解锁奇遇 / 良缘 / 求学 / 练武 / 结交 / 营生）=====
// 设计：抽卡=一段际遇的浓缩结算。卡按「种类 × 稀有度」二维分类，种类大字凸显，
// 稀有度决定辉光与权重；抽中即把成效（资质增减 / 资源 / 解锁 flag）直接落地主角，
// 用以替代繁琐的逐项点击操作。所有数值集中此处，禁止页面写死。
// =====================================================================

// 卡的种类（大类维度）：种类名以大字凸显卡的属性
export type CardCategory = 'qi_yu' | 'liang_yuan' | 'qiu_xue' | 'lian_wu' | 'jie_jiao' | 'ying_sheng';
export interface CardCategoryMeta {
  id: CardCategory;
  name: string; // 卡面大字（奇遇/良缘/…）
  emoji: string;
  color: string; // 主题色（CSS）
  grad: [string, string]; // 卡面渐变（深→浅）
  desc: string; // 种类旁白
}
export const CARD_CATEGORIES: Record<CardCategory, CardCategoryMeta> = {
  qi_yu: { id: 'qi_yu', name: '奇遇', emoji: '🌟', color: '#a855f7', grad: ['#3b0764', '#7e22ce'], desc: '天降机缘，风云际会' },
  liang_yuan: { id: 'liang_yuan', name: '良缘', emoji: '💞', color: '#ec4899', grad: ['#500724', '#be185d'], desc: '红绳暗系，佳偶天成' },
  qiu_xue: { id: 'qiu_xue', name: '求学', emoji: '📚', color: '#3b82f6', grad: ['#172554', '#1d4ed8'], desc: '焚膏继晷，格物致知' },
  lian_wu: { id: 'lian_wu', name: '练武', emoji: '⚔️', color: '#ef4444', grad: ['#450a0a', '#b91c1c'], desc: '操戈演武，百战不殆' },
  jie_jiao: { id: 'jie_jiao', name: '结交', emoji: '🤝', color: '#14b8a6', grad: ['#042f2e', '#0d9488'], desc: '义结天下，广纳豪英' },
  ying_sheng: { id: 'ying_sheng', name: '营生', emoji: '💰', color: '#f59e0b', grad: ['#451a03', '#b45309'], desc: '织席贩履，货殖兴家' },
};

// 卡的稀有度：白→绿→蓝→紫→红→金 六色，权重决定抽出概率，颜色/辉光决定视觉质感
export type CardRarity = 'white' | 'green' | 'blue' | 'purple' | 'red' | 'gold';
export interface RarityMeta {
  id: CardRarity;
  name: string; // 白/绿/蓝/紫/红/金
  weight: number; // 抽卡权重（合计 100）
  color: string; // 主题色
  glow: string; // 卡面辉光（box-shadow）
  shimmer: boolean; // 高稀有度是否加流光层（紫/红/金）
}
export const CARD_RARITIES: Record<CardRarity, RarityMeta> = {
  white: { id: 'white', name: '白', weight: 40, color: '#e5e7eb', glow: 'rgba(229,231,235,0.40)', shimmer: false },
  green: { id: 'green', name: '绿', weight: 30, color: '#22c55e', glow: 'rgba(34,197,94,0.60)', shimmer: false },
  blue: { id: 'blue', name: '蓝', weight: 18, color: '#3b82f6', glow: 'rgba(59,130,246,0.70)', shimmer: false },
  purple: { id: 'purple', name: '紫', weight: 9, color: '#a855f7', glow: 'rgba(168,85,247,0.85)', shimmer: true },
  red: { id: 'red', name: '红', weight: 2.5, color: '#ef4444', glow: 'rgba(239,68,68,0.92)', shimmer: true },
  gold: { id: 'gold', name: '金', weight: 0.5, color: '#f59e0b', glow: 'rgba(245,158,11,1.0)', shimmer: true },
};
// 稀有度从低到高（保底 / 排序用）
export const RARITY_ORDER: CardRarity[] = ['white', 'green', 'blue', 'purple', 'red', 'gold'];
export function rarityRank(id: CardRarity): number {
  return RARITY_ORDER.indexOf(id);
}
// 保底稀有度：三张候选中至少 1 张 ≥ 此档（默认紫色）
export const PITY_RARITY: CardRarity = 'purple';

// 卡风味目录（去固定稀有度/成效：属性全随机，仅作卡面文案与 emoji 来源）
export interface CardFlavor {
  id: string;
  category: CardCategory;
  name: string; // 卡名（凸显）
  emoji: string; // 主视觉
  desc: string; // 背景文案
}


// 抽卡风味池：每类 4 张（仅文案/emoji，无稀有度/成效；数值由 rollBranchReward 按稀有度+玩法线全随机）
export const CARD_POOL: CardFlavor[] = [
  // ===== 奇遇 =====
  { id: 'qy1', category: 'qi_yu', name: '黄巾余党', emoji: '🟡', desc: '路遇溃散黄巾，收缴些许散碎。' },
  { id: 'qy2', category: 'qi_yu', name: '仙人指路', emoji: '🧙', desc: '山中遇异人，点拨处世之道。' },
  { id: 'qy3', category: 'qi_yu', name: '古墓奇珍', emoji: '🏺', desc: '荒冢得先汉遗珍，价值连城。' },
  { id: 'qy4', category: 'qi_yu', name: '龙脉现世', emoji: '🐉', desc: '楼桑有声，谓当出贵人——气运加身。' },
  // ===== 良缘 =====
  { id: 'ly1', category: 'liang_yuan', name: '邻女初遇', emoji: '🌸', desc: '里中巧遇佳人，相谈甚欢。' },
  { id: 'ly2', category: 'liang_yuan', name: '世家联姻', emoji: '💍', desc: '与邻近望族结亲，互为倚仗。' },
  { id: 'ly3', category: 'liang_yuan', name: '佳偶天成', emoji: '💞', desc: '天作之合，内外咸服。' },
  { id: 'ly4', category: 'liang_yuan', name: '凤求凰', emoji: '🦚', desc: '名动乡里的良缘，德望俱隆。' },
  // ===== 求学 =====
  { id: 'qx1', category: 'qiu_xue', name: '启蒙私塾', emoji: '🔤', desc: '从里中塾师识字明理。' },
  { id: 'qx2', category: 'qiu_xue', name: '从师名儒', emoji: '📜', desc: '拜名儒为师，学兼经世。' },
  { id: 'qx3', category: 'qiu_xue', name: '夜读兵书', emoji: '📕', desc: '挑灯研习兵法，文事兼武备。' },
  { id: 'qx4', category: 'qiu_xue', name: '入太学', emoji: '🏛️', desc: '游学洛阳太学，通览古今。' },
  // ===== 练武 =====
  { id: 'lw1', category: 'lian_wu', name: '乡勇操练', emoji: '🏹', desc: '与乡党习射，粗通武艺。' },
  { id: 'lw2', category: 'lian_wu', name: '师从剑客', emoji: '🗡️', desc: '得游侠授艺，身手日进。' },
  { id: 'lw3', category: 'lian_wu', name: '演武场', emoji: '🛡️', desc: '立演武之所，士卒精强。' },
  { id: 'lw4', category: 'lian_wu', name: '百战之师', emoji: '⚔️', desc: '身经百战，号令如山。' },
  // ===== 结交 =====
  { id: 'jj1', category: 'jie_jiao', name: '市井结义', emoji: '🍻', desc: '市集结交豪杰，慷慨相托。' },
  { id: 'jj2', category: 'jie_jiao', name: '结交豪侠', emoji: '🤠', desc: '倾心结纳游侠，声名渐起。' },
  { id: 'jj3', category: 'jie_jiao', name: '义结金兰', emoji: '🩸', desc: '与异姓兄弟焚香盟誓。' },
  { id: 'jj4', category: 'jie_jiao', name: '天下英雄', emoji: '🌐', desc: '海内英雄，尽入彀中。' },
  // ===== 营生 =====
  { id: 'ys1', category: 'ying_sheng', name: '织席贩履', emoji: '👞', desc: '草鞋草席远销，小有积蓄。' },
  { id: 'ys2', category: 'ying_sheng', name: '贩马致富', emoji: '🐎', desc: '往来贩马，获利倍徙。' },
  { id: 'ys3', category: 'ying_sheng', name: '开市通财', emoji: '🏪', desc: '开立市集，货通四方。' },
  { id: 'ys4', category: 'ying_sheng', name: '富甲一方', emoji: '💎', desc: '陶朱之术，富甲一乡。' },
];

// 每次抽卡耗费铜钱（资源Sink：抽 3 张未知卡、择 1，使织席贩履所得有用武之地）
export const GACHA_COST_PER_DRAW = 8;

// ===== 月度行动事件卡：大类 → 玩法线 映射 =====
// 奇遇=政治线 / 良缘=人事线 / 求学=内政线 / 练武=人事线 / 结交=外交线 / 营生=内政线
export const EVENT_LINE: Record<CardCategory, EventLine> = {
  qi_yu: '政治',
  liang_yuan: '人事',
  qiu_xue: '内政',
  lian_wu: '人事',
  jie_jiao: '外交',
  ying_sheng: '内政',
};

// ===== 行动分支（结构模板：去固定数值，成效按稀有度档位 + 玩法线加权全随机）=====
// 每类 2 条，全围绕刘备涿县布衣线；分支仅声明「产出种类」（grantsAttr/grantsRes/flags/spawnResource/unlockNpc），
// 具体五维/资源数值由 rollBranchReward(模板, 玩法线, 稀有度) 在候选生成时一次性 rolled 并随候选固化。
export interface BranchTemplate {
  id: string;
  label: string;
  desc?: string;
  requireOfficial?: boolean; // 布衣（rank0）不可执行
  resultText: string;
  grantsAttr?: boolean; // 是否产出五维（按玩法线加权 + 稀有度档位）
  grantsRes?: boolean; // 是否产出资源（按稀有度档位）
  flags?: string[]; // 结构性 flag（固定）
  spawnResource?: ResourceKind; // 大世界资源点（固定种类）
  unlockNpc?: string; // 揭示既定 NPC（固定）
}
export const EVENT_BRANCHES: Record<CardCategory, BranchTemplate[]> = {
  // 奇遇 · 政治线
  qi_yu: [
    { id: 'qy_b1', label: '调解邻里争地', desc: '里中两户争一垄地，你出面裁断，皆心服。', grantsAttr: true, grantsRes: true, flags: ['befriend_village'], resultText: '邻里称善，本村声望小涨。' },
    { id: 'qy_b2', label: '勘查西山矿脉', desc: '闲步西山，见露矿苗，暗记于心。', spawnResource: 'iron', flags: ['found_iron'], resultText: '于西山标得一处铁矿，可徐图开采。' },
  ],
  // 良缘 · 人事线
  liang_yuan: [
    { id: 'ly_b1', label: '结识能干同乡', desc: '里中巧遇一同乡，勤勉能干，相谈甚欢。', grantsAttr: true, flags: ['friend_tongxiang'], unlockNpc: 'tongxiang', resultText: '得一同乡臂助，人脉渐广。' },
    { id: 'ly_b2', label: '宗族长辈提点', desc: '宗族长辈见你勤勉，授以处世之道。', grantsAttr: true, flags: ['clan_blessing'], resultText: '长辈青眼，宗族中声名稍起。' },
  ],
  // 求学 · 内政线
  qiu_xue: [
    { id: 'qx_b1', label: '访隐士学织', desc: '山中隐士善织，你从学其法，麻布更精。', grantsAttr: true, grantsRes: true, resultText: '织艺精进，麻布之利更丰。' },
    { id: 'qx_b2', label: '宅旁垦荒试种', desc: '于宅旁垦一小畦，试种新谷。', grantsAttr: true, grantsRes: true, resultText: '新畦有获，家中粮储稍宽。' },
  ],
  // 练武 · 人事线
  lian_wu: [
    { id: 'lw_b1', label: '从退伍老兵学艺', desc: '偶遇退伍老兵，授你拳脚功夫。', grantsAttr: true, unlockNpc: 'veteran', resultText: '习得粗通武艺，自保有余。' },
    { id: 'lw_b2', label: '立演武场聚人', desc: '需有些名分，方可聚众演武、预作自护。', requireOfficial: true, grantsAttr: true, flags: ['drill_ground'], resultText: '（需授官）立演武之所，乡党稍聚。' },
  ],
  // 结交 · 外交线
  jie_jiao: [
    { id: 'jj_b1', label: '结交守城士卒', desc: '与守城士卒相善，得通消息。', grantsAttr: true, flags: ['know_guard'], resultText: '打通守城一线，消息灵通。' },
    { id: 'jj_b2', label: '款待过路富商', desc: '路遇富商歇脚，你殷勤款待，结为相识。', grantsRes: true, flags: ['merchant_road'], unlockNpc: 'merchant', resultText: '富商记你人情，日后通商有门。' },
  ],
  // 营生 · 内政线（保底每月≥1张，稳定攒抽卡本金）
  ying_sheng: [
    { id: 'ys_b1', label: '请得逢集设摊', desc: '里长许你逢集于市口设摊。', grantsRes: true, flags: ['market_right'], resultText: '有了固定摊位，营生更稳。' },
    { id: 'ys_b2', label: '接大宗草鞋订单', desc: '得商队大单，连夜赶制草鞋。', grantsRes: true, resultText: '大单到手，铜钱充盈，下月抽卡不愁。' },
  ],
};

// ===== 随机数值档位（全随机的核心：大类固定 + 稀有度档位 + 玩法线加权）=====
// 每档稀有度的「属性点预算」与「资源区间」；数值越高越稀有。
export interface RarityRewardSpec {
  attrBudget: [number, number]; // 五维总点数范围
  resRange: [number, number]; // 单类资源数量范围
  maxStats: number; // 最多触达几个维度
}
export const RARITY_REWARD: Record<CardRarity, RarityRewardSpec> = {
  white: { attrBudget: [1, 2], resRange: [0, 2], maxStats: 1 },
  green: { attrBudget: [2, 3], resRange: [1, 4], maxStats: 1 },
  blue: { attrBudget: [3, 5], resRange: [2, 6], maxStats: 2 },
  purple: { attrBudget: [5, 8], resRange: [4, 10], maxStats: 2 },
  red: { attrBudget: [8, 12], resRange: [8, 16], maxStats: 3 },
  gold: { attrBudget: [12, 18], resRange: [14, 26], maxStats: 3 },
};
// 玩法线 → 五维权重（求学偏智、练武偏武/统、政治偏政、外交偏魅+智）
export const LINE_STAT_WEIGHTS: Record<EventLine, Partial<Record<keyof HeroStat, number>>> = {
  政治: { pol: 3, cha: 1 },
  人事: { cha: 3, lead: 1 },
  内政: { int: 3, pol: 1 },
  外交: { cha: 2, int: 2 },
};
const STAT_KEYS: (keyof HeroStat)[] = ['lead', 'war', 'int', 'pol', 'cha'];
function randInt(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}
// 按玩法线权重挑 n 个不同维度（未提及的维度给低基权，保证不全为零）
function weightedPickStats(weights: Partial<Record<keyof HeroStat, number>>, n: number): (keyof HeroStat)[] {
  const base = 0.3;
  const pool = STAT_KEYS.map((k) => ({ k, w: weights[k] ?? base })).filter((x) => x.w > 0);
  const out: (keyof HeroStat)[] = [];
  const avail = [...pool];
  for (let i = 0; i < n && avail.length; i++) {
    const tot = avail.reduce((a, x) => a + x.w, 0);
    let r = Math.random() * tot;
    let idx = 0;
    for (let j = 0; j < avail.length; j++) {
      if (r < avail[j].w) { idx = j; break; }
      r -= avail[j].w;
    }
    out.push(avail[idx].k);
    avail.splice(idx, 1);
  }
  return out;
}
// 按「玩法线加权 + 稀有度档位」生成一份完整 BranchReward（数值在此一次性 rolled 并固化进候选）
export function rollBranchReward(template: BranchTemplate, line: EventLine, rarity: CardRarity): BranchReward {
  const rew: BranchReward = {};
  if (template.grantsAttr) {
    const spec = RARITY_REWARD[rarity];
    const total = randInt(spec.attrBudget[0], spec.attrBudget[1]);
    const weights = LINE_STAT_WEIGHTS[line];
    const picked = weightedPickStats(weights, spec.maxStats);
    const sum = picked.reduce((a, k) => a + (weights[k] ?? 0.3), 0);
    let remaining = total;
    const sorted = [...picked].sort((a, b) => (weights[b] ?? 0.3) - (weights[a] ?? 0.3));
    const attr: Partial<HeroStat> = {};
    for (const k of sorted) {
      const share = Math.max(1, Math.round((total * (weights[k] ?? 0.3)) / sum));
      const v = Math.min(remaining, share);
      attr[k] = v;
      remaining -= v;
    }
    if (remaining > 0 && sorted.length) attr[sorted[0]] = (attr[sorted[0]] ?? 0) + remaining; // 余点进主维度
    rew.attr = attr;
  }
  if (template.grantsRes) {
    const [lo, hi] = RARITY_REWARD[rarity].resRange;
    const kinds = ['gold', 'food', 'production'] as const;
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    rew.res = { [k]: randInt(lo, hi) };
  }
  if (template.flags) rew.flags = template.flags;
  if (template.spawnResource) rew.spawnResource = template.spawnResource;
  if (template.unlockNpc) rew.unlockNpc = template.unlockNpc;
  return rew;
}

// ===== 月度抽卡配置（一月三旬；朔日抽 3 选 1，耗费织席贩履所得）=====
export const MONTHLY_DRAW = {
  cost: GACHA_COST_PER_DRAW, // 8 铜钱 / 次（选中时扣）
  candidates: 3, // 每朔日生成候选数
  pick: 1, // 择 1 张作为本月事件
  yingShengFloor: 1, // 保底：候选中至少 1 张营生卡，避免连续空卡卡死进度
  pityRarity: PITY_RARITY, // 保底：候选中至少 1 张 ≥ 此稀有度（紫）
};

// 候选卡（本月朔日生成，大类/稀有度/玩法线/预 rolled 分支数值全部固化于此）
export interface GachaCandidateBranch {
  id: string;
  label: string;
  desc?: string;
  requireOfficial?: boolean;
  resultText: string;
  rolledReward: BranchReward; // 按稀有度+玩法线一次性 rolled 的成效（施行时落地）
  structural: { flags?: string[]; spawnResource?: ResourceKind; unlockNpc?: string };
}
export interface GachaCandidate {
  id: string;
  category: CardCategory;
  categoryName: string;
  categoryEmoji: string;
  line: EventLine;
  rarity: CardRarity;
  rarityName: string;
  rarityColor: string;
  rarityGlow: string;
  emoji: string;
  name: string;
  desc: string;
  branches: GachaCandidateBranch[];
}

// 生成 n 张候选：① 营生保底；② 保底≥1 张达 pityRarity（紫）；③ 分支数值按稀有度+玩法线全随机固化
export function rollEventCandidates(n: number, ensureYingSheng = true): GachaCandidate[] {
  const cats: CardCategory[] = Object.keys(CARD_CATEGORIES) as CardCategory[];
  const out: GachaCandidate[] = [];
  for (let i = 0; i < n; i++) {
    const category: CardCategory = ensureYingSheng && i === 0 ? 'ying_sheng' : cats[Math.floor(Math.random() * cats.length)];
    out.push(buildCandidate(category));
  }
  if (ensureYingSheng && !out.some((c) => c.category === 'ying_sheng')) {
    out[Math.floor(Math.random() * out.length)] = buildCandidate('ying_sheng');
  }
  if (!out.some((c) => rarityRank(c.rarity) >= rarityRank(PITY_RARITY))) {
    const idx = Math.floor(Math.random() * out.length);
    out[idx] = buildCandidate(out[idx].category, true);
  }
  return out;
}

// 单张候选：随机风味文案 + 滚动稀有度 + 按玩法线/稀有度预 rolled 全部分支数值
function buildCandidate(category: CardCategory, forcePurple = false): GachaCandidate {
  const cat = CARD_CATEGORIES[category];
  const line = EVENT_LINE[category];
  const rarity = forcePurple ? rollPityRarity() : rollRarity();
  const rar = CARD_RARITIES[rarity];
  const flavors = CARD_POOL.filter((c) => c.category === category);
  const f = flavors.length ? flavors[Math.floor(Math.random() * flavors.length)] : null;
  const branches: GachaCandidateBranch[] = (EVENT_BRANCHES[category] ?? []).map((t) => ({
    id: t.id,
    label: t.label,
    desc: t.desc,
    requireOfficial: t.requireOfficial,
    resultText: t.resultText,
    rolledReward: rollBranchReward(t, line, rarity),
    structural: { flags: t.flags, spawnResource: t.spawnResource, unlockNpc: t.unlockNpc },
  }));
  return {
    id: `${category}_${Math.random().toString(36).slice(2, 8)}`,
    category,
    categoryName: cat.name,
    categoryEmoji: cat.emoji,
    line,
    rarity,
    rarityName: rar.name,
    rarityColor: rar.color,
    rarityGlow: rar.glow,
    emoji: f?.emoji ?? cat.emoji,
    name: f?.name ?? cat.name,
    desc: f?.desc ?? cat.desc,
    branches,
  };
}

// 在 [pity, gold] 区间内按权重抽一张高稀有度（保底用）
function rollPityRarity(): CardRarity {
  const pool = RARITY_ORDER.filter((r) => rarityRank(r) >= rarityRank(PITY_RARITY));
  const total = pool.reduce((a, r) => a + CARD_RARITIES[r].weight, 0);
  let x = Math.random() * total;
  for (const r of pool) {
    if (x < CARD_RARITIES[r].weight) return r;
    x -= CARD_RARITIES[r].weight;
  }
  return PITY_RARITY;
}

// 世界资源点类型（卡牌解锁「慢慢为大世界增加」的可开采内容）。集中配置，禁止页面写死。
export type ResourceMat = 'food' | 'gold' | 'production';
export interface ResourceKindMeta {
  name: string; // 资源点名
  emoji: string; // 主视觉
  resource: ResourceMat; // 开采后落入哪种资源（粮食/铜钱/物资）
  label: string; // 产出物名（如「生铁」）
  yield: number; // 每回合被动产出 / 立即采掘单次产出基数
  stock: number; // 初始储量
  color: string; // 地图标记色
  desc: string;
}
export const RESOURCE_KIND_META: Record<ResourceKind, ResourceKindMeta> = {
  iron: { name: '铁矿', emoji: '⛏️', resource: 'production', label: '生铁', yield: 4, stock: 60, color: '#9ca3af', desc: '深山铁矿，冶炼兵甲农具。' },
  wood: { name: '林场', emoji: '🌲', resource: 'production', label: '木材', yield: 4, stock: 70, color: '#15803d', desc: '茂林修竹，取材营造。' },
  stone: { name: '石矿', emoji: '🪨', resource: 'production', label: '石料', yield: 3, stock: 80, color: '#78716c', desc: '采石为基，筑城修路。' },
  clay: { name: '陶土', emoji: '🏺', resource: 'production', label: '陶土', yield: 3, stock: 60, color: '#b45309', desc: '抟土成器，资民生用度。' },
  fish: { name: '渔场', emoji: '🐟', resource: 'food', label: '鱼获', yield: 5, stock: 70, color: '#0ea5e9', desc: '河海之利，渔盐足食。' },
  salt: { name: '盐井', emoji: '🧂', resource: 'gold', label: '盐利', yield: 4, stock: 60, color: '#eab308', desc: '煮海为盐，利市三倍。' },
  herb: { name: '药圃', emoji: '🌿', resource: 'food', label: '药材', yield: 3, stock: 50, color: '#22c55e', desc: '采药疗疾，养民安众。' },
};

// 卡种类 → 解锁的资源点类型池（抽中后按种类在大世界生成一处资源点）。集中配置，可经 AI 扩充。
export const CATEGORY_RESOURCE_POOL: Record<CardCategory, ResourceKind[]> = {
  qi_yu: ['iron', 'stone', 'herb'],
  liang_yuan: ['clay', 'wood'],
  qiu_xue: ['stone', 'herb'],
  lian_wu: ['iron', 'stone'],
  jie_jiao: ['wood', 'iron'],
  ying_sheng: ['fish', 'salt', 'clay'],
};

// 加权随机稀有度（权重见 CARD_RARITIES）
export function rollRarity(): CardRarity {
  const total = Object.values(CARD_RARITIES).reduce((a, r) => a + r.weight, 0);
  let x = Math.random() * total;
  for (const r of Object.values(CARD_RARITIES)) {
    if (x < r.weight) return r.id;
    x -= r.weight;
  }
  return 'white';
}

// 卡面背景图：编辑态上传优先，否则取默认分类 SVG（public/assets/cards/<cat>.svg）
export function cardBgUrl(state: { assets?: { cardBackgrounds?: Record<string, string> } }, cat: CardCategory): string {
  const custom = state.assets?.cardBackgrounds?.[cat];
  return custom ?? `/assets/cards/${cat}.svg`;
}
