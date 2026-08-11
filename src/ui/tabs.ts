// ===== 公共组件：Tab 切换容器（白名单强制复用，禁止各面板手写重复 tab 条）=====
// 统一选中态高亮 + hover 放大（保留 Tailwind 原生动效，不得偷懒移除）。
export interface TabSpec {
  label: string;
  value: string;
}

// 渲染一组 tab 按钮。data-action 默认 'tab'，data-tab 带 value；点击事件由 hud 统一委托。
export function tabBarHTML(tabs: TabSpec[], active: string, action = 'tab'): string {
  return tabs
    .map(
      (t) =>
        `<button data-action="${action}" data-tab="${t.value}" class="px-2 py-1 rounded text-xs transition-transform duration-150 ${
          active === t.value
            ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white scale-105 shadow'
            : 'bg-slate-700 text-slate-200 hover:scale-105'
        }">${t.label}</button>`,
    )
    .join('');
}
