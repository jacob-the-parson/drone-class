// Flow domain store — battle-tested logic, kept near-verbatim. Source image → cell-aware
// resize onto the active layer → paint/erase/pick on a layered target canvas.
import { create } from 'zustand';

export interface FlowLayer {
  id: string;
  name: string;
  dataUrl: string | null;
  visible: boolean;
  opacity: number;
}

export type FlowResizeMode = 'stretch' | 'pad-crop' | 'fit-align';
export type FlowAlign = 'center' | 'bottom-center';
export type FlowTool = 'paint' | 'erase' | 'picker' | null;

interface FlowState {
  sourceImage: string | null;
  targetWidth: number;
  targetHeight: number;
  gridCols: number;
  gridRows: number;
  resizeMode: FlowResizeMode;
  align: FlowAlign;
  layers: FlowLayer[];
  activeLayerId: string;
  activeTool: FlowTool;
  currentColor: string;
  brushSize: number;
  setSourceImage: (url: string | null) => void;
  setTargetDimensions: (width: number, height: number) => void;
  setGridConfig: (cols: number, rows: number) => void;
  setResizeMode: (mode: FlowResizeMode) => void;
  setAlign: (align: FlowAlign) => void;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  updateLayerDataUrl: (id: string, dataUrl: string | null) => void;
  toggleLayerVisibility: (id: string) => void;
  clearCanvas: () => void;
  setActiveTool: (tool: FlowTool) => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (size: number) => void;
}

/** Ownership-aware object-URL hygiene (R1 review catch): only revoke URLs
 *  flow created — Vault-sent blob: urls belong to the Vault. */
const ownedUrls = new Set<string>();
export const registerFlowUrl = (url: string) => {
  ownedUrls.add(url);
  return url;
};
const revokeIfOwned = (url: string | null | undefined) => {
  if (url && ownedUrls.has(url)) {
    URL.revokeObjectURL(url);
    ownedUrls.delete(url);
  }
};

export const useFlowStore = create<FlowState>((set) => ({
  sourceImage: null,
  // 576 = 12×48 — the RMMZ/NDT band default
  targetWidth: 576,
  targetHeight: 576,
  gridCols: 12,
  gridRows: 12,
  resizeMode: 'stretch',
  align: 'center',
  layers: [{ id: 'layer-1', name: 'Layer 1', dataUrl: null, visible: true, opacity: 1 }],
  activeLayerId: 'layer-1',
  activeTool: 'paint',
  currentColor: '#000000',
  brushSize: 4,

  setSourceImage: (url) =>
    set((s) => {
      if (s.sourceImage !== url) revokeIfOwned(s.sourceImage);
      return { sourceImage: url };
    }),
  setTargetDimensions: (width, height) => set({ targetWidth: width, targetHeight: height }),
  setGridConfig: (cols, rows) => set({ gridCols: Math.max(1, cols), gridRows: Math.max(1, rows) }),
  setResizeMode: (mode) => set({ resizeMode: mode }),
  setAlign: (align) => set({ align }),

  addLayer: () =>
    set((s) => {
      const newId = `layer-${Date.now()}`;
      return {
        layers: [{ id: newId, name: `Layer ${s.layers.length + 1}`, dataUrl: null, visible: true, opacity: 1 }, ...s.layers],
        activeLayerId: newId,
      };
    }),
  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return s;
      const layers = s.layers.filter((l) => l.id !== id);
      return { layers, activeLayerId: s.activeLayerId === id ? layers[0].id : s.activeLayerId };
    }),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  updateLayerDataUrl: (id, dataUrl) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, dataUrl } : l)) })),
  toggleLayerVisibility: (id) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) })),
  clearCanvas: () => {
    const newId = `layer-${Date.now()}`;
    set({ layers: [{ id: newId, name: 'Layer 1', dataUrl: null, visible: true, opacity: 1 }], activeLayerId: newId });
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),
}));
