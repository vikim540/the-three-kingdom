import type { GameStore } from '../sim/store';
import type { Tab } from './hud';
import type { MapView } from '../view/mapRenderer';
import { rankValue, canManageVillage, HOME_VILLAGE_ID, type PersonalActionId } from '../data/config';

// ===== 独立交互系统：悬停轮盘（Radial Menu）=====
// 职责：把「鼠标移入村落节点」翻译成一个环形快捷操作盘，点击即弹出对应维度的详情弹窗。
// 与视图层（Canvas）解耦：只接收 (id, 屏幕坐标)，并持有 view 引用以便随地图重绘重新定位。
// 与 UI 层解耦：通过回调 openDetail / openHero / openIntel / personalAction 触发，不依赖 hud 内部实现。
// 权限：动作完全由 config 的 rankValue / canManageVillage 决定（布衣仅个人营生，里长基础治理，亭长+全功能）。

export interface RadialCallbacks {
  openDetail: (id: string, tab: Tab) => void;
  openHero: (heroId: string) => void;
  openIntel: (id: string) => void; // 打听消息：只读情报弹窗（外村布衣专用）
  personalAction: (villageId: string, id: PersonalActionId) => void; // 个人营生（织席贩履/砍柴/回家/祭祖）
}

export interface RadialAction {
  emoji: string;
  label: string;
  tab?: Tab; // 有 tab → 打开维度详情弹窗
  hero?: boolean; // 打开人物志
  intel?: boolean; // 打开只读情报弹窗
  enter?: boolean; // 进入该村（L2 村落详图）
  personal?: PersonalActionId; // 个人营生动作
}

export class RadialMenu {
  private el: HTMLDivElement;
  private inner: HTMLDivElement | null = null;
  private currentId: string | null = null;
  private actions: RadialAction[] = [];

  constructor(
    root: HTMLElement,
    private store: GameStore,
    private view: MapView,
    private cb: RadialCallbacks,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'absolute z-40 pointer-events-none';
    this.el.style.display = 'none';
    root.appendChild(this.el);
  }

  // 在某村落节点的屏幕坐标处弹出轮盘；id 变化则切换目标
  show(id: string, sx: number, sy: number): void {
    if (this.currentId === id && this.el.style.display === 'block') return;
    const v = this.store.state.villages.find((x) => x.id === id);
    if (!v) return;
    this.currentId = id;
    this.actions = this.buildActions(v.id, v.heroVillage);

    const R = 96; // 盘半径
    const ring = R * 0.72;
    const n = this.actions.length;
    let html =
      `<div id="radialInner" class="pointer-events-none" style="position:absolute;left:${sx}px;top:${sy}px;width:0;height:0;">`;
    // 中心：村落名（选中放大）
    html += `<div class="pointer-events-none absolute rounded-full bg-slate-900/90 border-2 border-sky-400 flex items-center justify-center text-center leading-tight text-slate-100 shadow-lg pop-in" style="left:-34px;top:-34px;width:68px;height:68px;font-size:11px;">${v.name}</div>`;
    this.actions.forEach((a, i) => {
      const ang = (-90 + i * (360 / n)) * (Math.PI / 180);
      const bx = Math.cos(ang) * ring;
      const by = Math.sin(ang) * ring;
      html += `<button data-ri="${i}" title="${a.label}" class="pointer-events-auto absolute flex flex-col items-center justify-center rounded-full bg-slate-800/95 border border-slate-500 hover:border-sky-400 hover:bg-slate-700 shadow-lg transition-transform duration-150 hover:scale-125 active:scale-95 radial-pop" style="left:${bx - 28}px;top:${by - 28}px;width:56px;height:56px;animation-delay:${i * 45}ms;">
        <span class="text-lg leading-none">${a.emoji}</span>
        <span class="text-[9px] leading-none mt-1 text-slate-200">${a.label}</span>
      </button>`;
    });
    html += `</div>`;
    this.el.innerHTML = html;
    this.el.style.display = 'block';
    this.inner = this.el.querySelector<HTMLDivElement>('#radialInner');

    this.el.querySelectorAll<HTMLButtonElement>('button[data-ri]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-ri'));
        this.run(idx, id);
        this.hide();
      });
    });
  }

  // 地图重绘（拖拽/缩放/resize）后，按最新屏幕坐标重新定位，避免漂移
  reposition(): void {
    if (!this.currentId || this.el.style.display !== 'block' || !this.inner) return;
    const p = this.view.screenPos(this.currentId);
    if (!p) return;
    this.inner.style.left = `${p[0]}px`;
    this.inner.style.top = `${p[1]}px`;
  }

  private buildActions(villageId: string, heroVillage?: string): RadialAction[] {
    const title = this.store.state.title;
    const rank = rankValue(title);
    const actions: RadialAction[] = [];

    // 进入村落（仅本村或亭长+ 可进入）
    if (this.view.canEnterVillage(villageId)) {
      actions.push({ emoji: '🏘️', label: '进入村落', enter: true });
    }
    // 个人营生：布衣在本村可织席贩履/砍柴/回家；里长+ 在本村可祭祖
    if (villageId === HOME_VILLAGE_ID) {
      if (rank < 2) {
        actions.push({ emoji: '👞', label: '织席贩履', personal: 'weave' });
        actions.push({ emoji: '🪓', label: '砍柴', personal: 'chop' });
        actions.push({ emoji: '🏠', label: '回家', personal: 'home' });
      } else if (rank >= 1) {
        actions.push({ emoji: '⛩️', label: '祭祖', personal: 'shrine' });
      }
    }
    // 治理维度：里长+ 且可经营该村
    if (canManageVillage(title, villageId) && rank >= 1) {
      actions.push(
        { emoji: '⚖️', label: '政治', tab: '政治' },
        { emoji: '👥', label: '人事', tab: '人事' },
        { emoji: '🏗️', label: '内政', tab: '内政' },
        { emoji: '🤝', label: '外交', tab: '外交' },
        { emoji: '⭐', label: '升级', tab: '升级' },
      );
    }
    // 外村（不可经营）：仅打听消息
    if (!canManageVillage(title, villageId)) {
      actions.push({ emoji: '🔍', label: '打听消息', intel: true });
    }
    // 英雄村：人物志
    if (heroVillage) actions.push({ emoji: '🦸', label: '人物志', hero: true });
    return actions;
  }

  private run(idx: number, id: string): void {
    const a = this.actions[idx];
    if (!a) return;
    if (a.hero) this.cb.openHero(this.store.state.villages.find((v) => v.id === id)?.heroVillage!);
    else if (a.intel) this.cb.openIntel(id);
    else if (a.enter) this.view.enterVillage(id);
    else if (a.personal) this.cb.personalAction(id, a.personal);
    else if (a.tab) this.cb.openDetail(id, a.tab);
  }

  hide(): void {
    this.el.style.display = 'none';
    this.currentId = null;
    this.inner = null;
  }
}
