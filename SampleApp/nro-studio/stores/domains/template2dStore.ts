// template2d domain store — the 2D TECH SAMPLE's single source of truth.
// Footer keycaps, right-drawer pages (incl. the DrawerLayerList demo), and the
// canvas workspace all self-connect here (zero-prop law) — that cross-chrome
// wiring IS the lesson. Copy + rename when cloning.
import { create } from 'zustand';

/** One painted rect, in canvas px. Snap ON = grid-aligned cell; OFF = 6px dot. */
export type PaintCell = { x: number; y: number; size: number; c: string; layerId: string };
export type PaintLayer = { id: string; name: string; visible: boolean };

type Template2dState = {
  gridVisible: boolean;
  snapEnabled: boolean;
  cellSize: number;
  color: string;
  strokes: PaintCell[];
  layers: PaintLayer[];
  activeLayerId: string;
  nextLayerNum: number;
  /** Object URL of a Vault image dropped/sent onto the canvas (session-only). */
  droppedImage: string | null;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setCellSize: (px: number) => void;
  setColor: (hex: string) => void;
  addStroke: (cell: Omit<PaintCell, 'layerId'>) => void;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setDroppedImage: (url: string | null) => void;
  clearCanvas: () => void;
  reset: () => void;
};

const DEFAULTS = {
  gridVisible: true,
  snapEnabled: true,
  cellSize: 16,
  color: '#059669',
};
const baseLayer = (): PaintLayer => ({ id: 'layer-1', name: 'Layer 1', visible: true });

export const useTemplate2dStore = create<Template2dState>((set) => ({
  ...DEFAULTS,
  strokes: [],
  layers: [baseLayer()],
  activeLayerId: 'layer-1',
  nextLayerNum: 2,
  droppedImage: null,
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setCellSize: (px) => set({ cellSize: px }),
  setColor: (hex) => set({ color: hex }),
  addStroke: (cell) =>
    set((s) => {
      const last = s.strokes[s.strokes.length - 1];
      if (last && last.x === cell.x && last.y === cell.y && last.c === cell.c) return s;
      return { strokes: [...s.strokes, { ...cell, layerId: s.activeLayerId }] };
    }),
  addLayer: () =>
    set((s) => {
      const layer: PaintLayer = {
        id: `layer-${s.nextLayerNum}`,
        name: `Layer ${s.nextLayerNum}`,
        visible: true,
      };
      return { layers: [...s.layers, layer], activeLayerId: layer.id, nextLayerNum: s.nextLayerNum + 1 };
    }),
  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return s;
      const layers = s.layers.filter((l) => l.id !== id);
      return {
        layers,
        strokes: s.strokes.filter((c) => c.layerId !== id),
        activeLayerId: s.activeLayerId === id ? layers[layers.length - 1].id : s.activeLayerId,
      };
    }),
  toggleLayerVisibility: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  setDroppedImage: (url) => set({ droppedImage: url }),
  clearCanvas: () => set({ strokes: [], droppedImage: null }),
  reset: () =>
    set({
      ...DEFAULTS,
      strokes: [],
      layers: [baseLayer()],
      activeLayerId: 'layer-1',
      nextLayerNum: 2,
      droppedImage: null,
    }),
}));
