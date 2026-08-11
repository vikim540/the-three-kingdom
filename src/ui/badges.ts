// ===== 组件化状态徽章（避免散落硬编码）=====
// 统一「开发状态 / 招揽状态」的视觉表达，供英雄卡、人物志、关系树复用。

export type BadgeStatus = 'developed' | 'to_develop' | 'unlocked' | 'locked';

export function statusBadge(status: BadgeStatus): string {
  switch (status) {
    case 'developed':
      return '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/70 text-emerald-100 shrink-0">已开发</span>';
    case 'to_develop':
      return '<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-600/70 text-slate-300 shrink-0">待开发</span>';
    case 'unlocked':
      return '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-600/70 text-amber-100 shrink-0">已登场</span>';
    case 'locked':
      return '<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-600/70 text-slate-400 shrink-0">未招揽</span>';
  }
}

// 锁定标签：权限未达时的统一视觉（如「晋升官职解锁」）。三处 UI 复用，杜绝散落硬编码。
export function lockTag(text: string): string {
  return `<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/70 text-amber-200 border border-amber-700/60 shrink-0">🔒 ${text}</span>`;
}
