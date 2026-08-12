import { create } from "zustand";
import { BattleUnit, BattlePhase, CombatLogMessage, BattleReward, TacticalActionType } from "@/types/game";

interface BattleState {
  phase: BattlePhase;
  units: BattleUnit[];
  selectedUnitId: string | null;
  activeAction: TacticalActionType;
  currentTurn: number;
  combatLogs: CombatLogMessage[];
  reward: BattleReward | null;
  tacticalOutcome: "AMBUSH" | "GUARD" | "STANDARD" | null;

  setPhase: (phase: BattlePhase) => void;
  setUnits: (units: BattleUnit[]) => void;
  updateUnitPosition: (instanceId: string, x: number, y: number) => void;
  setSelectedUnitId: (id: string | null) => void;
  setActiveAction: (action: TacticalActionType) => void;
  addCombatLog: (text: string, type?: CombatLogMessage["type"]) => void;
  setReward: (reward: BattleReward | null) => void;
  setTacticalOutcome: (outcome: "AMBUSH" | "GUARD" | "STANDARD") => void;
  resetBattle: () => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  phase: "DEPLOYMENT",
  units: [],
  selectedUnitId: null,
  activeAction: "SELECT",
  currentTurn: 1,
  combatLogs: [],
  reward: null,
  tacticalOutcome: null,

  setPhase: (phase) => set({ phase }),
  setUnits: (units) => set({ units }),

  updateUnitPosition: (instanceId, x, y) => {
    set((state) => ({
      units: state.units.map((u) => (u.instanceId === instanceId ? { ...u, x, y } : u)),
    }));
  },

  setSelectedUnitId: (id) => set({ selectedUnitId: id }),
  setActiveAction: (action) => set({ activeAction: action }),

  addCombatLog: (text, type = "info") => {
    const newLog: CombatLogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      turn: get().currentTurn,
      text,
      type,
      timestamp: new Date().toLocaleTimeString("zh-TW"),
    };
    set((state) => ({
      combatLogs: [newLog, ...state.combatLogs],
    }));
  },

  setReward: (reward) => set({ reward }),
  setTacticalOutcome: (outcome) => set({ tacticalOutcome: outcome }),

  resetBattle: () =>
    set({
      phase: "DEPLOYMENT",
      units: [],
      selectedUnitId: null,
      activeAction: "SELECT",
      currentTurn: 1,
      combatLogs: [],
      reward: null,
      tacticalOutcome: null,
    }),
}));
