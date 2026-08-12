import { create } from "zustand";
import { PolygonRegion, RegionType, Point2D } from "@/types/region";
import initialRegions from "@/game/config/level_1_polygons.json";

interface DevState {
  isDevMode: boolean;
  regions: PolygonRegion[];
  selectedRegionId: string | null;
  drawingType: RegionType;
  isDrawing: boolean;
  currentPoints: Point2D[];

  toggleDevMode: () => void;
  setDevMode: (active: boolean) => void;
  setRegions: (regions: PolygonRegion[]) => void;
  setSelectedRegionId: (id: string | null) => void;
  setDrawingType: (type: RegionType) => void;
  setIsDrawing: (drawing: boolean) => void;
  addPoint: (point: Point2D) => void;
  clearCurrentPoints: () => void;
  finishDrawingRegion: (name?: string) => void;
  updateRegionType: (id: string, type: RegionType) => void;
  updateRegionScaleWeight: (id: string, weight: number) => void;
  deleteRegion: (id: string) => void;
  duplicateRegion: (id: string) => void;
  saveRegionsToStorage: () => void;
  resetRegionsToDefault: () => void;
}

const LOCAL_STORAGE_KEY = "three_kingdoms_level_regions_v1";

export const useDevStore = create<DevState>((set, get) => ({
  isDevMode: false,
  regions: (typeof window !== "undefined" && localStorage.getItem(LOCAL_STORAGE_KEY))
    ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!)
    : (initialRegions as PolygonRegion[]),
  selectedRegionId: null,
  drawingType: "ROAD",
  isDrawing: false,
  currentPoints: [],

  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  setDevMode: (active) => set({ isDevMode: active }),
  setRegions: (regions) => set({ regions }),
  setSelectedRegionId: (id) => set({ selectedRegionId: id }),
  setDrawingType: (type) => set({ drawingType: type }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),

  addPoint: (point) => set((state) => ({ currentPoints: [...state.currentPoints, point] })),
  clearCurrentPoints: () => set({ currentPoints: [], isDrawing: false }),

  finishDrawingRegion: (name) => {
    const { currentPoints, drawingType, regions } = get();
    if (currentPoints.length < 3) return;

    const newRegion: PolygonRegion = {
      id: `reg_${Date.now()}`,
      name: name || `自訂區域_${regions.length + 1}`,
      type: drawingType,
      points: [...currentPoints],
      scaleWeight: 0.8,
    };

    const nextRegions = [...regions, newRegion];
    set({
      regions: nextRegions,
      currentPoints: [],
      isDrawing: false,
      selectedRegionId: newRegion.id,
    });
    get().saveRegionsToStorage();
  },

  updateRegionType: (id, type) => {
    const nextRegions = get().regions.map((r) => (r.id === id ? { ...r, type } : r));
    set({ regions: nextRegions });
    get().saveRegionsToStorage();
  },

  updateRegionScaleWeight: (id, scaleWeight) => {
    const nextRegions = get().regions.map((r) => (r.id === id ? { ...r, scaleWeight } : r));
    set({ regions: nextRegions });
    get().saveRegionsToStorage();
  },

  deleteRegion: (id) => {
    const nextRegions = get().regions.filter((r) => r.id !== id);
    set({ regions: nextRegions, selectedRegionId: null });
    get().saveRegionsToStorage();
  },

  duplicateRegion: (id) => {
    const target = get().regions.find((r) => r.id === id);
    if (!target) return;
    const duplicated: PolygonRegion = {
      ...target,
      id: `reg_${Date.now()}`,
      name: `${target.name}_副本`,
      points: target.points.map((p) => ({ x: Math.min(0.98, p.x + 0.03), y: Math.min(0.98, p.y + 0.03) })),
    };
    const nextRegions = [...get().regions, duplicated];
    set({ regions: nextRegions, selectedRegionId: duplicated.id });
    get().saveRegionsToStorage();
  },

  saveRegionsToStorage: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(get().regions));
      // 同步發送 API JSON 備份
      fetch("/api/level/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(get().regions),
      }).catch(console.error);
    }
  },

  resetRegionsToDefault: () => {
    set({ regions: initialRegions as PolygonRegion[], selectedRegionId: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  },
}));
