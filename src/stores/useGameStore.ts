import { create } from "zustand";

export type StoryStep = "INTRO" | "SUMMON" | "BATTLE" | "COMPLETED";

interface GameState {
  storyStep: StoryStep;
  selectedHeroId: string | null;
  playerName: string;
  spiritStones: number;
  saveId: string | null;
  setStoryStep: (step: StoryStep) => void;
  setSelectedHeroId: (heroId: string) => void;
  setSaveId: (id: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  storyStep: "INTRO",
  selectedHeroId: null,
  playerName: "靈宵天尊",
  spiritStones: 100,
  saveId: null,
  setStoryStep: (step) => set({ storyStep: step }),
  setSelectedHeroId: (heroId) => set({ selectedHeroId: heroId }),
  setSaveId: (id) => set({ saveId: id }),
  resetGame: () =>
    set({
      storyStep: "INTRO",
      selectedHeroId: null,
      saveId: null,
    }),
}));
