// ===== 公共组件：全局时间组件（白名单强制复用）=====
// 统一顶栏时间显示（公元年 + 汉廷年号·月·旬），避免散落拼接硬编码。
import type { Calendar } from '../data/types';
import { adLabel, dateLabel } from '../sim/engine';

export function timeBarHTML(c: Calendar): string {
  return `<span class="text-slate-300">📅 ${adLabel(c)} · ${dateLabel(c)}</span>`;
}
