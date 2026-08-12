import { create } from "zustand";

export interface Item {
  id: string;
  name: string;
  type: "WEAPON" | "ARMOR" | "ACCESSORY" | "ART" | "POTION" | "MATERIAL";
  quality: "凡" | "靈" | "王" | "帝" | "仙";
  icon: string;
  description: string;
  stats?: {
    atk?: number;
    def?: number;
    hp?: number;
  };
}

interface InventoryState {
  spiritStones: number;
  heroSouls: number;
  isOpenB: boolean;   // 主角個人物品欄
  isOpenTab: boolean; // 全隊物品欄
  activeHeroId: string;
  backpack: (Item | null)[];
  equipment: {
    WEAPON: Item | null;
    ARMOR: Item | null;
    ACCESSORY: Item | null;
    ART: Item | null;
  };

  toggleB: () => void;
  toggleTab: () => void;
  closeAll: () => void;
  setActiveHeroId: (id: string) => void;
  addItem: (item: Item) => void;
  equipItem: (item: Item) => void;
  unequipSlot: (slot: "WEAPON" | "ARMOR" | "ACCESSORY" | "ART") => void;
  consumeItem: (item: Item) => void;
  addCurrencies: (spiritStones: number, heroSouls: number) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  spiritStones: 580,
  heroSouls: 32,
  isOpenB: false,
  isOpenTab: false,
  activeHeroId: "hero_protagonist",
  backpack: [
    {
      id: "i_sword_01",
      name: "青靈飛劍",
      type: "WEAPON",
      quality: "靈",
      icon: "🗡️",
      description: "靈宵山傳承飛劍，增加 25 點攻擊力。",
      stats: { atk: 25 },
    },
    {
      id: "i_potion_01",
      name: "紫霄修仙丹",
      type: "POTION",
      quality: "靈",
      icon: "🧪",
      description: "恢復全隊 50 點生命值。",
    },
    {
      id: "i_bow_01",
      name: "落日萬鈞弓",
      type: "WEAPON",
      quality: "仙",
      icon: "🏹",
      description: "黃忠神射仙弓，攻擊力 +50，伏擊爆傷 +40%。",
      stats: { atk: 50 },
    },
    {
      id: "i_art_01",
      name: "九天引雷訣",
      type: "ART",
      quality: "帝",
      icon: "⚡",
      description: "修仙功法，提升 15% 暴擊率。",
    },
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  ],
  equipment: {
    WEAPON: {
      id: "i_sword_init",
      name: "青鋒劍",
      type: "WEAPON",
      quality: "凡",
      icon: "⚔️",
      description: "普通打鐵飛劍。",
      stats: { atk: 10 },
    },
    ARMOR: null,
    ACCESSORY: null,
    ART: null,
  },

  toggleB: () => set((state) => ({ isOpenB: !state.isOpenB, isOpenTab: false })),
  toggleTab: () => set((state) => ({ isOpenTab: !state.isOpenTab, isOpenB: false })),
  closeAll: () => set({ isOpenB: false, isOpenTab: false }),
  setActiveHeroId: (activeHeroId) => set({ activeHeroId }),

  addItem: (item) => {
    const bp = [...get().backpack];
    const emptyIdx = bp.findIndex((slot) => slot === null);
    if (emptyIdx !== -1) {
      bp[emptyIdx] = item;
      set({ backpack: bp });
    }
  },

  equipItem: (item) => {
    if (item.type !== "WEAPON" && item.type !== "ARMOR" && item.type !== "ACCESSORY" && item.type !== "ART") return;
    const currentEquip = get().equipment[item.type];
    const bp = get().backpack.filter((i) => i?.id !== item.id);
    if (currentEquip) bp.push(currentEquip);

    set({
      equipment: { ...get().equipment, [item.type]: item },
      backpack: bp,
    });
  },

  unequipSlot: (slot) => {
    const currentEquip = get().equipment[slot];
    if (!currentEquip) return;
    const bp = [...get().backpack];
    const emptyIdx = bp.findIndex((s) => s === null);
    if (emptyIdx !== -1) {
      bp[emptyIdx] = currentEquip;
      set({
        equipment: { ...get().equipment, [slot]: null },
        backpack: bp,
      });
    }
  },

  consumeItem: (item) => {
    if (item.type === "POTION") {
      const bp = get().backpack.map((i) => (i?.id === item.id ? null : i));
      set({ backpack: bp });
    }
  },

  addCurrencies: (spiritStones, heroSouls) =>
    set((state) => ({
      spiritStones: state.spiritStones + spiritStones,
      heroSouls: state.heroSouls + heroSouls,
    })),
}));
