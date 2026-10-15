// Stitcher domain store — battle-tested logic, kept near-verbatim. Source sheets → marquee
// selections → drag onto the target grid as layered PLACEMENTS (crop refs,
// never copied pixels) → composite export.
import { create } from 'zustand';

export interface StitcherSourceImage {
  id: string;
  url: string;
}

export interface StitcherPlacement {
  id: string;
  sourceId: string;
  sourceCol: number;
  sourceRow: number;
  targetCol: number;
  targetRow: number;
  width: number;
  height: number;
  layerId: string;
  offsetX?: number;
  offsetY?: number;
}

export interface StitcherSelection {
  col: number;
  row: number;
  width: number;
  height: number;
}

export interface StitcherLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

export interface DimensionPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
  isVisible: boolean;
}

interface StitcherState {
  cellWidth: number;
  cellHeight: number;
  targetCols: number;
  targetRows: number;
  cellPresets: DimensionPreset[];
  gridPresets: DimensionPreset[];
  sourceImages: StitcherSourceImage[];
  activeSourceId: string | null;
  sourceSelection: StitcherSelection | null;
  draggedSelection: (StitcherSelection & { sourceId: string }) | null;
  layers: StitcherLayer[];
  activeLayerId: string;
  placements: StitcherPlacement[];
  activePlacementId: string | null;
  setCellSize: (w: number, h: number) => void;
  setTargetGrid: (c: number, r: number) => void;
  toggleCellPresetVisibility: (id: string) => void;
  toggleGridPresetVisibility: (id: string) => void;
  addCellPreset: (preset: Omit<DimensionPreset, 'id'>) => void;
  addGridPreset: (preset: Omit<DimensionPreset, 'id'>) => void;
  deleteCellPreset: (id: string) => void;
  deleteGridPreset: (id: string) => void;
  addSourceImage: (url: string) => void;
  removeSourceImage: (id: string) => void;
  setActiveSourceId: (id: string | null) => void;
  setSourceSelection: (sel: StitcherSelection | null) => void;
  setDraggedSelection: (sel: (StitcherSelection & { sourceId: string }) | null) => void;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  addPlacement: (placement: Omit<StitcherPlacement, 'id'>) => void;
  removePlacement: (id: string) => void;
  clearPlacements: () => void;
  setActivePlacementId: (id: string | null) => void;
  updatePlacementOffset: (id: string, dx: number, dy: number) => void;
  /** Reposition a placed object (the drag-to-move upgrade). */
  movePlacement: (id: string, targetCol: number, targetRow: number, offsetX: number, offsetY: number) => void;
}

const uid = () => crypto.randomUUID().slice(0, 8);

/** Ownership-aware object-URL hygiene (R1 review catch): only revoke URLs
 *  stitcher created — Vault-sent blob: urls belong to the Vault. */
const ownedUrls = new Set<string>();
export const registerStitcherUrl = (url: string) => {
  ownedUrls.add(url);
  return url;
};
const revokeIfOwned = (url: string | null | undefined) => {
  if (url && ownedUrls.has(url)) {
    URL.revokeObjectURL(url);
    ownedUrls.delete(url);
  }
};

export const useStitcherStore = create<StitcherState>((set) => ({
  // 48 = the RMMZ/NDT band (pipeline law; old default was 64 — decision D3)
  cellWidth: 48,
  cellHeight: 48,
  targetCols: 12,
  targetRows: 8,

  cellPresets: [
    { id: 'c1', name: '16 x 16', width: 16, height: 16, category: 'Square', isVisible: true },
    { id: 'c2', name: '32 x 32', width: 32, height: 32, category: 'Square', isVisible: true },
    { id: 'c3', name: '48 x 48', width: 48, height: 48, category: 'Square', isVisible: true },
    { id: 'c4', name: '64 x 64', width: 64, height: 64, category: 'Square', isVisible: true },
    { id: 'c5', name: '100 x 100', width: 100, height: 100, category: 'Square', isVisible: true },
    { id: 'c6', name: '48 x 72', width: 48, height: 72, category: 'Vertical', isVisible: true },
    { id: 'c7', name: '72 x 48', width: 72, height: 48, category: 'Horizontal', isVisible: true },
  ],
  gridPresets: [
    { id: 'g1', name: 'RPG Character (3x4)', width: 3, height: 4, category: 'Standard', isVisible: true },
    { id: 'g2', name: 'Object Prop (4x4)', width: 4, height: 4, category: 'Standard', isVisible: true },
    { id: 'g3', name: 'Basic Sheet (12x8)', width: 12, height: 8, category: 'Sheets', isVisible: true },
    { id: 'g4', name: 'Large Tileset (16x16)', width: 16, height: 16, category: 'Sheets', isVisible: true },
  ],

  sourceImages: [],
  activeSourceId: null,
  sourceSelection: null,
  draggedSelection: null,

  layers: [{ id: 'layer-1', name: 'Background', visible: true, opacity: 1 }],
  activeLayerId: 'layer-1',
  placements: [],
  activePlacementId: null,

  setCellSize: (w, h) => set({ cellWidth: Math.max(1, w), cellHeight: Math.max(1, h) }),
  setTargetGrid: (c, r) => set({ targetCols: Math.max(1, c), targetRows: Math.max(1, r) }),

  toggleCellPresetVisibility: (id) =>
    set((s) => ({ cellPresets: s.cellPresets.map((p) => (p.id === id ? { ...p, isVisible: !p.isVisible } : p)) })),
  toggleGridPresetVisibility: (id) =>
    set((s) => ({ gridPresets: s.gridPresets.map((p) => (p.id === id ? { ...p, isVisible: !p.isVisible } : p)) })),
  addCellPreset: (preset) => set((s) => ({ cellPresets: [...s.cellPresets, { ...preset, id: uid() }] })),
  addGridPreset: (preset) => set((s) => ({ gridPresets: [...s.gridPresets, { ...preset, id: uid() }] })),
  deleteCellPreset: (id) => set((s) => ({ cellPresets: s.cellPresets.filter((p) => p.id !== id) })),
  deleteGridPreset: (id) => set((s) => ({ gridPresets: s.gridPresets.filter((p) => p.id !== id) })),

  addSourceImage: (url) =>
    set((s) => {
      const newImg = { id: uid(), url };
      return { sourceImages: [...s.sourceImages, newImg], activeSourceId: s.activeSourceId || newImg.id };
    }),
  removeSourceImage: (id) =>
    set((s) => {
      const img = s.sourceImages.find((i) => i.id === id);
      revokeIfOwned(img?.url);
      return {
        sourceImages: s.sourceImages.filter((i) => i.id !== id),
        activeSourceId: s.activeSourceId === id ? s.sourceImages.find((i) => i.id !== id)?.id || null : s.activeSourceId,
        placements: s.placements.filter((p) => p.sourceId !== id),
      };
    }),
  setActiveSourceId: (id) => set({ activeSourceId: id, sourceSelection: null }),
  setSourceSelection: (sel) => set({ sourceSelection: sel }),
  setDraggedSelection: (sel) => set({ draggedSelection: sel }),

  addLayer: () =>
    set((s) => {
      const newId = `layer-${Date.now()}`;
      return {
        layers: [{ id: newId, name: `Layer ${s.layers.length + 1}`, visible: true, opacity: 1 }, ...s.layers],
        activeLayerId: newId,
      };
    }),
  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return s;
      const layers = s.layers.filter((l) => l.id !== id);
      return {
        layers,
        activeLayerId: s.activeLayerId === id ? layers[0].id : s.activeLayerId,
        placements: s.placements.filter((p) => p.layerId !== id),
      };
    }),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  toggleLayerVisibility: (id) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) })),

  addPlacement: (p) => set((s) => ({ placements: [...s.placements, { ...p, id: uid() }] })),
  removePlacement: (id) =>
    set((s) => ({
      placements: s.placements.filter((p) => p.id !== id),
      activePlacementId: s.activePlacementId === id ? null : s.activePlacementId,
    })),
  clearPlacements: () => set({ placements: [], activePlacementId: null }),
  setActivePlacementId: (id) => set({ activePlacementId: id }),
  updatePlacementOffset: (id, dx, dy) =>
    set((s) => ({
      placements: s.placements.map((p) =>
        p.id === id ? { ...p, offsetX: (p.offsetX || 0) + dx, offsetY: (p.offsetY || 0) + dy } : p,
      ),
    })),
  movePlacement: (id, targetCol, targetRow, offsetX, offsetY) =>
    set((s) => ({
      placements: s.placements.map((p) =>
        p.id === id ? { ...p, targetCol, targetRow, offsetX, offsetY } : p,
      ),
    })),
}));
