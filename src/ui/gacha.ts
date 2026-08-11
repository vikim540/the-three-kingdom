// ===== 月度行动事件卡 UI（高级卡牌质感）=====
// 职责：朔日抽 3 张候选（大类+稀有度+预 rolled 分支数值）→ 玩家择 1 → 揭晓为「本月事件」，
// 其行动分支在当月自由施行，完成拿五维/人脉/资源，部分分支在大世界生成可开采资源点。
// 卡=事件机会（非武将）。纯展示 + 调用 store，不持有游戏规则。
import type { GameStore } from '../sim/store';
import type { GachaCandidate, GachaCandidateBranch } from '../data/config';
import { openModal } from './modal';
import { CARD_CATEGORIES, MONTHLY_DRAW, rarityRank, PITY_RARITY } from '../data/config';

// 入口：依当前状态决定展示「进行中事件 / 待选候选 / 空」
export function openGacha(store: GameStore): void {
  const shell = `
    <div class="max-w-3xl w-[94%] max-h-[88vh] overflow-auto rounded-2xl bg-slate-900/95 border border-fuchsia-500/40 shadow-2xl pop-in">
      <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-800/60">
        <span class="text-fuchsia-300 font-bold text-lg">🎴 月度行动事件</span>
        <span class="text-[11px] text-slate-400">朔日抽卡，择一为当月主题</span>
        <button data-modal-close class="ml-auto text-slate-400 hover:text-white transition">✕</button>
      </div>
      <div id="gachaBody" class="p-4"></div>
    </div>`;
  const { root } = openModal(shell);
  const body = root.querySelector<HTMLElement>('#gachaBody')!;
  if (store.state.activeEvent) renderEvent(body, store);
  else if (store.state.gachaCandidates.length) renderPick(body, store);
  else renderEmpty(body, store);
}

// ===== 待选：3 张候选（显大类+稀有度色，分支数值隐藏），择 1 =====
function renderPick(body: HTMLElement, store: GameStore): void {
  const gold = store.state.resources.player.gold;
  const cards = store.state.gachaCandidates.map((c) => candidateHTML(c)).join('');
  body.innerHTML = `
    <div class="text-center mb-3 text-sm text-slate-300">🎴 本月朔日 · 抽得 3 张机缘（显大类与稀有度，分支成效待揭晓），择 1 为当月主题</div>
    <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">${cards}</div>
    <p class="text-[10px] text-slate-500 mt-3 text-center">选中即扣 💰${MONTHLY_DRAW.cost}（现有 💰${gold}）；织席贩履所得即为此用。不想抽也可纯手动摆摊种田慢玩。</p>`;
  body.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-pick')!;
      const res = store.pickEventCard(id);
      if (!res.ok) {
        body.innerHTML = `<div class="text-center py-6"><div class="text-4xl mb-2">💸</div><p class="text-sm text-amber-300 mb-4">${res.msg}</p><button data-gacha-back class="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-sm">返回</button></div>`;
        body.querySelector('[data-gacha-back]')?.addEventListener('click', () => renderPick(body, store));
        return;
      }
      renderEvent(body, store); // 揭晓为本月事件
    });
  });
}

// 候选卡：背面显「大类」大字 + 稀有度色/辉光；高稀有度加流光
function candidateHTML(c: GachaCandidate): string {
  const shine = rarityRank(c.rarity) >= rarityRank(PITY_RARITY) ? '<div class="gc-shine"></div>' : '';
  return `
    <button data-pick="${c.id}" class="gacha-card mystery" style="--rc:${c.rarityColor};--glow:${c.rarityGlow};">
      <div class="gc-inner">
        <div class="gc-back">
          ${shine}
          <div class="gc-cat" style="color:#fff;">${c.categoryName}</div>
          <div class="gc-back-emblem">${c.categoryEmoji}</div>
          <div class="gc-back-text">${c.line}线</div>
          <div class="gc-rarity" style="--rc:${c.rarityColor};">${c.rarityName}</div>
          <div style="font-size:.6rem;color:#e9d5ff;margin-top:6px;letter-spacing:1px;">未知机缘 · 点击揭晓</div>
        </div>
      </div>
    </button>`;
}

// ===== 进行中：本月事件 + 行动分支（含预 rolled 数值预览）=====
function renderEvent(body: HTMLElement, store: GameStore): void {
  const ae = store.state.activeEvent;
  if (!ae) {
    body.innerHTML = `<div class="text-center py-6"><div class="text-4xl mb-2">🗓️</div><p class="text-sm text-slate-300 mb-4">本月事件已了，静待朔日再启新机。</p><button data-modal-close class="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-sm">关闭</button></div>`;
    return;
  }
  const done = store.state.completedBranches;
  const rpCount = store.state.resourcePoints.length;
  const shine = rarityRank(ae.rarity) >= rarityRank(PITY_RARITY) ? 'gc-shine' : '';

  const branchHTML = ae.branches
    .map((b) => {
      const isDone = done.includes(b.id);
      const locked = !!b.requireOfficial && store.state.title === '布衣';
      const cls = isDone
        ? 'border-emerald-500 bg-emerald-800/40 text-emerald-200 cursor-default'
        : locked
        ? 'border-slate-700 bg-slate-800/60 text-slate-500 cursor-not-allowed'
        : 'border-fuchsia-500 bg-fuchsia-700/40 hover:bg-fuchsia-600 text-white hover:scale-[1.02]';
      const tag = isDone ? '✅ 已施行' : locked ? '🔒 需授官' : '▶ 施行';
      return `<button data-branch="${b.id}" ${isDone || locked ? 'disabled' : ''} class="w-full my-1 px-3 py-2 rounded-lg text-left border transition-transform duration-150 ${cls}">
        <div class="text-sm font-semibold">${tag}　${b.label}</div>
        ${b.desc ? `<div class="text-[11px] opacity-80 mt-0.5">${b.desc}</div>` : ''}
        <div class="mt-1">${rewardChips(b)}</div>
      </button>`;
    })
    .join('');

  body.innerHTML = `
    <div class="text-center mb-3 text-xs text-slate-400">本月行动主题（${ae.line}线）</div>
    <div class="rounded-xl p-3 mb-3 text-center relative overflow-hidden" style="border:2px solid ${ae.rarityColor};box-shadow:0 0 18px ${ae.rarityGlow};background-image:linear-gradient(155deg,#1e1b4b,${ae.rarityColor}55);">
      ${shine ? '<div class="gc-shine"></div>' : ''}
      <div class="gc-cat" style="color:#fff;">${ae.categoryName}</div>
      <div class="text-lg font-bold text-white">${ae.emoji} ${ae.name}</div>
      <div class="text-[11px] text-slate-200 mt-1">${ae.desc}</div>
      <div class="text-[10px] text-slate-300 mt-1">稀有度 <span style="color:${ae.rarityColor};font-weight:700;">${ae.rarityName}</span></div>
    </div>
    <div class="text-[11px] text-slate-400 mb-1">行动分支（当月 3 旬内自由施行，完成拿五维/人脉/资源）：</div>
    ${branchHTML}
    <div class="flex items-center justify-between mt-3 text-[10px] text-slate-500">
      <span>已施行 ${done.length}/${ae.branches.length}</span>
      <span>大世界资源点：${rpCount} 处（见「🟫资源」看板或在地图点击开采）</span>
    </div>
    <div class="flex gap-2 justify-center mt-3">
      ${done.length >= ae.branches.length ? '<button data-modal-close class="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm">本月了结</button>' : ''}
      <button data-modal-close class="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition">稍后再办</button>
    </div>`;

  body.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-branch')!;
      const res = store.executeBranch(id);
      if (!res.ok) {
        const tip = document.createElement('div');
        tip.className = 'text-[11px] text-amber-300 text-center mt-1';
        tip.textContent = res.msg;
        body.appendChild(tip);
        setTimeout(() => tip.remove(), 1800);
        return;
      }
      renderEvent(body, store); // 刷新面板（含成效与完成态）
    });
  });
}

// 预 rolled 成效 → 卡面 chips（展示「属性全随机」的结果）
function rewardChips(b: GachaCandidateBranch): string {
  const r = b.rolledReward;
  const out: string[] = [];
  const STAT_CN: Record<string, string> = { lead: '统', war: '武', int: '智', pol: '政', cha: '魅' };
  if (r.attr)
    for (const k of Object.keys(r.attr) as (keyof typeof r.attr)[]) {
      const v = r.attr[k];
      if (v) out.push(`<span class="chip up">${STAT_CN[k] ?? k}+${v}</span>`);
    }
  if (r.res)
    for (const k of Object.keys(r.res) as (keyof typeof r.res)[]) {
      const v = r.res[k as 'gold' | 'food' | 'production'];
      if (v) out.push(`<span class="chip res">${k === 'gold' ? '💰' : k === 'food' ? '🌾' : '📦'}+${v}</span>`);
    }
  if (r.spawnResource) out.push(`<span class="chip">⛏️资源点</span>`);
  if (r.unlockNpc) out.push(`<span class="chip">🔓人物</span>`);
  return out.length ? out.join('') : '<span class="text-[10px] text-slate-400">（结构性成效）</span>';
}

// ===== 空：本月无进行中事件 =====
function renderEmpty(body: HTMLElement, store: GameStore): void {
  const gold = store.state.resources.player.gold;
  body.innerHTML = `
    <div class="text-center py-6">
      <div class="text-4xl mb-2">🗓️</div>
      <p class="text-sm text-slate-300 mb-2">本月暂无进行中的行动事件。</p>
      <p class="text-[11px] text-slate-500 mb-4">下月朔日将自动抽卡；也可立即卜一卦（选中耗 💰${MONTHLY_DRAW.cost}，现有 💰${gold}）。</p>
      <button data-force class="px-4 py-1.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold transition">立即卜一卦（💰${MONTHLY_DRAW.cost}）</button>
    </div>`;
  body.querySelector('[data-force]')?.addEventListener('click', () => {
    store.maybeStartMonthEvent();
    if (store.state.gachaCandidates.length) renderPick(body, store);
  });
}
