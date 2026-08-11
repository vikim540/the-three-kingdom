import type { GameStore } from '../sim/store';
import type { Scenario, BuildType, Village, Hero, GameEvent } from '../data/types';
import { TIER_NAME, BUILD_INFO } from '../data/types';
import {
  TERRAIN_EMOJI,
  TERRAIN_NAME,
  neighbors,
  questAvailable,
  questComplete,
  adventureAvailable,
  currentAdventureNode,
  choiceMet,
  SPECIALTY_EMOJI,
  SPECIALTY_NAME,
} from '../sim/engine';
import {
  RESOURCE_LABELS,
  TAX_MIN,
  isOfficial,
  canManageVillage,
  canSetTax,
  taxUpperBound,
  rankValue,
  canAct,
  PERM_RANK,
  rankName,
  TAB_RANK_GATE,
  HOME_VILLAGE_ID,
} from '../data/config';
import { HeroSystem, type HeroController } from './heroCards';
import { dashboardHTML, buildPickerHTML, type DashTab } from './dashboard';
import { openModal, closeModal } from './modal';
import { openGacha } from './gacha';
import { tabBarHTML } from './tabs';
import { timeBarHTML } from './timeBar';

// 地图导航控制（由 main 注入，包裹 MapView 的层级切换）
export interface MapControl {
  getNav: () => { level: number; village: string; building: string };
  enterVillage: (id: string) => void;
  exitToVillage: () => void;
  exitToWorld: () => void;
}

// 个人私有资源显示顺序与图标（命名来自 config.RESOURCE_LABELS）
const RES_ORDER = ['gold', 'food', 'production', 'reputation'] as const;
const RES_EMOJI: Record<(typeof RES_ORDER)[number], string> = {
  gold: '💰',
  food: '🌾',
  production: '📦',
  reputation: '⭐',
};

// 当前等待抉择的危机事件 id（供 document 委托回调使用）
let activeEventId: string | null = null;

// 事件选项是否不可选（前置/资源不足），并返回原因提示
function eventChoiceReason(s: GameStore['state'], c: GameEvent['choices'][number]): string | null {
  if (c.require?.flag && !s.flags[c.require.flag]) return '条件未至';
  if (c.require?.reputation !== undefined && s.reputation < c.require.reputation) return '声望不足';
  if (c.cost) {
    const g = c.cost.gold ?? 0;
    const f = c.cost.food ?? 0;
    if (s.resources.player.gold < g || s.resources.player.food < f)
      return `资源不足（需💰${g}🌾${f}）`;
  }
  return null;
}

export type Tab = '政治' | '人事' | '内政' | '外交' | '升级' | '剧情' | '英雄';

// 控制器：暴露给外部系统（轮盘交互 / 英雄系统）调用，避免它们耦合 hud 内部状态
export interface UIController {
  openHero: (heroId: string) => void;
  openDetail: (id: string, tab: Tab) => void;
  openIntel: (id: string) => void; // 打听消息：只读情报弹窗
  notifyLocked: (msg: string) => void; // 权限不足提示（地块/房间点击）
}

// focusVillage：由 main 注入（依赖 MapView），用于「前往故里/聚焦地点」
export function mountUI(
  root: HTMLElement,
  store: GameStore,
  scenario: Scenario,
  focusVillage: (id: string) => void,
  mapCtl: MapControl,
): UIController {
  root.innerHTML = `
    <div class="pointer-events-none absolute inset-0 select-none">
      <div id="topbar" class="pointer-events-auto absolute top-0 inset-x-0 px-4 py-2
        flex items-center gap-3 flex-wrap bg-slate-900/85 backdrop-blur border-b border-slate-700 text-sm"></div>
      <div id="panel" class="pointer-events-auto absolute left-4 top-16 w-[22rem] max-h-[72vh] overflow-auto
        rounded-xl bg-slate-800/90 backdrop-blur border border-slate-700 shadow-xl p-4 text-sm"></div>
      <div id="log" class="pointer-events-auto absolute bottom-4 left-4 w-[26rem] max-w-[40vw] max-h-36 overflow-auto
        rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700 p-3 text-xs space-y-1 font-mono"></div>
      <div id="dashboard" class="pointer-events-auto absolute bottom-4 right-4 w-[22rem] max-h-[70vh] overflow-auto z-30"></div>
      <div id="intro" class="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"></div>
    </div>`;

  const topbar = root.querySelector<HTMLElement>('#topbar')!;
  const panel = root.querySelector<HTMLElement>('#panel')!;
  const logEl = root.querySelector<HTMLElement>('#log')!;
  const introEl = root.querySelector<HTMLElement>('#intro')!;
  const dashboardEl = root.querySelector<HTMLElement>('#dashboard')!;

  const heroCtrl: HeroController = {
    focusVillage,
    openHero: (hid: string) => heroSystem.showPerspective(hid),
  };
  const heroSystem = new HeroSystem(root, store, scenario, heroCtrl);

  let activeTab: Tab = '政治';
  let detail: { id: string; tab: Tab } | null = null; // 维度详情弹窗状态
  let dashTab: DashTab = '状态'; // 右下固定看板当前 tab
  let picker: number | null = null; // 建筑选择弹窗（空地槽位索引）
  let advOpen: string | null = null; // 当前打开的奇遇树 id
  let detailUnsub: (() => void) | null = null; // 维度详情实时刷新订阅
  let moreOpen = false; // 顶栏「☰」小菜单（存/读/重置）展开态

  // ===== 维度详情弹窗（复用全局 modal.ts）=====
  const buildDetailHTML = (): string => {
    const dv = store.state.villages.find((x) => x.id === detail!.id);
    if (!dv) return '';
    const dims: Tab[] = ['政治', '人事', '内政', '外交', '升级'];
    const dTabBar = tabBarHTML(
      dims.map((d) => ({ label: d, value: d })),
      detail!.tab,
      'detailtab',
    );
    return `
      <div class="max-w-lg w-[92%] max-h-[80vh] overflow-auto rounded-2xl bg-slate-800 border border-sky-500/40 shadow-2xl pop-in">
        <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
          <span class="font-bold text-sky-300">🔍 ${dv.name} · ${detail!.tab}详情</span>
          <button data-modal-close class="ml-auto text-slate-400 hover:text-white transition">✕</button>
        </div>
        <div class="p-4"><div class="flex flex-wrap gap-1 mb-3">${dTabBar}</div>${villageBody(store, dv, detail!.tab, scenario)}</div>
      </div>`;
  };

  // 刷新弹窗内容（store 变更或切 tab 时调用）
  const refreshDetail = (): void => {
    if (!detail) return;
    openModal(buildDetailHTML(), {
      onClose: () => {
        detail = null;
        if (detailUnsub) {
          detailUnsub();
          detailUnsub = null;
        }
      },
    });
  };

  // 打开维度详情：选中 + 订阅实时刷新，避免操作后弹窗内容过期
  const openDetailModal = (id: string, tab: Tab): void => {
    store.select(id);
    detail = { id, tab };
    if (!detailUnsub) detailUnsub = store.subscribe(refreshDetail);
    refreshDetail();
  };

  // 建造选择器弹窗（复用全局 modal.ts）
  const openPickerModal = (idx: number): void => {
    const v = store.state.villages.find((x) => x.id === store.state.selectedId);
    if (!v || idx < v.buildings.length) return;
    picker = idx;
    openModal(buildPickerHTML(store, v), {
      onClose: () => {
        picker = null;
        render();
      },
    });
  };

  const render = (): void => {
    const s = store.state;
    const totalPop = s.villages.reduce((a, v) => a + v.population, 0);
    const avgMin = Math.round(s.villages.reduce((a, v) => a + v.minxin, 0) / s.villages.length);
    const r = s.resources.player;

    const nav = mapCtl.getNav();
    const crumbs: string[] = [
      `<button data-action="mapnav" data-level="1" class="px-2 py-0.5 rounded ${nav.level === 1 ? 'bg-sky-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition">🗺️ 大世界</button>`,
    ];
    if (nav.level >= 2)
      crumbs.push(
        `<button data-action="mapnav" data-level="2" class="px-2 py-0.5 rounded ${nav.level === 2 ? 'bg-sky-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} transition">🏘️ ${nav.village}</button>`,
      );
    if (nav.level >= 3)
      crumbs.push(`<button class="px-2 py-0.5 rounded bg-sky-700 text-white">🏠 ${nav.building}</button>`);

    topbar.innerHTML = `
      <span class="font-bold text-base">🐉 ${s.realm.jun}·${s.realm.xian}</span>
      <span class="text-slate-400" data-edit="title">🎖️ ${s.title}</span>
      <span class="flex items-center gap-1 text-[11px]">${crumbs.join('<span class="text-slate-500">▸</span>')}</span>
      ${timeBarHTML(s.calendar)}
      <span class="text-slate-300">👥 ${totalPop}</span>
      <span class="text-slate-300">💗 民心 ${avgMin}</span>
      ${RES_ORDER.map(
        (k) =>
          `<span class="text-slate-300" data-edit="resources.player.${k}">${RES_EMOJI[k]} ${RESOURCE_LABELS[k]} ${
            k === 'reputation' ? s.reputation : r[k as 'gold' | 'food' | 'production']
          }</span>`,
      ).join('')}
      <button data-action="gacha" class="px-2 py-1 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white transition">🎴 抽卡</button>
      <button data-action="endturn" class="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition">结束回合 ⏭</button>
      <button data-action="moremenu" class="ml-auto px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition">☰</button>
      ${moreOpen ? `<span class="flex gap-1">
        <button data-action="save" class="px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-slate-100 transition">💾 存</button>
        <button data-action="load" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition">📂 读</button>
        <button data-action="reset" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition">重置</button>
      </span>` : ''}`;

    // 左侧管理面板：布衣（rank0）整体隐藏；晋升后淡入，Tab 按官职门槛显隐
    const rank = rankValue(s.title);
    const allTabs: Tab[] = ['政治', '人事', '内政', '外交', '剧情', '英雄'];
    const visibleTabs = allTabs.filter((t) => rank >= (TAB_RANK_GATE[t] ?? 1));
    if (!visibleTabs.includes(activeTab)) activeTab = visibleTabs[0] ?? '政治';
    if (rank === 0) {
      panel.style.display = 'none';
    } else {
      const wasHidden = panel.style.display === 'none';
      panel.style.display = '';
      if (wasHidden) {
        panel.classList.remove('anim-slide');
        void panel.offsetWidth; // 重排以重启动画
        panel.classList.add('anim-slide');
      }
    }
    const tabBar = tabBarHTML(visibleTabs.map((t) => ({ label: t, value: t })), activeTab, 'tab');

    const sel = s.villages.find((v) => v.id === s.selectedId);
    let bodyHtml: string;
    if (activeTab === '英雄') {
      bodyHtml = heroSystem.cardsHTML();
    } else if (activeTab === '剧情') {
      bodyHtml = questPanel(store, scenario) + adventurePanel(store, scenario);
    } else if (sel) {
      bodyHtml = villageBody(store, sel, activeTab, scenario);
    } else {
      bodyHtml = `<p class="text-slate-400">点击地图上的村落进行管理，或切换至「🦸 英雄」阅览人物、「📜剧情」查看主线。</p>`;
    }
    panel.innerHTML = `<div class="flex flex-wrap gap-1 mb-3">${tabBar}</div>${bodyHtml}`;
    if (activeTab === '英雄') heroSystem.bindCards(panel);

    // 右下角固定看板（个人状态台：状态/事件/任务/资源），与左侧管理面板解耦
    dashboardEl.innerHTML = dashboardHTML(store, scenario, dashTab);

    logEl.innerHTML = s.log.slice(0, 28).map((l) => `<div class="text-slate-300">${l}</div>`).join('');

    introEl.innerHTML = s.introVisible
      ? `<div class="max-w-lg w-[90%] rounded-2xl bg-slate-800 border border-yellow-500/40 p-6 shadow-2xl pop-in">
          <div class="text-yellow-300 font-bold text-lg mb-2">📜 ${s.scenarioName} · 开场</div>
          <p class="text-sm text-slate-200 leading-relaxed mb-4 whitespace-pre-line">${scenario.opening}</p>
          <button data-action="intro" class="w-full px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold transition">入局 ▶</button>
        </div>`
      : '';
    introEl.style.display = s.introVisible ? 'flex' : 'none';
  };

  // 奇遇树弹窗内容（随选择推进节点 / 落定）
  const renderAdventure = (advId: string): string => {
    const adv = scenario.adventures.find((x) => x.id === advId);
    if (!adv) return '';
    const node = currentAdventureNode(store.state, adv);
    if (!node) {
      return `<div class="max-w-lg w-[92%] rounded-2xl bg-slate-800 border border-emerald-500/40 shadow-2xl pop-in">
        <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
          <span class="font-bold text-emerald-300">🌿 ${adv.title}</span>
          <span class="text-[11px] text-slate-400">${adv.chapter}</span>
          <button data-modal-close class="ml-auto text-slate-400 hover:text-white transition">✕</button>
        </div>
        <div class="p-4 text-sm text-slate-200">此段奇遇已落定。来日方长，另有际遇待启。</div>
        <div class="px-4 py-3 border-t border-slate-700"><button data-modal-close class="w-full px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition">关闭</button></div>
      </div>`;
    }
    const choices = node.choices
      .map((c) => {
        const met = choiceMet(store.state, c.require);
        return `<button data-action="adv-choose" data-adv="${adv.id}" data-choice="${c.id}" ${met ? '' : 'disabled'} class="w-full my-1 px-3 py-2 rounded-lg text-left border transition-transform duration-150 ${
          met
            ? 'border-emerald-500 bg-emerald-700/50 hover:bg-emerald-600 text-white hover:scale-[1.02]'
            : 'border-slate-700 bg-slate-800/60 text-slate-500 cursor-not-allowed'
        }">
          <div class="text-sm font-semibold">${met ? '🌿' : '🔒'} ${c.label}</div>
          ${c.desc ? `<div class="text-[11px] opacity-80 mt-0.5">${c.desc}</div>` : ''}
          ${met ? '' : '<div class="text-[10px] text-rose-300 mt-0.5">前置未满足（需名声 / Flag / 村等级）</div>'}
        </button>`;
      })
      .join('');
    return `<div class="max-w-lg w-[92%] max-h-[80vh] overflow-auto rounded-2xl bg-slate-800 border border-emerald-500/40 shadow-2xl pop-in">
      <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
        <span class="font-bold text-emerald-300">🌿 ${adv.title}</span>
        <span class="text-[11px] text-slate-400">${node.era ?? adv.chapter}</span>
        <button data-modal-close class="ml-auto text-slate-400 hover:text-white transition">✕</button>
      </div>
      <div class="p-4">
        <p class="text-sm text-slate-200 leading-relaxed mb-3 whitespace-pre-line">${node.situation}</p>
        <div class="text-[11px] text-emerald-300 mb-1">— 你将如何抉择？—</div>
        ${choices}
      </div>
    </div>`;
  };

  // 打开 / 刷新奇遇树弹窗（复用全局 modal.ts，openModal 幂等替换内容）
  const openAdventureModal = (advId: string): void => {
    advOpen = advId;
    openModal(renderAdventure(advId), {
      onClose: () => {
        advOpen = null;
        render();
      },
    });
  };

  // 委托到 document：弹窗内容（在 body 上的 overlay 内）也能被此处捕获
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!t) return;
    const a = t.getAttribute('data-action')!;
    if (a === 'detailtab') {
      if (detail) {
        detail.tab = t.getAttribute('data-tab') as Tab;
        refreshDetail();
      }
      return;
    }
    if (a === 'endturn') {
      store.endTurn();
      if (store.state.status === 'lost') return openDefeatModal();
      if (store.state.pendingEventId) return openEventModal(store.state.pendingEventId);
      if (store.state.gachaCandidates.length) return openGacha(store); // 朔日自动弹抽卡
      return;
    }
    if (a === 'reset') return store.reset(scenario);
    if (a === 'save') return store.save('manual');
    if (a === 'load') return store.load('manual') || store.load('auto');
    if (a === 'intro') return store.dismissIntro();
    // ===== 顶栏小菜单（存/读/重置）=====
    if (a === 'moremenu') {
      moreOpen = !moreOpen;
      return render();
    }
    // ===== 奇遇抽卡（顶栏 / 个人状态台 / 事件 tab 共用）=====
    if (a === 'gacha' || a === 'dash-gacha' || a === 'dash-event') return openGacha(store);
    // ===== 开采资源点（大世界细节）=====
    if (a === 'mine') {
      const id = t.getAttribute('data-rp')!;
      const res = store.extractResource(id);
      if (res.msg) showEventResult(res.msg);
      return;
    }
    // ===== 地图面包屑导航 =====
    if (a === 'mapnav') {
      const lvl = Number(t.getAttribute('data-level'));
      if (lvl === 1) mapCtl.exitToWorld();
      else if (lvl === 2) mapCtl.exitToVillage();
      return;
    }
    // ===== 右下固定看板交互 =====
    if (a === 'dashtab') {
      dashTab = t.getAttribute('data-tab') as DashTab;
      return render();
    }
    if (a === 'plot') {
      openPickerModal(Number(t.getAttribute('data-plot')));
      return;
    }
    if (a === 'pickbuild') {
      const sel = store.state.selectedId;
      if (sel && picker !== null) {
        store.build(sel, t.getAttribute('data-build') as BuildType);
        closeModal(); // onClose 负责回置 picker 并刷新看板
      }
      return;
    }
    if (a === 'tab') {
      activeTab = t.getAttribute('data-tab') as Tab;
      return render();
    }
    if (a === 'ackquest') return store.acknowledgeQuest(t.getAttribute('data-quest')!);
    // ===== 动态事件 / 危机 =====
    if (a === 'event-choice') {
      const id = t.getAttribute('data-choice')!;
      if (!activeEventId) return;
      const res = store.resolveEvent(activeEventId, id);
      if (store.state.status === 'lost') return openDefeatModal();
      showEventResult(res.msg);
      return;
    }
    if (a === 'restart') {
      store.reset(scenario);
      closeModal();
      return;
    }
    // ===== 开发覆盖导出/清空（编辑模式弹窗）=====
    if (a === 'copydev') {
      const txt = store.exportDev();
      navigator.clipboard?.writeText(txt).then(
        () => {},
        () => {},
      );
      return;
    }
    if (a === 'confirmclear') {
      store.clearDevOverrides();
      closeModal();
      return;
    }
    // ===== 树状奇遇 =====
    if (a === 'adv-open') return openAdventureModal(t.getAttribute('data-adv')!);
    if (a === 'adv-choose') {
      const advId = t.getAttribute('data-adv')!;
      const choiceId = t.getAttribute('data-choice')!;
      store.chooseAdventure(advId, choiceId);
      openAdventureModal(advId); // 刷新弹窗：推进节点或落定
      return;
    }
    const sel = store.state.selectedId;
    if (!sel) return;
    // ===== 进入村落（L2 详图）=====
    if (a === 'enter') {
      mapCtl.enterVillage(sel);
      return;
    }
    // ===== 个人营生（布衣阶段主体）=====
    if (a === 'weave') return store.weave();
    if (a === 'chop') return store.chopWood();
    if (a === 'home') return store.goHome(HOME_VILLAGE_ID);
    if (a === 'shrine') return store.visitShrine(sel);
    // ===== 治理维度动作（权限门槛由 config 统一判定）=====
    if (a === 'pacify') store.pacify(sel);
    else if (a === 'dispute') store.resolveDispute(sel);
    else if (a === 'chief') store.appointChief(sel);
    else if (a === 'farm') store.conscriptFarm(sel);
    else if (a === 'militia') store.conscriptMilitia(sel);
    else if (a === 'discover') store.discoverCommoner(sel);
    else if (a === 'unlockhero') store.unlockHero(sel);
    else if (a === 'upgrade') store.upgrade(sel);
    else if (a === 'build') store.build(sel, t.getAttribute('data-build') as BuildType);
    else if (a === 'trade' || a === 'defense') {
      const target = t.getAttribute('data-target')!;
      if (a === 'trade') store.trade(sel, target);
      else store.mutualDefense(sel, target);
    }
  });

  // 委托到 document：建筑选择器（全局弹窗内）的赋税滑杆 change 也能被捕获
  document.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t.getAttribute('data-action') === 'tax') {
      const sel = store.state.selectedId;
      if (sel) store.setTax(sel, Number((t as HTMLInputElement).value));
    }
  });

  store.subscribe(render);
  render();

  // 打听消息：只读情报弹窗（外村布衣专用）
  const openIntelModal = (id: string): void => {
    store.select(id);
    openModal(intelHTML(store, id));
  };

  // 权限不足提示（地块/房间点击被拦截时调用）
  const openLockedModal = (msg: string): void => {
    openModal(
      `<div class="max-w-sm w-[92%] rounded-2xl bg-slate-800 border border-amber-500/40 shadow-2xl pop-in p-5 text-center">
        <div class="text-3xl mb-2">🔒</div>
        <p class="text-sm text-slate-200 mb-4">${msg}</p>
        <button data-modal-close class="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-sm transition">明白了</button>
      </div>`,
    );
  };

  // ===== 动态事件 / 危机弹窗 =====
  const openEventModal = (eventId: string): void => {
    const ev = scenario.events.find((e) => e.id === eventId);
    if (!ev) return;
    activeEventId = eventId;
    const choices = ev.choices
      .map((c) => {
        const reason = eventChoiceReason(store.state, c);
        const blocked = reason !== null;
        return `<button data-action="event-choice" data-choice="${c.id}" ${blocked ? 'disabled' : ''}
            class="w-full text-left my-1 px-3 py-2 rounded-lg border transition-transform duration-150 ${
              blocked
                ? 'border-slate-700 bg-slate-800/60 text-slate-500 cursor-not-allowed'
                : 'border-rose-500/50 bg-rose-700/30 hover:bg-rose-600/50 text-white hover:scale-[1.01]'
            }">
            <div class="text-sm font-semibold">${c.label}</div>
            ${c.desc ? `<div class="text-[11px] opacity-80 mt-0.5">${c.desc}</div>` : ''}
            ${reason ? `<div class="text-[10px] text-amber-300 mt-0.5">⚠️ ${reason}</div>` : ''}
          </button>`;
      })
      .join('');
    openModal(
      `<div class="max-w-md w-[92%] rounded-2xl bg-slate-800 border border-rose-500/40 shadow-2xl pop-in">
        <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-900/60">
          <span class="text-2xl">${ev.emoji}</span>
          <span class="font-bold text-rose-300">${ev.title}</span>
        </div>
        <div class="p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-line">${ev.situation}</div>
        <div class="px-4 pb-4 space-y-1">${choices}</div>
      </div>`,
      { dismissable: false },
    );
  };

  const openDefeatModal = (): void => {
    openModal(
      `<div class="max-w-sm w-[92%] rounded-2xl bg-slate-900 border border-red-600 shadow-2xl pop-in text-center p-6">
        <div class="text-5xl mb-2">💀</div>
        <div class="font-bold text-red-300 text-lg mb-2">败 北</div>
        <p class="text-sm text-slate-300 mb-4">大树楼桑里民心尽失，宗族离散。乱世之中，起兵之路就此断绝。</p>
        <button data-action="restart" class="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition">重整旗鼓（重新开始）</button>
      </div>`,
      { dismissable: false },
    );
  };

  const showEventResult = (msg: string): void => {
    openModal(
      `<div class="max-w-sm w-[92%] rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl pop-in p-5 text-center">
        <div class="text-3xl mb-2">📜</div>
        <p class="text-sm text-slate-200 mb-4 whitespace-pre-line">${msg}</p>
        <button data-modal-close class="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-sm transition">继续</button>
      </div>`,
    );
  };

  return {
    openHero: (heroId: string): void => heroSystem.showPerspective(heroId),
    openDetail: (id: string, tab: Tab): void => openDetailModal(id, tab),
    openIntel: (id: string): void => openIntelModal(id),
    notifyLocked: (msg: string): void => openLockedModal(msg),
  };
}

// 英雄羁绊卡（左侧面板 / 只读分支共用，避免重复）
function heroCardHTML(hero: Hero | null, v: Village): string {
  if (!hero || !v.heroVillage) return '';
  return `<div class="mt-3 rounded bg-yellow-500/10 border border-yellow-500/40 p-2 text-xs">
    <div class="font-bold text-yellow-300">${hero.emoji} ${hero.name} · ${hero.title}</div>
    <div class="text-slate-300">羁绊：${hero.bond}</div>
    <div class="text-slate-300">增益：${hero.bonus} ${hero.unlocked ? '（已激活）' : '（未招揽）'}</div>
  </div>`;
}

// 村落情报（打听消息弹窗内容）：只读展示地势/归属/人口/民心/产出/特产/邻接 + 一句听闻。
// 复用引擎 neighbors / 常量，不写死；专供外村布衣「打探虚实」用。
function intelHTML(store: GameStore, id: string): string {
  const v = store.state.villages.find((x) => x.id === id);
  if (!v) return '';
  const ownerLabel =
    v.owner === 'player' ? '吾方（刘备势力）' : v.owner === 'yellow_turban' ? '黄巾贼众' : '中立';
  const spec = v.specialty
    ? `${SPECIALTY_EMOJI[v.specialty]} ${SPECIALTY_NAME[v.specialty]}`
    : '—';
  const nbs = neighbors(store.state, id)
    .map((nid) => store.state.villages.find((x) => x.id === nid)!)
    .map((n) => `${TERRAIN_EMOJI[n.terrain]}${n.name}`)
    .join('、') || '无';
  const hearsay =
    v.owner === 'player'
      ? '此乃吾方之地，宗族民心可倚，宜善抚之。'
      : v.minxin >= 60
        ? '听闻乡民安堵，官府威信尚存，一时难撼。'
        : '听闻徭役繁重，民心浮动，易生变故——或可趁机结纳。';
  return `<div class="max-w-md w-[92%] rounded-2xl bg-slate-800 border border-cyan-500/40 shadow-2xl pop-in">
    <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
      <span class="font-bold text-cyan-300">🔍 ${v.name} · 情报</span>
      <button data-modal-close class="ml-auto text-slate-400 hover:text-white transition">✕</button>
    </div>
    <div class="p-4 text-sm space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded bg-slate-700/50 p-2">地形：${TERRAIN_NAME[v.terrain]}（地势 ${v.elevation}）</div>
        <div class="rounded bg-slate-700/50 p-2">归属：${ownerLabel}</div>
        <div class="rounded bg-slate-700/50 p-2">人口：${v.population}</div>
        <div class="rounded bg-slate-700/50 p-2">民心：<span class="text-rose-300">${v.minxin}</span></div>
        <div class="rounded bg-slate-700/50 p-2">产出 🌾${v.yields.food}·📦${v.yields.production}·💰${v.yields.gold}</div>
        <div class="rounded bg-slate-700/50 p-2">特产：${spec}</div>
      </div>
      <div class="rounded bg-slate-700/40 p-2 text-xs text-slate-300">邻接地：${nbs}</div>
      <div class="rounded bg-cyan-900/30 border border-cyan-700/40 p-2 text-xs text-cyan-100 italic">「${hearsay}」</div>
      <div class="text-[10px] text-slate-500">布衣尚未授官，外村不可辖制——仅可通商、打探虚实。</div>
    </div>
  </div>`;
}

// 治理按钮（按权限显隐）：可行动 → 正常按钮；不可 → 锁定并提示所需官职
// attrs：附加在按钮标签上的额外属性（如外交维度的 data-target="邻村id"）
function govBtn(
  title: string,
  action: Parameters<typeof canAct>[1],
  emoji: string,
  label: string,
  desc: string,
  attrs = '',
): string {
  if (canAct(title, action)) {
    return `<button data-action="${action}" ${attrs} class="w-full my-1 px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-white text-xs transition">${emoji} ${label}（${desc}）</button>`;
  }
  return `<button disabled class="w-full my-1 px-2 py-1 rounded bg-slate-800/60 text-slate-500 text-xs cursor-not-allowed">🔒 ${label}（需${rankName(PERM_RANK[action])}）</button>`;
}

function villageBody(store: GameStore, v: Village, tab: Tab, scenario: Scenario): string {
  const s = store.state;
  const rank = rankValue(s.title);
  const manageable = canManageVillage(s.title, v.id);
  const official = isOfficial(s.title);

  const hero = v.heroVillage ? s.heroes.find((h) => h.id === v.heroVillage) ?? null : null;
  const heroEmoji = hero ? hero.emoji : '';

  const specLine = v.specialty
    ? `<div class="text-[11px] text-amber-300 mb-1">${SPECIALTY_EMOJI[v.specialty]} 特产：${SPECIALTY_NAME[v.specialty]}</div>`
    : '';

  // 核心数据：放大字号、弱化冗余装饰（去掉独立民心进度条）
  const stats = `
    <div class="grid grid-cols-3 gap-2 text-center mb-3">
      <div class="rounded bg-slate-700/60 py-1.5"><div class="text-[10px] text-slate-400">人口</div><b class="text-base">${v.population}</b></div>
      <div class="rounded bg-slate-700/60 py-1.5"><div class="text-[10px] text-slate-400">民心</div><b class="text-base text-rose-300">${v.minxin}</b></div>
      <div class="rounded bg-slate-700/60 py-1.5"><div class="text-[10px] text-slate-400">乡勇</div><b class="text-base">${v.militia}</b></div>
    </div>
    <div class="text-xs text-slate-400 mb-2">产出 🌾${v.yields.food} · 📦${v.yields.production} · 💰${v.yields.gold}　|　赋税 ${v.tax}</div>`;

  const header = `
    <div class="flex items-center gap-2 mb-2">
      <span class="text-2xl">${TERRAIN_EMOJI[v.terrain]}</span>
      <div>
        <div class="font-bold text-lg">${v.name} <span class="text-xs text-sky-300">${TIER_NAME[v.tier]}·Lv${v.level}</span></div>
        <div class="text-xs text-slate-400">${TERRAIN_NAME[v.terrain]} · 地势 ${v.elevation}</div>
      </div>
    </div>`;

  // ===== 布衣（rank 0）：仅个人营生，不可辖制任何村落 =====
  if (rank === 0) {
    const canEnter = v.id === HOME_VILLAGE_ID || rankValue(s.title) >= 2;
    return `
      ${header}
      ${specLine}
      ${stats}
      <div class="text-xs text-slate-400 mb-1">个人营生（布衣唯此而已）：</div>
      <button data-action="weave" class="w-full my-1 px-2 py-1 rounded bg-amber-700/80 hover:bg-amber-600 text-white text-xs transition">👞 织席贩履（铜钱+4 粮+1）</button>
      <button data-action="chop" class="w-full my-1 px-2 py-1 rounded bg-green-700/80 hover:bg-green-600 text-white text-xs transition">🪓 砍柴（麻布+3 粮+1）</button>
      <button data-action="home" class="w-full my-1 px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-white text-xs transition">🏠 回家歇息（民心+2）</button>
      ${canEnter ? `<button data-action="enter" class="w-full my-1 px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition">🏘️ 进入村落详图</button>` : ''}
      <div class="rounded bg-slate-800/60 border border-slate-600 p-2 text-xs text-slate-400 mb-2">布衣未授官，唯织席贩履、砍柴、归家而已。积攒铜钱至 ${25}，乡老或举荐你为里长。</div>
      ${heroCardHTML(hero, v)}
      ${v.desc ? `<p class="text-[11px] text-slate-500 mt-2 italic">${v.desc}</p>` : ''}`;
  }

  // ===== 可经营村落（里长+ 且本村 / 乡长+ 全域）=====
  if (manageable) {
    let body = '';
    if (tab === '政治') {
      const cap = taxUpperBound(s.title, v.id);
      if (canSetTax(s.title, v.id)) {
        body = `
          <label class="block text-xs text-slate-400 mb-1">赋税（越高钱多但民心降）：${v.tax}${official ? '' : `（限征，上限 ${cap}）`}</label>
          <input type="range" min="${TAX_MIN}" max="${cap}" value="${Math.min(v.tax, cap)}" data-action="tax" class="w-full mb-3 accent-sky-400" />
          ${govBtn(s.title, 'pacify', '🕊️', '安抚民心', '耗金5，民心+8')}
          ${govBtn(s.title, 'dispute', '📜', '处理纠纷', '耗金2，民心+4')}`;
      } else {
        body = `<div class="rounded bg-slate-800/60 border border-slate-600 p-2 text-xs text-slate-400 mb-2">🔒 你尚无调税之权（需亭长）。里长可安抚、断案、务农、发掘、任属吏。</div>
          ${govBtn(s.title, 'pacify', '🕊️', '安抚民心', '耗金5，民心+8')}
          ${govBtn(s.title, 'dispute', '📜', '处理纠纷', '耗金2，民心+4')}`;
      }
    } else if (tab === '人事') {
      body = `
        <div class="text-xs text-slate-400 mb-2">里长：${v.chief ? '✅ 已任命' : '❌ 未任命'}　${v.heroVillage ? `英雄村：${heroEmoji}${hero!.name}` : '普通村'}</div>
        ${govBtn(s.title, 'chief', '👤', '任命里长', '需人口≥20，民心+3')}
        ${govBtn(s.title, 'farm', '🌱', '征召务农', '人口+，名声越高加成越多')}
        ${govBtn(s.title, 'militia', '⚔️', '征召乡勇', '需Lv2，乡勇+')}
        ${govBtn(s.title, 'discover', '🔍', '发掘平民', '人口+3')}
        ${
          v.heroVillage && hero && !hero.unlocked
            ? govBtn(s.title, 'unlockhero', '🎯', `招揽英雄 ${hero.name}`, '需亭长+')
            : ''
        }`;
    } else if (tab === '内政') {
      body = `
        <div class="text-xs text-slate-400 mb-2">产出 🌾${v.yields.food} · 📦${v.yields.production} · 💰${v.yields.gold}</div>
        <div class="text-xs text-slate-400 mb-1">已建：${v.buildings.length ? v.buildings.map((b) => BUILD_INFO[b].name).join('、') : '无'}</div>
        <div class="rounded bg-slate-700/40 p-2 text-xs text-slate-300 mb-2">建筑开发与空地管理已整合至右下角「🟩固定看板 · 建筑」，避免界面重复。</div>
        <button data-action="dashtab" data-tab="建筑" class="w-full px-2 py-1 rounded bg-orange-600/80 hover:bg-orange-500 text-white text-xs font-bold transition-transform duration-150 hover:scale-[1.02]">🏗️ 前往空地开发（右下看板）</button>`;
    } else if (tab === '外交') {
      const nbs = neighbors(s, v.id)
        .map((id) => s.villages.find((x) => x.id === id)!)
        .filter((x) => x.owner === 'player');
      const rows = nbs.length
        ? nbs
            .map(
              (n) => `<div class="flex items-center gap-1 my-1">
                <span class="flex-1 text-xs">${TERRAIN_EMOJI[n.terrain]}${n.name}（Lv${n.level}）</span>
                ${govBtn(s.title, 'trade', '🤝', '通商', '', `data-target="${n.id}"`).replace('w-full my-1', 'px-2 py-0.5')}
                ${govBtn(s.title, 'defense', '🛡️', '联防', '', `data-target="${n.id}"`).replace('w-full my-1', 'px-2 py-0.5')}
              </div>`,
            )
            .join('')
        : '<p class="text-xs text-slate-500">周边无己方村落。</p>';
      body = `<div class="text-xs text-slate-400 mb-1">邻村往来（仅己方，需亭长+）：</div>${rows}`;
    } else if (tab === '升级') {
      const reqTxt =
        v.level >= 5
          ? '已达满级 Lv5'
          : `升级至 Lv${v.level + 1}：人口≥阈值、民心≥阈值、建筑齐备（见各维度操作）`;
      body = `
        <div class="text-xs text-slate-400 mb-2">${TIER_NAME[v.tier]} · 当前 Lv${v.level}${v.level >= 5 ? '（满级）' : ''}</div>
        <div class="rounded bg-slate-700/50 p-2 mb-2 text-xs text-slate-300">${reqTxt}</div>
        ${
          v.level < 5
            ? govBtn(s.title, 'upgrade', '⭐', '尝试升级', '满足条件即晋升')
            : govBtn(s.title, 'upgrade', '🏯', '升格为「亭」', '脱离村落层级')
        }`;
    }

    return `
      ${header}
      ${specLine}
      ${stats}
      <button data-action="enter" class="w-full mb-2 px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition">🏘️ 进入村落详图</button>
      ${body}
      ${heroCardHTML(hero, v)}
      ${v.desc ? `<p class="text-[11px] text-slate-500 mt-2 italic">${v.desc}</p>` : ''}`;
  }

  // ===== 不可经营村落（里长+ 但非本村且未至乡长；或外村）=====
  const canEnter = v.id === HOME_VILLAGE_ID || rankValue(s.title) >= 2;
  return `
    ${header}
    ${specLine}
    ${stats}
    <div class="rounded bg-slate-800/60 border border-slate-600 p-2 text-xs text-slate-400 mb-2">🔒 你暂未获辖此村之权（需乡长方可辖周边诸里）。可进入观览，或打听消息。</div>
    ${canEnter ? `<button data-action="enter" class="w-full my-1 px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition">🏘️ 进入村落（观览）</button>` : ''}
    ${heroCardHTML(hero, v)}
    ${v.desc ? `<p class="text-[11px] text-slate-500 mt-2 italic">${v.desc}</p>` : ''}`;
}

// ===== 主线剧情任务（数据驱动，可由 AI 批量灌入）=====
function questPanel(store: GameStore, scenario: Scenario): string {
  const s = store.state;
  const items = scenario.quests
    .map((q) => {
      const done = s.questsCompleted.includes(q.id);
      const avail = questAvailable(s, q);
      const doneCond = questComplete(s, q);
      let status: string;
      let canAck = false;
      if (done) {
        status = '✅ 已完成';
      } else if (avail) {
        if (q.complete.type === 'manual' || doneCond) {
          status = '🟢 可承接';
          canAck = true;
        } else {
          status = '🟡 进行中（条件未足）';
        }
      } else {
        status = '🔒 未解锁';
      }
      return `<div class="rounded bg-slate-700/40 p-2 mb-2">
        <div class="flex justify-between items-baseline">
          <span class="font-bold text-sm">${q.title}</span>
          <span class="text-[10px] text-slate-400">${q.era}</span>
        </div>
        <div class="text-[10px] text-sky-300 mb-1">${q.chapter}</div>
        <div class="text-[11px] text-slate-300 mb-1">目标：${q.objective}</div>
        <div class="text-[11px] text-slate-400 mb-1 italic">${q.desc}</div>
        <div class="text-[10px] mb-1">状态：${status}</div>
        ${
          canAck
            ? `<button data-action="ackquest" data-quest="${q.id}" class="w-full px-2 py-1 rounded bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-bold transition">承接此任</button>`
            : ''
        }
      </div>`;
    })
    .join('');
  return `<div class="font-bold mb-2">📜 主线剧情（史实据《三国志·蜀书·先主传》）</div>${items}<p class="text-[10px] text-slate-500 mt-2">注：剧本时间以「旬」为回合、一月三旬；公元年随回合推进。承接任务可获得金财、声望与官职。</p>`;
}

// ===== 树状奇遇列表面板（数据驱动，可由 AI 批量灌入）=====
function adventurePanel(store: GameStore, scenario: Scenario): string {
  const s = store.state;
  const items = scenario.adventures
    .map((adv) => {
      const prog = s.adventureState[adv.id];
      const avail = adventureAvailable(s, adv);
      const done = !!prog?.done;
      const node = avail && !done ? currentAdventureNode(s, adv) : null;
      let status: string;
      if (!avail) status = '🔒 未解锁';
      else if (done) status = '✅ 已落定';
      else status = `🟢 进行中${node?.era ? ' · ' + node.era : ''}`;
      return `<div class="rounded bg-slate-700/40 p-2 mb-2">
        <div class="flex justify-between items-baseline">
          <span class="font-bold text-sm">🌿 ${adv.title}</span>
          <span class="text-[10px] text-slate-400">${adv.chapter}</span>
        </div>
        <div class="text-[10px] text-emerald-300 mb-1">${status}</div>
        ${
          avail && !done
            ? `<button data-action="adv-open" data-adv="${adv.id}" class="w-full px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">进入奇遇 ▶</button>`
            : ''
        }
      </div>`;
    })
    .join('');
  return `<div class="font-bold mb-2 mt-3 pt-2 border-t border-slate-700">🌿 树状奇遇（非线性分支）</div>${items}<p class="text-[10px] text-slate-500 mt-1">注：每个选择开启不同际遇岔路，最终收敛落定；成效影响资源、声望、宗族与人物。</p>`;
}
