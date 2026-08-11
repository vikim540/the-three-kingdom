import type { GameStore } from '../sim/store';
import type { Scenario, BuildType, HeroStat, Village } from '../data/types';
import { TIER_NAME, TIER_PLOTS, BUILD_INFO } from '../data/types';
import {
  TERRAIN_EMOJI,
  TERRAIN_NAME,
  SPECIALTY_EMOJI,
  SPECIALTY_NAME,
  questAvailable,
  questComplete,
} from '../sim/engine';
import { HOME_VILLAGE_ID, RESOURCE_LABELS, canManageVillage, rankValue, RESOURCE_KIND_META } from '../data/config';
import { lockTag } from './badges';
import { tabBarHTML } from './tabs';

// ===== 个人状态台（右下角固定看板）：只显示「与主角自己关联」的内容 =====
// 布衣阶段左侧面板隐藏，本看板即玩家唯一常驻信息中枢：状态 / 事件 / 任务 / 资源。
// 建筑/升级回到左侧面板（rank≥1 解锁），不与本看板重复。

export const DASH_TABS = ['状态', '事件', '任务', '资源'] as const;
export type DashTab = (typeof DASH_TABS)[number];

export function dashboardHTML(store: GameStore, scenario: Scenario, tab: DashTab): string {
  const s = store.state;
  const r = s.resources.player;

  const header = `
    <div class="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900/40">
      <span class="text-xl">🐉</span>
      <div class="leading-tight">
        <div class="font-bold text-sm" data-edit="title">${s.title} <span class="text-[10px] text-sky-300">${s.realm.jun}·${s.realm.xian}</span></div>
        <div class="text-[10px] text-slate-400">个人状态台 · 仅显自身关联</div>
      </div>
    </div>`;

  const tabBar = tabBarHTML(
    DASH_TABS.map((t) => ({ label: t, value: t })),
    tab,
    'dashtab',
  );

  let body: string;
  if (tab === '状态') body = statusTab(store);
  else if (tab === '事件') body = eventTab(store);
  else if (tab === '任务') body = questTab(store, scenario);
  else body = resourceTab(store);

  return `
    <div class="w-full rounded-2xl bg-slate-800/90 backdrop-blur border border-slate-700 shadow-xl overflow-hidden anim-fade">
      ${header}
      <div class="flex gap-1 px-2 py-2">${tabBar}</div>
      <div class="px-3 pb-3">${body}</div>
    </div>`;
}

// ===== 状态：四维 + 私有资源 + 身份 =====
function statusTab(store: GameStore): string {
  const s = store.state;
  const a = s.attr;
  const r = s.resources.player;
  const portrait = s.assets?.protagonistPortrait;
  const head = portrait
    ? `<img src="${portrait}" data-edit-img="assets.protagonistPortrait" class="w-14 h-18 object-cover rounded border border-slate-600" alt="主角立绘" title="编辑模式可点击更换">`
    : `<div class="w-14 h-18 rounded bg-slate-900/70 border border-slate-600 flex items-center justify-center text-3xl" data-edit-img="assets.protagonistPortrait">🐉</div>`;
  const STAT_ORDER: (keyof HeroStat)[] = ['lead', 'war', 'int', 'pol', 'cha'];
  const STAT_NAME: Record<string, string> = { lead: '统率', war: '武力', int: '智力', pol: '政治', cha: '魅力' };
  const stats = STAT_ORDER.map((k) => {
    const val = a[k];
    return `<div class="flex items-center gap-1 text-[10px] mb-0.5">
      <span class="w-6 text-slate-400 shrink-0">${STAT_NAME[k]}</span>
      <div class="flex-1 h-1.5 rounded bg-slate-700"><div class="h-1.5 rounded bg-fuchsia-400" style="width:${Math.min(100, val)}%"></div></div>
      <span class="w-5 text-right text-slate-200" data-edit="attr.${k}">${val}</span>
    </div>`;
  }).join('');
  const resCards = (['gold', 'food', 'production', 'reputation'] as const)
    .map(
      (k) => `<div class="rounded bg-slate-700/60 py-2 text-center" data-edit="resources.player.${k}">
        <div class="text-[10px] text-slate-400">${RESOURCE_LABELS[k]}</div>
        <b class="text-base">${k === 'reputation' ? s.reputation : r[k]}</b>
      </div>`,
    )
    .join('');
  return `
    <div class="text-xs text-slate-400 mb-1">主角资质（统武智政魅）</div>
    <div class="flex gap-2 items-center mb-2">
      ${head}
      <div class="flex-1">${stats}</div>
    </div>
    <div class="text-xs text-slate-400 mb-1">私有资源（主角关联）</div>
    <div class="grid grid-cols-2 gap-2">${resCards}</div>
    <button data-action="dash-gacha" class="w-full mt-2 px-2 py-1.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-bold transition-transform duration-150 hover:scale-[1.02]">🎴 前往奇遇抽卡</button>
    ${s.title === '布衣' ? '<div class="text-[10px] text-amber-300/80 mt-1">布衣阶段：左侧管理面板暂隐，晋升官职后自动展开。</div>' : ''}
    <div class="text-[10px] text-slate-500 mt-1">编辑模式（ESC）下，点击带高亮的元素即可改文字/数值/立绘。</div>`;
}

// ===== 事件：本月行动事件进度（无则提示下月）=====
function eventTab(store: GameStore): string {
  const s = store.state;
  const ae = s.activeEvent;
  if (ae) {
    const done = s.completedBranches;
    const branchList = ae.branches
      .map((b) => {
        const isDone = done.includes(b.id);
        const locked = !!b.requireOfficial && rankValue(s.title) === 0;
        return `<div class="rounded bg-slate-700/40 px-2 py-1 mb-1 text-[11px] ${isDone ? 'text-emerald-300' : locked ? 'text-slate-500' : 'text-slate-200'}">
          ${isDone ? '✅' : locked ? '🔒' : '▫️'} ${b.label}</div>`;
      })
      .join('');
    return `
      <div class="text-[11px] text-slate-400 mb-1">本月进行中（${ae.line}线 · <span style="color:${ae.rarityColor}">${ae.rarityName}</span>）</div>
      <div class="rounded p-2 mb-2 text-center" style="background-image:linear-gradient(155deg, ${'#1e1b4b'}, ${ae.rarityColor}55);border:1px solid ${ae.rarityColor};">
        <div class="text-lg font-bold text-white">${ae.categoryEmoji} ${ae.name}</div>
        <div class="text-[10px] text-slate-200">${ae.desc}</div>
      </div>
      ${branchList}
      <div class="text-[10px] text-slate-500 mb-1">已施行 ${done.length}/${ae.branches.length}</div>
      <button data-action="dash-event" class="w-full px-2 py-1.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-bold transition-transform duration-150 hover:scale-[1.02]">▶ 前往处理本月事件</button>`;
  }
  if (s.eventDrawDue || s.gachaCandidates.length) {
    return `
      <div class="text-sm text-slate-300 mb-2">🎴 本月朔日已可抽卡（候选已备）。</div>
      <button data-action="dash-gacha" class="w-full px-2 py-1.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-bold transition-transform duration-150 hover:scale-[1.02]">🎴 立即抽本月行动事件</button>`;
  }
  return `<div class="rounded bg-slate-800/60 border border-slate-600 p-3 text-xs text-slate-400">🗓️ 本月暂无进行中事件。下月朔日将自动抽卡，或随时卜一卦。</div>`;
}

// ===== 任务：进行中剧情（rank0 仍可见，避免盲玩）=====
function questTab(store: GameStore, scenario: Scenario): string {
  const s = store.state;
  const items = scenario.quests
    .filter((q) => questAvailable(s, q) && !s.questsCompleted.includes(q.id))
    .map((q) => {
      const doneCond = questComplete(s, q);
      const canAck = q.complete.type === 'manual' || doneCond;
      return `<div class="rounded bg-slate-700/40 p-2 mb-2">
        <div class="font-bold text-sm">${q.title}</div>
        <div class="text-[10px] text-sky-300 mb-0.5">${q.chapter} · ${q.era}</div>
        <div class="text-[11px] text-slate-300 mb-1">目标：${q.objective}</div>
        ${canAck ? `<button data-action="ackquest" data-quest="${q.id}" class="w-full px-2 py-1 rounded bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-bold transition">承接此任</button>` : `<div class="text-[10px] text-slate-500">进行中（条件未足）</div>`}
      </div>`;
    })
    .join('');
  return `<div class="font-bold mb-2 text-xs">📜 进行中剧情</div>${items || '<div class="text-xs text-slate-500">暂无进行中任务。</div>'}<div class="text-[10px] text-slate-500 mt-1">承接任务可得金财/声望/官职。完整主线见左侧「📜剧情」。</div>`;
}

// ===== 资源：大世界可开采资源点（事件分支生成，慢慢丰富世界）=====
function resourceTab(store: GameStore): string {
  const pts = store.state.resourcePoints;
  if (!pts.length)
    return `<div class="rounded bg-slate-800/60 border border-slate-600 p-3 text-xs text-slate-400">
      ⛏️ 暂无资源点。完成事件分支（如「勘查西山矿脉」「接大宗草鞋订单」）可于大世界解锁矿场、林场、盐井等，前来开采。
    </div>`;
  const rows = pts
    .map((p) => {
      const pct = Math.round((p.stock / p.maxStock) * 100);
      const depleted = p.depleted || p.stock <= 0;
      return `<div class="rounded bg-slate-700/40 p-2 mb-2">
        <div class="flex items-center gap-1 mb-1">
          <span class="text-base">${p.emoji}</span>
          <span class="text-sm font-semibold text-slate-100">${p.name}</span>
          ${depleted ? '<span class="text-[10px] text-rose-300 ml-auto">已竭</span>' : `<span class="text-[10px] text-slate-400 ml-auto">储量 ${p.stock}</span>`}
        </div>
        <div class="h-1.5 rounded bg-slate-800 mb-1"><div class="h-1.5 rounded" style="width:${pct}%;background:${RESOURCE_KIND_META[p.kind].color}"></div></div>
        ${
          depleted
            ? '<div class="text-[10px] text-rose-300">开采殆尽，静待下回事件另辟新脉。</div>'
            : `<button data-action="mine" data-rp="${p.id}" class="w-full mt-1 px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition">⛏️ 开采（得${p.yieldPerTurn * 2}）</button>`
        }
      </div>`;
    })
    .join('');
  return `<div class="text-xs text-slate-400 mb-1">大世界资源点（地图点击亦可开采）</div>${rows}`;
}

// ===== 建筑选择器卡片（仅供左侧面板调用；个人状态台不重复）=====
export function buildPickerHTML(store: GameStore, v: Village): string {
  const r = store.state.resources.player;
  const opts = (Object.keys(BUILD_INFO) as BuildType[])
    .map((b) => {
      const info = BUILD_INFO[b];
      const locked = v.level < info.levelGate;
      const afford = r.food >= info.cost.grain && r.gold >= info.cost.gold;
      const ok = !locked && afford;
      return `<button data-action="pickbuild" data-build="${b}" ${ok ? '' : 'disabled'} class="w-full my-1 px-2 py-1 rounded text-xs text-left border transition-transform duration-150 ${
        ok
          ? 'border-sky-500 bg-sky-700/60 hover:bg-sky-600 text-white hover:scale-[1.02]'
          : 'border-slate-700 bg-slate-800/60 text-slate-500 cursor-not-allowed'
      }">
        <div>${locked ? '🔒' : '🏗️'} ${info.name} <span class="text-[10px]">(Lv${info.levelGate})</span></div>
        <div class="text-[10px] opacity-80">${info.desc}　耗🌾${info.cost.grain}💰${info.cost.gold}</div>
      </button>`;
    })
    .join('');
  return `
    <div class="max-w-sm w-[90%] rounded-2xl bg-slate-800 border border-sky-500/40 shadow-2xl pop-in">
      <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
        <span class="font-bold text-sky-300">🏗️ ${v.name} · 空地开发</span>
        <button data-modal-close class="ml-auto text-slate-400 hover:text-white transition">✕</button>
      </div>
      <div class="p-3 max-h-[60vh] overflow-auto">${opts}</div>
    </div>`;
}
