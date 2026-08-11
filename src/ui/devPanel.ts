// ===== 开发编辑模式（调试工具，生产玩法之外）：ESC 开关 =====
// 用途：测试期现场调整——拖拽/输入单位位置、替换人物卡片、改写城市资源。
// 复用公共组件：tabBarHTML（白名单 Tab 容器）；直接改 store.state 并 commit 自动存档。
// 不触碰任何游戏规则引擎；关闭后地图拖拽还原为只读平移。
import type { GameStore } from '../sim/store';
import type { Scenario, HeroStat, Terrain, FactionId, Tier } from '../data/types';
import { TIER_NAME, TIER_ORDER } from '../data/types';
import { tabBarHTML, type TabSpec } from './tabs';
import { TERRAIN_EMOJI, recomputeYields } from '../sim/engine';
import { CARD_CATEGORIES, type CardCategory } from '../data/config';
import { openModal, closeModal } from './modal';

export interface DevPanelOptions {
  focusVillage: (id: string) => void;
  setDevDrag: (on: boolean) => void;
  // 开发模式开关时联动（main 用于同步编辑覆盖层的高亮/拦截）
  onToggle?: (open: boolean) => void;
}

type DevTab = '地图' | '人物' | '城市' | '资源';

// 五维中文短标签（统/武/智/政/魅）
const STAT_LABEL: Record<keyof HeroStat, string> = {
  lead: '统',
  war: '武',
  int: '智',
  pol: '政',
  cha: '魅',
};

export class DevPanel {
  private el: HTMLDivElement;
  private tab: DevTab = '地图';
  private open = false;

  constructor(
    root: HTMLElement,
    private store: GameStore,
    private scenario: Scenario,
    private opts: DevPanelOptions,
  ) {
    this.el = document.createElement('div');
    this.el.className =
      'dev-panel pointer-events-auto select-text absolute top-14 right-4 w-80 max-h-[78vh] overflow-auto z-[60] ' +
      'rounded-xl bg-slate-950/95 backdrop-blur border border-fuchsia-500/50 shadow-2xl text-xs text-slate-200 hidden';
    root.appendChild(this.el);
    // 作用域内的点击委托（与 hud 的 document 委托隔离，data-dev-* 互不干扰）
    this.el.addEventListener('click', (e) => this.onClick(e));
    // 资源上传（文件选择）
    this.el.addEventListener('change', (e) => this.onFile(e));
  }

  // ===== 开关（由应用级 ESC 调度）=====
  toggle(): void {
    this.open = !this.open;
    this.el.classList.toggle('hidden', !this.open);
    this.opts.setDevDrag(this.open);
    this.opts.onToggle?.(this.open);
    if (this.open) this.render();
  }
  isOpen(): boolean {
    return this.open;
  }

  // 地图拖拽时实时刷新坐标输入框（由 MapView.onDevMove 调用）
  refreshCoord(id: string): void {
    if (!this.open || this.tab !== '地图') return;
    const v = this.store.state.villages.find((x) => x.id === id);
    if (!v) return;
    const x = this.el.querySelector<HTMLInputElement>(`[data-dev-pos-x="${id}"]`);
    const y = this.el.querySelector<HTMLInputElement>(`[data-dev-pos-y="${id}"]`);
    if (x) x.value = String(v.position[0]);
    if (y) y.value = String(v.position[1]);
  }

  private render(): void {
    const tabs: TabSpec[] = [
      { label: '🗺️ 地图', value: '地图' },
      { label: '🦸 人物', value: '人物' },
      { label: '🏘️ 城市', value: '城市' },
      { label: '🖼️ 资源', value: '资源' },
    ];
    this.el.innerHTML = `
      <div class="flex items-center gap-2 px-3 py-2 border-b border-fuchsia-500/40 bg-fuchsia-900/30">
        <span class="font-bold text-fuchsia-200">🛠️ 开发编辑模式</span>
        <span class="text-[10px] text-slate-400">ESC 开关</span>
        <button data-dev="close" class="ml-auto text-slate-400 hover:text-white transition">✕</button>
      </div>
      <div class="flex gap-1 px-2 py-2">${tabBarHTML(tabs, this.tab, 'devtab')}</div>
      <div class="px-3 pb-3">${this.bodyHTML()}</div>
      <div class="px-3 pb-3 border-t border-fuchsia-500/30">
        <div class="text-[10px] text-slate-400 mb-1">开发覆盖层（独立 localStorage 键，与玩家存档分离）：</div>
        <div class="flex gap-2">
          <button data-dev="exportdev" class="flex-1 px-2 py-1 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-[11px]">📤 导出覆盖</button>
          <button data-dev="cleardev" class="flex-1 px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-[11px]">🧹 清空覆盖</button>
        </div>
      </div>`;
  }

  private bodyHTML(): string {
    if (this.tab === '地图') return this.mapHTML();
    if (this.tab === '人物') return this.heroHTML();
    if (this.tab === '资源') return this.resourceHTML();
    return this.cityHTML();
  }

  // ===== 地图：拖拽 / 坐标精确输入 =====
  private mapHTML(): string {
    const rows = this.store.state.villages
      .map(
        (v) => `
        <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2" data-dev-row="${v.id}">
          <div class="flex items-center gap-1 mb-1">
            <span class="text-base">${TERRAIN_EMOJI[v.terrain]}</span>
            <span class="font-semibold">${v.name}</span>
            <button data-dev="focus" data-id="${v.id}" class="ml-auto px-1.5 py-0.5 rounded bg-sky-700 hover:bg-sky-600 text-[10px]">聚焦</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="text-[10px] text-slate-400">X 坐标
              <input type="number" data-dev-pos-x="${v.id}" value="${v.position[0]}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
            <label class="text-[10px] text-slate-400">Y 坐标
              <input type="number" data-dev-pos-y="${v.id}" value="${v.position[1]}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
          </div>
          <button data-dev="applypos" data-id="${v.id}" class="w-full mt-1 px-2 py-0.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-[11px]">应用坐标</button>
        </div>`,
      )
      .join('');
    return `<p class="text-[10px] text-amber-300 mb-2">提示：开启开发模式后可直接在地图上 <b>拖拽村落节点</b> 移动位置；下方亦可精确输入坐标。</p>${rows}`;
  }

  // ===== 人物：更换人物卡片（emoji/五维/称号/绑定村/解锁）=====
  private heroHTML(): string {
    const villages = this.store.state.villages;
    const vOpts = villages
      .map((v) => `<option value="${v.id}">${v.name}</option>`)
      .join('');
    const rows = this.store.state.heroes
      .map((h) => {
        const st = h.stats;
        const statInputs = (Object.keys(STAT_LABEL) as (keyof HeroStat)[])
          .map(
            (k) =>
              `<label class="flex flex-col items-center">${STAT_LABEL[k]}
                <input type="number" data-dev-hero-stat="${h.id}" data-stat="${k}" value="${st[k]}" class="w-full bg-slate-900 border border-slate-600 rounded px-0.5 py-0.5 text-slate-100 text-center"></label>`,
          )
          .join('');
        return `
        <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2" data-dev-hero="${h.id}">
          <div class="flex items-center gap-1 mb-1">
            <input data-dev-hero-emoji="${h.id}" value="${h.emoji}" class="w-10 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-center" title="头像 emoji">
            <input data-dev-hero-name="${h.id}" value="${h.name}" class="flex-1 bg-slate-900 border border-slate-600 rounded px-1 py-0.5" title="姓名">
          </div>
          <label class="text-[10px] text-slate-400 block mb-1">称号
            <input data-dev-hero-title="${h.id}" value="${h.title}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
          <label class="text-[10px] text-slate-400 block mb-1">绑定村落
            <select data-dev-hero-bound="${h.id}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5">${vOpts.replace(`value="${h.boundVillage}"`, `value="${h.boundVillage}" selected`)}</select></label>
          <div class="grid grid-cols-5 gap-1 text-center text-[10px] text-slate-400 mb-1">${statInputs}</div>
          <label class="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
            <input type="checkbox" data-dev-hero-unlock="${h.id}" ${h.unlocked ? 'checked' : ''}> 已招揽（激活增益）</label>
          <button data-dev="applyhero" data-id="${h.id}" class="w-full px-2 py-0.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-[11px]">应用人物卡</button>
        </div>`;
      })
      .join('');
    return `<p class="text-[10px] text-amber-300 mb-2">更换人物卡片：改 emoji 头像 / 五维 / 称号 / 绑定村 / 解锁状态，点「应用」生效并自动存档。</p>${rows}`;
  }

  // ===== 城市：全局资源 + 每村资源/地形/归属/层级 =====
  private cityHTML(): string {
    const s = this.store.state;
    const r = s.resources.player;
    const terrainOptsAll = (Object.keys(TERRAIN_EMOJI) as Terrain[])
      .map((t) => `<option value="${t}">${TERRAIN_EMOJI[t]} ${t}</option>`)
      .join('');
    const factionOptsAll = s.factions
      .map((f) => `<option value="${f.id}">${f.name}</option>`)
      .join('');
    const tierOptsAll = TIER_ORDER.map((t) => `<option value="${t}">${TIER_NAME[t]}</option>`).join('');

    const global = `
      <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2">
        <div class="font-semibold mb-1">👑 主角全局资源</div>
        <div class="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
          <label>铜钱💰<input type="number" data-dev-res="gold" value="${r.gold}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
          <label>粮食🌾<input type="number" data-dev-res="food" value="${r.food}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
          <label>麻布📦<input type="number" data-dev-res="production" value="${r.production}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
        </div>
        <label class="text-[10px] text-slate-400 block mt-1">宗族声望⭐
          <input type="number" data-dev-rep value="${s.reputation}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
        <button data-dev="applyres" class="w-full mt-1 px-2 py-0.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-[11px]">应用全局资源</button>
      </div>`;

    const rows = s.villages
      .map((v) => {
        const terrainOpts = terrainOptsAll.replace(`value="${v.terrain}"`, `value="${v.terrain}" selected`);
        const factionOpts = factionOptsAll.replace(`value="${v.owner}"`, `value="${v.owner}" selected`);
        const tierOpts = tierOptsAll.replace(`value="${v.tier}"`, `value="${v.tier}" selected`);
        return `
        <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2" data-dev-village="${v.id}">
          <div class="flex items-center gap-1 mb-1">
            <span class="text-base">${TERRAIN_EMOJI[v.terrain]}</span>
            <span class="font-semibold">${v.name}</span>
            <span class="text-[10px] text-slate-400">${TIER_NAME[v.tier]}·Lv${v.level}</span>
          </div>
          <div class="grid grid-cols-4 gap-1 text-[10px] text-slate-400">
            <label>人口<input type="number" data-dev-v-pop="${v.id}" value="${v.population}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
            <label>民心<input type="number" data-dev-v-min="${v.id}" value="${v.minxin}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
            <label>乡勇<input type="number" data-dev-v-mil="${v.id}" value="${v.militia}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
            <label>赋税<input type="number" data-dev-v-tax="${v.id}" value="${v.tax}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
          </div>
          <div class="grid grid-cols-3 gap-1 text-[10px] text-slate-400 mt-1">
            <label>🌾粮产<input type="number" data-dev-v-yf="${v.id}" value="${v.yields.food}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
            <label>📦物资<input type="number" data-dev-v-yp="${v.id}" value="${v.yields.production}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
            <label>💰钱产<input type="number" data-dev-v-yg="${v.id}" value="${v.yields.gold}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100"></label>
          </div>
          <div class="grid grid-cols-3 gap-1 text-[10px] text-slate-400 mt-1">
            <label>地形<select data-dev-v-terrain="${v.id}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5">${terrainOpts}</select></label>
            <label>归属<select data-dev-v-owner="${v.id}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5">${factionOpts}</select></label>
            <label>层级<select data-dev-v-tier="${v.id}" class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5">${tierOpts}</select></label>
          </div>
          <div class="flex gap-1 mt-1">
            <button data-dev="applyvillage" data-id="${v.id}" class="flex-1 px-2 py-0.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-[11px]">应用</button>
            <button data-dev="recompute" data-id="${v.id}" class="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[11px]">重算产出</button>
          </div>
        </div>`;
      })
      .join('');
    return global + rows;
  }

  // ===== 资源：背景图 / 主角人物图 / 英雄人物图 / 分类卡面图 上传 =====
  private resourceHTML(): string {
    const s = this.store.state;
    const heroes = s.heroes
      .map((h) => `<option value="${h.id}">${h.emoji}${h.name}</option>`)
      .join('');
    const cats = (Object.keys(CARD_CATEGORIES) as CardCategory[])
      .map((c) => `<option value="${c}">${CARD_CATEGORIES[c].name}</option>`)
      .join('');
    const mapPreview = s.assets?.mapBackground
      ? `<img src="${s.assets.mapBackground}" class="w-full h-20 object-cover rounded mt-1 border border-slate-600">`
      : '';
    const protPreview = s.assets?.protagonistPortrait
      ? `<img src="${s.assets.protagonistPortrait}" class="w-16 h-20 object-cover rounded mt-1 border border-slate-600">`
      : '';
    return `
      <p class="text-[10px] text-amber-300 mb-2">资源按分类分文件夹：<code>public/assets/{backgrounds,portraits,cards}</code>。上传存为 dataURL 并自动存档。</p>
      <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2">
        <div class="font-semibold mb-1 text-sky-300">🖼️ 大世界背景图</div>
        <input type="file" accept="image/*" data-dev-file="map" class="w-full text-[11px] text-slate-300">
        ${mapPreview}
        <button data-dev="resetbg" class="mt-1 w-full px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[11px]">恢复默认背景</button>
      </div>
      <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2">
        <div class="font-semibold mb-1 text-sky-300">🐉 主角人物图</div>
        <input type="file" accept="image/*" data-dev-file="protagonist" class="w-full text-[11px] text-slate-300">
        ${protPreview}
      </div>
      <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2">
        <div class="font-semibold mb-1 text-sky-300">🦸 英雄人物图</div>
        <select data-dev-herosel class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-[11px] mb-1">${heroes}</select>
        <input type="file" accept="image/*" data-dev-file="hero" class="w-full text-[11px] text-slate-300">
      </div>
      <div class="rounded bg-slate-800/70 border border-slate-700 p-2 mb-2">
        <div class="font-semibold mb-1 text-sky-300">🎴 分类卡面背景</div>
        <select data-dev-catsel class="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-[11px] mb-1">${cats}</select>
        <input type="file" accept="image/*" data-dev-file="card" class="w-full text-[11px] text-slate-300">
      </div>`;
  }

  // 文件选择 → dataURL → 写入 state.assets（背景 / 主角 / 英雄 / 卡面）
  private onFile(e: Event): void {
    const inp = e.target as HTMLInputElement;
    const kind = inp.getAttribute('data-dev-file');
    if (!kind || !inp.files || !inp.files.length) return;
    const file = inp.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const s = this.store.state;
      if (kind === 'map') s.assets.mapBackground = dataUrl;
      else if (kind === 'protagonist') s.assets.protagonistPortrait = dataUrl;
      else if (kind === 'hero') {
        const hid = (this.el.querySelector('[data-dev-herosel]') as HTMLSelectElement)?.value;
        if (hid) {
          s.assets.heroPortraits = s.assets.heroPortraits ?? {};
          s.assets.heroPortraits[hid] = dataUrl;
          const h = s.heroes.find((x) => x.id === hid);
          if (h) h.portrait = dataUrl;
        }
      } else if (kind === 'card') {
        const cat = (this.el.querySelector('[data-dev-catsel]') as HTMLSelectElement)?.value as CardCategory;
        if (cat) {
          s.assets.cardBackgrounds = s.assets.cardBackgrounds ?? {};
          s.assets.cardBackgrounds[cat] = dataUrl;
        }
      }
      this.store.commit();
      this.render();
      // 大世界背景变更需触发地图重绘
      window.dispatchEvent(new Event('resize'));
    };
    reader.readAsDataURL(file);
  }

  private resetBg(): void {
    this.store.state.assets.mapBackground = undefined;
    this.store.commit();
    this.render();
    window.dispatchEvent(new Event('resize'));
  }

  // ===== 点击委托 =====
  private onClick(e: MouseEvent): void {
    const tb = (e.target as HTMLElement).closest('[data-action="devtab"]') as HTMLElement | null;
    if (tb) {
      this.tab = tb.getAttribute('data-tab') as DevTab;
      this.render();
      return;
    }
    const t = (e.target as HTMLElement).closest('[data-dev]') as HTMLElement | null;
    if (!t) return;
    const act = t.getAttribute('data-dev')!;
    const id = t.getAttribute('data-id')!;
    switch (act) {
      case 'close':
        this.toggle();
        break;
      case 'resetbg':
        this.resetBg();
        break;
      case 'focus':
        this.opts.focusVillage(id);
        break;
      case 'applypos':
        this.applyPos(id);
        break;
      case 'applyhero':
        this.applyHero(id);
        break;
      case 'applyvillage':
        this.applyVillage(id);
        break;
      case 'applyres':
        this.applyRes();
        break;
      case 'recompute':
        recomputeYields(this.store.state);
        this.store.commit();
        this.render();
        break;
      case 'exportdev':
        this.exportDev();
        break;
      case 'cleardev':
        this.clearDev();
        break;
    }
  }

  // 一键导出开发覆盖（独立层，不影响玩家存档）：弹窗展示 JSON + 复制/下载
  private exportDev(): void {
    const json = this.store.exportDev();
    openModal(
      `<div class="max-w-lg w-[92%] rounded-2xl bg-slate-900 border border-fuchsia-500/40 shadow-2xl pop-in">
        <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
          <span class="font-bold text-fuchsia-200">📤 导出开发覆盖（独立层，不影响玩家存档）</span>
          <button data-modal-close class="ml-auto text-slate-400 hover:text-white transition">✕</button>
        </div>
        <div class="p-3">
          <pre class="text-[10px] text-slate-300 overflow-auto max-h-72 bg-slate-950/60 rounded p-2">${this.escapeHtml(json)}</pre>
          <div class="flex gap-2 mt-2">
            <button data-action="copydev" class="flex-1 px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-xs">📋 复制到剪贴板</button>
            <a href="data:application/json;charset=utf-8,${encodeURIComponent(json)}" download="sank_dev_overrides.json" class="flex-1 text-center px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs no-underline">⬇️ 下载 JSON</a>
          </div>
        </div>
      </div>`,
    );
  }

  // 清空开发覆盖（仅清覆盖层与独立键；玩家存档不受影响，如需完全复原请重载页面）
  private clearDev(): void {
    openModal(
      `<div class="max-w-sm w-[92%] rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl pop-in text-center p-5">
        <div class="text-3xl mb-2">🧹</div>
        <p class="text-sm text-slate-200 mb-4">确认清空全部开发覆盖？仅清除覆盖层与独立存储键；玩家存档不受影响。本会话已应用的数值会保留至重载页面。</p>
        <div class="flex gap-2 justify-center">
          <button data-modal-close class="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition">取消</button>
          <button data-action="confirmclear" class="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition">确认清空</button>
        </div>
      </div>`,
    );
  }

  private escapeHtml(s: string): string {
    return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
  }

  private applyPos(id: string): void {
    const v = this.store.state.villages.find((x) => x.id === id);
    if (!v) return;
    const row = this.el.querySelector(`[data-dev-row="${id}"]`);
    if (!row) return;
    const x = Number((row.querySelector('[data-dev-pos-x]') as HTMLInputElement).value);
    const y = Number((row.querySelector('[data-dev-pos-y]') as HTMLInputElement).value);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      v.position = [x, y];
      this.store.commit();
    }
  }

  private applyHero(id: string): void {
    const h = this.store.state.heroes.find((x) => x.id === id);
    if (!h) return;
    const q = (sel: string): HTMLInputElement => this.el.querySelector(sel) as HTMLInputElement;
    h.emoji = q(`[data-dev-hero-emoji="${id}"]`).value || h.emoji;
    h.name = q(`[data-dev-hero-name="${id}"]`).value || h.name;
    h.title = q(`[data-dev-hero-title="${id}"]`).value || h.title;
    h.boundVillage = q(`[data-dev-hero-bound="${id}"]`).value;
    this.el.querySelectorAll<HTMLInputElement>(`[data-dev-hero-stat="${id}"]`).forEach((inp) => {
      const k = inp.getAttribute('data-stat') as keyof HeroStat;
      const val = Number(inp.value);
      if (Number.isFinite(val)) (h.stats as Record<keyof HeroStat, number>)[k] = val;
    });
    h.unlocked = (this.el.querySelector(`[data-dev-hero-unlock="${id}"]`) as HTMLInputElement).checked;
    this.store.commit();
  }

  private applyVillage(id: string): void {
    const v = this.store.state.villages.find((x) => x.id === id);
    if (!v) return;
    const q = (sel: string): HTMLInputElement => this.el.querySelector(sel) as HTMLInputElement;
    const num = (sel: string): number => {
      const n = Number(q(sel).value);
      return Number.isFinite(n) ? n : 0;
    };
    v.population = num(`[data-dev-v-pop="${id}"]`);
    v.minxin = Math.max(0, Math.min(100, num(`[data-dev-v-min="${id}"]`)));
    v.militia = num(`[data-dev-v-mil="${id}"]`);
    v.tax = Math.max(0, Math.min(100, num(`[data-dev-v-tax="${id}"]`)));
    v.yields.food = num(`[data-dev-v-yf="${id}"]`);
    v.yields.production = num(`[data-dev-v-yp="${id}"]`);
    v.yields.gold = num(`[data-dev-v-yg="${id}"]`);
    v.terrain = q(`[data-dev-v-terrain="${id}"]`).value as Terrain;
    v.owner = q(`[data-dev-v-owner="${id}"]`).value as FactionId;
    v.tier = q(`[data-dev-v-tier="${id}"]`).value as Tier;
    this.store.commit();
  }

  private applyRes(): void {
    const r = this.store.state.resources.player;
    const q = (sel: string): number => Number((this.el.querySelector(sel) as HTMLInputElement).value);
    r.gold = q('[data-dev-res="gold"]');
    r.food = q('[data-dev-res="food"]');
    r.production = q('[data-dev-res="production"]');
    this.store.state.reputation = q('[data-dev-rep]');
    this.store.commit();
  }
}

export function mountDevPanel(
  root: HTMLElement,
  store: GameStore,
  scenario: Scenario,
  opts: DevPanelOptions,
): DevPanel {
  return new DevPanel(root, store, scenario, opts);
}
