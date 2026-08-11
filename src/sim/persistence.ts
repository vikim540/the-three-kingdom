import type { GameState } from './store';

// ===== 存储层：内容与存档分离 =====
// 静态内容（剧本/英雄/村落/任务）以仓库内 JSON/TS 文件存在（data-driven，可 AI 批量灌入）；
// 运行时存档（可变状态快照）走本存储适配器，未来可从 localStorage 无缝换到
// IndexedDB / Cloudflare D1（Workers + KV/R2），只需替换 Adapter 实现。

export interface StorageAdapter {
  save(key: string, data: string): void;
  load(key: string): string | null;
  remove(key: string): void;
  keys(): string[];
}

export class LocalStorageAdapter implements StorageAdapter {
  save(key: string, data: string): void {
    try {
      localStorage.setItem(key, data);
    } catch {
      /* 隐私模式/配额超限时静默失败 */
    }
  }
  load(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }
  keys(): string[] {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith(SAVE_PREFIX));
    } catch {
      return [];
    }
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();
export const SAVE_PREFIX = 'sank_save_';

// 存盘结构版本（便于未来迁移）
const SAVE_VERSION = 1;

// 仅序列化可变运行时状态；静态内容（routes/factions/quest 定义）由剧本重建。
export function serialize(state: GameState): string {
  const blob = {
    v: SAVE_VERSION,
    scenarioName: state.scenarioName,
    realm: state.realm,
    turn: state.turn,
    calendar: state.calendar,
    reputation: state.reputation,
    title: state.title,
    flags: state.flags,
    questsCompleted: state.questsCompleted,
    announcedQuests: state.announcedQuests,
    resources: state.resources,
    villages: state.villages,
    heroes: state.heroes,
    npcs: state.npcs,
    log: state.log.slice(0, 60),
    selectedId: state.selectedId,
    status: state.status,
    mapMode: state.mapMode,
    adventureState: state.adventureState,
    attr: state.attr,
    assets: state.assets,
    resourcePoints: state.resourcePoints,
    gachaCandidates: state.gachaCandidates,
    activeEvent: state.activeEvent,
    completedBranches: state.completedBranches,
    eventDrawDue: state.eventDrawDue,
  };
  return JSON.stringify(blob);
}

export function deserialize(raw: string): any {
  return JSON.parse(raw);
}
