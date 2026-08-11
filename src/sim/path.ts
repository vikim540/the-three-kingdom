// ===== 通用路径工具（编辑覆盖层 devOverrides 复用）=====
// 以 lodash 风格的点路径读写嵌套对象，避免编辑模式散落手写深拷贝。

export function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setByPath(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  let o = obj;
  for (const k of keys) {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  }
  o[last] = value;
}

// 深合并覆盖层（数组整体替换，不逐元素合并，避免错位）
export function deepMerge(base: any, over: any): any {
  if (Array.isArray(over)) return over;
  if (over && typeof over === 'object') {
    const out: any = Array.isArray(base) ? [...base] : { ...base };
    for (const k of Object.keys(over)) out[k] = deepMerge(base?.[k], over[k]);
    return out;
  }
  return over;
}
