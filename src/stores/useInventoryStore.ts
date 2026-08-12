import { create } from "zustand";

export type ItemType = "WEAPON" | "ARMOR" | "ACCESSORY" | "ART" | "POTION" | "MATERIAL";
export type ItemQuality = "凡" | "靈" | "王" | "帝" | "仙";

export interface ItemStats {
  hp?: number;
  atk?: number;
  def?: number;
  speed?: number;
  moveRange?: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  quality: ItemQuality;
  icon: string;
  description: string;
  stackCount?: number;
  stats?: ItemStats;
}

export type EquipSlot = "WEAPON" | "ARMOR" | "ACCESSORY" | "ART";

export interface HeroInventoryData {
  equipment: Record<EquipSlot, Item | null>;
  backpack: (Item | null)[];
}

interface InventoryState {
  spiritStones: number;
  heroSouls: number;
  isOpenB: boolean;
  isOpenTab: boolean;
  activeHeroId: string;
  heroInventories: Record<string, HeroInventoryData>;

  toggleB: (heroId?: string) => void;
  toggleTab: () => void;
  closeAll: () => void;
  setActiveHeroId: (heroId: string) => void;
  equipItemForHero: (heroId: string, item: Item, fromBackpackIdx?: number) => void;
  unequipSlotForHero: (heroId: string, slot: EquipSlot) => void;
  consumeItemForHero: (heroId: string, item: Item) => void;
  transferItemBetweenHeroes: (
    fromHeroId: string,
    fromType: "backpack" | "equipment",
    fromKey: number | EquipSlot,
    toHeroId: string,
    toType: "backpack" | "equipment",
    toKey?: number | EquipSlot
  ) => void;
  quickSortHeroBackpack: (heroId: string) => void;
  unequipAllForHero: (heroId: string) => void;
  addCurrencies: (stones: number, souls: number) => void;
}

const INITIAL_HEROES = [
  "hero_protagonist",
  "hero_huang_zhong",
  "hero_xiahou_dun",
  "hero_zhao_yun",
  "hero_guo_jia",
];

function createDefaultHeroInventory(heroId: string): HeroInventoryData {
  if (heroId === "hero_huang_zhong") {
    return {
      equipment: {
        WEAPON: {
          id: "i_huangzhong_bow",
          name: "落日仙弓",
          type: "WEAPON",
          quality: "仙",
          icon: "🏹",
          description: "黃忠修仙神弓，伏擊爆傷 +50%。",
          stats: { atk: 48, speed: 4 },
        },
        ARMOR: null,
        ACCESSORY: null,
        ART: null,
      },
      backpack: [
        {
          id: "i_hz_arrow_01",
          name: "穿雲神箭",
          type: "MATERIAL",
          quality: "帝",
          icon: "🎯",
          description: "特殊破甲仙箭。",
          stackCount: 12,
        },
        {
          id: "i_potion_hz",
          name: "九轉還魂丹",
          type: "POTION",
          quality: "帝",
          icon: "🧪",
          description: "生命值恢復 +100。",
          stackCount: 3,
        },
        null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
      ],
    };
  }

  return {
    equipment: {
      WEAPON: {
        id: `i_weapon_${heroId}`,
        name: "青鋒佩劍",
        type: "WEAPON",
        quality: "靈",
        icon: "⚔️",
        description: "靈宵山基礎修仙飛劍。",
        stats: { atk: 18 },
      },
      ARMOR: {
        id: `i_armor_${heroId}`,
        name: "紫霄雲道袍",
        type: "ARMOR",
        quality: "靈",
        icon: "🥋",
        description: "靈氣防禦道袍。",
        stats: { def: 12, hp: 30 },
      },
      ACCESSORY: null,
      ART: null,
    },
    backpack: [
      {
        id: "i_sword_02",
        name: "斬魔巨劍",
        type: "WEAPON",
        quality: "王",
        icon: "🗡️",
        description: "重型斬魔飛劍，大幅提升攻擊力。",
        stats: { atk: 35 },
      },
      {
        id: "i_potion_01",
        name: "紫霄修仙丹",
        type: "POTION",
        quality: "靈",
        icon: "🧪",
        description: "恢復全隊 50 點生命值。",
        stackCount: 5,
      },
      {
        id: "i_ring_01",
        name: "聚靈仙戒",
        type: "ACCESSORY",
        quality: "帝",
        icon: "💍",
        description: "凝聚仙氣，提升移動力與速度。",
        stats: { speed: 6, moveRange: 1 },
      },
      {
        id: "i_art_01",
        name: "九天引雷訣",
        type: "ART",
        quality: "仙",
        icon: "⚡",
        description: "無上修仙功法，引九天雷霆突襲敵首。",
        stats: { atk: 40, hp: 50 },
      },
      null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
    ],
  };
}

const initialInventories: Record<string, HeroInventoryData> = {};
INITIAL_HEROES.forEach((hid) => {
  initialInventories[hid] = createDefaultHeroInventory(hid);
});

export const useInventoryStore = create<InventoryState>((set, get) => ({
  spiritStones: 1280,
  heroSouls: 48,
  isOpenB: false,
  isOpenTab: false,
  activeHeroId: "hero_protagonist",
  heroInventories: initialInventories,

  toggleB: (heroId) =>
    set((state) => ({
      isOpenB: !state.isOpenB,
      isOpenTab: false,
      activeHeroId: heroId || state.activeHeroId,
    })),

  toggleTab: () => set((state) => ({ isOpenTab: !state.isOpenTab, isOpenB: false })),
  closeAll: () => set({ isOpenB: false, isOpenTab: false }),
  setActiveHeroId: (activeHeroId) => set({ activeHeroId }),

  equipItemForHero: (heroId, item, fromBackpackIdx) => {
    if (!["WEAPON", "ARMOR", "ACCESSORY", "ART"].includes(item.type)) return;
    const slot = item.type as EquipSlot;
    const invs = { ...get().heroInventories };
    const hInv = invs[heroId] || createDefaultHeroInventory(heroId);

    const oldEquip = hInv.equipment[slot];
    const newBp = [...hInv.backpack];

    if (fromBackpackIdx !== undefined && fromBackpackIdx >= 0) {
      newBp[fromBackpackIdx] = oldEquip;
    } else {
      const idx = newBp.findIndex((i) => i?.id === item.id);
      if (idx !== -1) newBp[idx] = oldEquip;
      else if (oldEquip) {
        const emptyIdx = newBp.findIndex((s) => s === null);
        if (emptyIdx !== -1) newBp[emptyIdx] = oldEquip;
      }
    }

    hInv.equipment[slot] = item;
    hInv.backpack = newBp;
    invs[heroId] = hInv;
    set({ heroInventories: invs });
  },

  unequipSlotForHero: (heroId, slot) => {
    const invs = { ...get().heroInventories };
    const hInv = invs[heroId];
    if (!hInv) return;

    const currentEquip = hInv.equipment[slot];
    if (!currentEquip) return;

    const emptyIdx = hInv.backpack.findIndex((s) => s === null);
    if (emptyIdx !== -1) {
      hInv.backpack[emptyIdx] = currentEquip;
      hInv.equipment[slot] = null;
      invs[heroId] = hInv;
      set({ heroInventories: invs });
    }
  },

  consumeItemForHero: (heroId, item) => {
    const invs = { ...get().heroInventories };
    const hInv = invs[heroId];
    if (!hInv) return;

    const idx = hInv.backpack.findIndex((i) => i?.id === item.id);
    if (idx !== -1) {
      const target = hInv.backpack[idx]!;
      if (target.stackCount && target.stackCount > 1) {
        hInv.backpack[idx] = { ...target, stackCount: target.stackCount - 1 };
      } else {
        hInv.backpack[idx] = null;
      }
      invs[heroId] = hInv;
      set({ heroInventories: invs });
    }
  },

  transferItemBetweenHeroes: (fromHeroId, fromType, fromKey, toHeroId, toType, toKey) => {
    const invs = { ...get().heroInventories };
    const fromInv = invs[fromHeroId];
    const toInv = invs[toHeroId];
    if (!fromInv || !toInv) return;

    let sourceItem: Item | null = null;
    if (fromType === "backpack") {
      sourceItem = fromInv.backpack[fromKey as number];
      fromInv.backpack[fromKey as number] = null;
    } else {
      sourceItem = fromInv.equipment[fromKey as EquipSlot];
      fromInv.equipment[fromKey as EquipSlot] = null;
    }

    if (!sourceItem) return;

    if (toType === "backpack") {
      const targetIdx =
        typeof toKey === "number" ? toKey : toInv.backpack.findIndex((s) => s === null);
      if (targetIdx !== -1) {
        const existingTarget = toInv.backpack[targetIdx];
        toInv.backpack[targetIdx] = sourceItem;
        if (existingTarget && fromType === "backpack") {
          fromInv.backpack[fromKey as number] = existingTarget;
        }
      } else {
        fromInv.backpack.push(sourceItem);
      }
    } else if (toType === "equipment" && toKey) {
      const equipSlot = toKey as EquipSlot;
      if (sourceItem.type === equipSlot) {
        const existingEquip = toInv.equipment[equipSlot];
        toInv.equipment[equipSlot] = sourceItem;
        if (existingEquip && fromType === "backpack") {
          fromInv.backpack[fromKey as number] = existingEquip;
        }
      } else {
        const emptyIdx = toInv.backpack.findIndex((s) => s === null);
        if (emptyIdx !== -1) toInv.backpack[emptyIdx] = sourceItem;
      }
    }

    invs[fromHeroId] = fromInv;
    invs[toHeroId] = toInv;
    set({ heroInventories: invs });
  },

  quickSortHeroBackpack: (heroId) => {
    const invs = { ...get().heroInventories };
    const hInv = invs[heroId];
    if (!hInv) return;

    const qualityRank: Record<ItemQuality, number> = { 仙: 5, 帝: 4, 王: 3, 靈: 2, 凡: 1 };
    const validItems = hInv.backpack.filter((i): i is Item => i !== null);
    validItems.sort((a, b) => qualityRank[b.quality] - qualityRank[a.quality]);

    const items: (Item | null)[] = [...validItems];
    while (items.length < 20) {
      items.push(null);
    }
    hInv.backpack = items;
    invs[heroId] = hInv;
    set({ heroInventories: invs });
  },

  unequipAllForHero: (heroId) => {
    const invs = { ...get().heroInventories };
    const hInv = invs[heroId];
    if (!hInv) return;

    (Object.keys(hInv.equipment) as EquipSlot[]).forEach((slot) => {
      const item = hInv.equipment[slot];
      if (item) {
        const emptyIdx = hInv.backpack.findIndex((s) => s === null);
        if (emptyIdx !== -1) {
          hInv.backpack[emptyIdx] = item;
          hInv.equipment[slot] = null;
        }
      }
    });
    invs[heroId] = hInv;
    set({ heroInventories: invs });
  },

  addCurrencies: (stones, souls) =>
    set((state) => ({
      spiritStones: state.spiritStones + stones,
      heroSouls: state.heroSouls + souls,
    })),
}));
