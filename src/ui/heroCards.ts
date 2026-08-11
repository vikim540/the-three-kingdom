import type { GameStore } from '../sim/store';
import type { Scenario, HeroStat, CharRef, Npc, Hero } from '../data/types';
import { statusBadge } from './badges';
import { openModal, closeModal } from './modal';

// ===== 独立系统：英雄卡牌 / 人物志 =====
// 职责：(1) 在左侧面板渲染英雄卡（长方形立绘占位 + 五维数值）；
//       (2) 点击卡 → 代入该人物视角，弹出「人物志」弹窗（故里故事 + 分支式宗族/人际脉络）。
// 完全自包含：只依赖 store / scenario，通过控制器与外界通信（聚焦地点 / 切换人物志），不污染 hud 渲染。

const STAT_ORDER: (keyof HeroStat)[] = ['lead', 'war', 'int', 'pol', 'cha'];
const STAT_NAME: Record<keyof HeroStat, string> = {
  lead: '统率',
  war: '武力',
  int: '智力',
  pol: '政治',
  cha: '魅力',
};

export interface HeroController {
  focusVillage: (villageId: string) => void;
  openHero: (heroId: string) => void;
}

// 关系 → 配色（Tailwind 徽章）+ 分支图标
function relationStyle(rel: string): { cls: string; icon: string } {
  if (rel.includes('父') || rel.includes('母')) return { cls: 'bg-rose-700/70 text-rose-100', icon: '🏠' };
  if (rel.includes('师')) return { cls: 'bg-amber-700/70 text-amber-100', icon: '📚' };
  if (rel.includes('友') || rel.includes('同窗')) return { cls: 'bg-sky-700/70 text-sky-100', icon: '🤝' };
  if (rel.includes('主君') || rel.includes('义')) return { cls: 'bg-emerald-700/70 text-emerald-100', icon: '⚔️' };
  if (rel.includes('资助')) return { cls: 'bg-purple-700/70 text-purple-100', icon: '💰' };
  return { cls: 'bg-slate-700/70 text-slate-200', icon: '👤' };
}

function statBar(k: keyof HeroStat, val: number): string {
  return `<div class="flex items-center gap-1 text-[10px] mb-0.5">
    <span class="w-6 text-slate-400 shrink-0">${STAT_NAME[k]}</span>
    <div class="flex-1 h-1.5 rounded bg-slate-700"><div class="h-1.5 rounded bg-amber-400" style="width:${val}%"></div></div>
    <span class="w-5 text-right text-slate-200">${val}</span>
  </div>`;
}

// 立绘：编辑态上传的 hero.portrait 优先，否则 emoji 占位（3:4）
function portraitHTML(h: Hero, w: number, hgt: number): string {
  if (h.portrait)
    return `<img src="${h.portrait}" class="rounded-lg border border-slate-600 object-cover" style="width:${w}px;height:${hgt}px;" alt="${h.name}立绘">`;
  return `<div class="shrink-0 rounded-lg bg-slate-900/70 border border-slate-600 flex flex-col items-center justify-center text-slate-500 text-[10px]" style="width:${w}px;height:${hgt}px;"><span style="font-size:${Math.round(w * 0.4)}px">${h.emoji}</span><span class="mt-2">立绘预留</span></div>`;
}

export class HeroSystem {
  constructor(
    root: HTMLElement,
    private store: GameStore,
    private scenario: Scenario,
    private controller: HeroController,
  ) {
    // 弹窗容器统一交给 modal.ts（全局唯一 overlay），此处不再各自维护图层
    void root;
  }

  // 英雄卡列表 HTML（插入左侧面板「🦸 英雄」标签页）
  cardsHTML(): string {
    const s = this.store.state;
    const cards = s.heroes
      .map((h) => {
        const stats = STAT_ORDER.map((k) => statBar(k, h.stats[k])).join('');
        const badge = statusBadge(h.unlocked ? 'unlocked' : 'locked');
        return `<div class="rounded-lg bg-slate-700/40 border ${
          h.unlocked ? 'border-yellow-500/50' : 'border-slate-600'
        } p-2 mb-2 transition hover:border-sky-400">
          <div class="flex gap-2">
            ${portraitHTML(h, 60, 80)}
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm flex items-center gap-1">${h.emoji} ${h.name}
                ${badge}
              </div>
              <div class="text-[10px] text-slate-400 mb-1 truncate">${h.title}</div>
              ${stats}
            </div>
          </div>
          <button data-hero-btn="${h.id}" class="mt-1 w-full text-[10px] px-2 py-1 rounded bg-sky-700/80 hover:bg-sky-600 transition text-white">查看人物志 ▶</button>
        </div>`;
      })
      .join('');
    return `<div class="font-bold mb-2 text-yellow-300">🦸 英雄谱</div>
      <div class="text-[10px] text-slate-400 mb-2">点击「查看人物志」代入该人物视角，阅览故里故事与宗族关系（可点击关系中人物跳转其地点）。</div>
      ${cards}`;
  }

  // 绑定卡片上的「查看人物志」按钮（每次面板重渲后需重新绑定）
  bindCards(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('button[data-hero-btn]').forEach((btn) => {
      btn.addEventListener('click', () => this.showPerspective(btn.getAttribute('data-hero-btn')!));
    });
  }

  // 代入视角：人物志弹窗（含分支式宗族/人际脉络），复用全局 modal.ts
  showPerspective(id: string): void {
    const h = this.store.state.heroes.find((x) => x.id === id);
    if (!h) return;
    const v = this.store.state.villages.find((x) => x.id === h.boundVillage);
    const stats = STAT_ORDER.map((k) => statBar(k, h.stats[k])).join('');
    const tree = this.clanTree(h.clan);
    const badge = statusBadge(h.unlocked ? 'unlocked' : 'locked');

    const card = `
      <div class="max-w-2xl w-[92%] max-h-[82vh] overflow-auto rounded-2xl bg-slate-800 border border-yellow-500/40 shadow-2xl pop-in">
        <div class="flex items-center gap-2 px-5 py-3 border-b border-slate-700 bg-slate-900/60">
          <span class="text-yellow-300 font-bold">🦸 人物志</span>
          <span class="text-sm text-slate-200">${h.emoji} ${h.name}</span>
          <span class="text-[11px] text-slate-400">${h.title}</span>
          ${badge}
          <button data-modal-close class="ml-auto text-slate-400 hover:text-white text-sm px-2 transition">✕</button>
        </div>
        <div class="p-5 flex gap-4">
          ${portraitHTML(h, 120, 160)}
          <div class="flex-1 min-w-0">
            <div class="text-[11px] text-slate-400 mb-1">五维 · 统武智政魅</div>
            <div class="mb-3">${stats}</div>
            <div class="text-[11px] text-amber-300 mb-1">🏡 故里故事</div>
            <p class="text-xs text-slate-200 leading-relaxed mb-3 whitespace-pre-line">${h.hometown}</p>
            <div class="text-[11px] text-amber-300 mb-2">🧬 宗族 / 人际脉络（分支）</div>
            ${tree}
          </div>
        </div>
        <div class="px-5 py-3 border-t border-slate-700 bg-slate-900/40 flex items-center gap-2">
          <div class="text-[10px] text-slate-500 italic flex-1">${h.biography}</div>
          ${
            v
              ? `<button data-hero-goto="${v.id}" class="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 transition text-white text-xs">前往故里（聚焦${v.name}）</button>`
              : ''
          }
        </div>
      </div>`;

    const { root: ov } = openModal(card);
    const goto = ov.querySelector<HTMLButtonElement>('[data-hero-goto]');
    if (goto) {
      goto.addEventListener('click', () => {
        this.controller.focusVillage(goto.getAttribute('data-hero-goto')!);
        this.hide();
      });
    }
    // 关系树节点点击：跳转地点 / 切换人物志
    ov.querySelectorAll<HTMLElement>('[data-clan]').forEach((el) => {
      el.addEventListener('click', () => this.onClanClick(el.getAttribute('data-clan')!));
    });
  }

  // 渲染分支式关系树（中心人物 + 分支节点，彼此引用 NPC 或英雄）
  private clanTree(refs: CharRef[]): string {
    const nodes = refs
      .map((ref) => {
        if (ref.kind === 'hero') {
          const h = this.store.state.heroes.find((x) => x.id === ref.id);
          if (!h) return '';
          return this.branchNode({ icon: h.emoji, relation: '英雄', name: h.name, note: h.title, status: h.unlocked ? 'unlocked' : 'locked', nav: `hero:${h.id}` });
        }
        const n = this.scenario.npcs.find((x) => x.id === ref.id);
        if (!n) return '';
        const nav = n.status === 'developed' && n.boundVillage ? `village:${n.boundVillage}` : '';
        return this.branchNode({ icon: relationStyle(n.relation).icon, relation: n.relation, name: n.name, note: n.note, status: n.status, nav });
      })
      .join('');
    return `<div class="relative pl-4">
      <div class="absolute left-2 top-1 bottom-1 w-px bg-slate-600"></div>
      ${nodes}
    </div>`;
  }

  // 单个分支节点（含连接线、关系徽章、状态徽章、可点击导航）
  private branchNode(o: {
    icon: string;
    relation: string;
    name: string;
    note?: string;
    status: 'developed' | 'to_develop' | 'unlocked' | 'locked';
    nav: string;
  }): string {
    const rs = relationStyle(o.relation);
    const clickable = o.nav !== '';
    const navHint = clickable ? '<span class="text-slate-500 text-[10px] shrink-0">前往▶</span>' : '';
    return `<div class="relative mb-2">
      <span class="absolute -left-[14px] top-3 w-[12px] h-px bg-slate-600"></span>
      <button ${clickable ? `data-clan="${o.nav}"` : ''} class="w-full text-left rounded-lg border border-slate-700 bg-slate-700/40 ${
        clickable ? 'hover:bg-slate-600/60 cursor-pointer' : 'cursor-default'
      } transition px-2 py-1 flex items-center gap-2">
        <span class="text-base shrink-0">${o.icon}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-[10px] px-1.5 py-0.5 rounded ${rs.cls} shrink-0">${o.relation}</span>
            <span class="text-xs text-slate-100 truncate">${o.name}</span>
            ${statusBadge(o.status)}
          </div>
          ${o.note ? `<div class="text-[10px] text-slate-400 truncate">${o.note}</div>` : ''}
        </div>
        ${navHint}
      </button>
    </div>`;
  }

  private onClanClick(key: string): void {
    const [kind, id] = key.split(':');
    if (kind === 'hero') this.showPerspective(id); // 切换人物志（覆盖当前弹窗）
    else if (kind === 'village') {
      this.controller.focusVillage(id);
      this.hide();
    }
  }

  hide(): void {
    closeModal();
  }
}
