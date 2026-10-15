// Canvais domain store — freeform
// Konva stage items (position/scale/rotation refs to object URLs). The
// workspace registers an exporter so footer keycaps can capture the stage.
import { create } from 'zustand';

export interface CanvasItem {
  id: string;
  url: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

interface CanvaisState {
  items: CanvasItem[];
  selectedId: string | null;
  /** Registered by the mounted workspace (Konva stage capture); null when unmounted. */
  exporter: (() => Promise<Blob | null>) | null;
  setItems: (items: CanvasItem[] | ((prev: CanvasItem[]) => CanvasItem[])) => void;
  setSelectedId: (id: string | null) => void;
  deleteSelected: () => void;
  /** Add an item; no coords = cascade placement so stacks stay visible. */
  addItem: (url: string, x?: number, y?: number) => void;
  clearAll: () => void;
  setExporter: (fn: (() => Promise<Blob | null>) | null) => void;
}

export const useCanvaisStore = create<CanvaisState>((set) => ({
  items: [],
  selectedId: null,
  exporter: null,
  setItems: (itemsOrUpdater) =>
    set((s) => ({ items: typeof itemsOrUpdater === 'function' ? itemsOrUpdater(s.items) : itemsOrUpdater })),
  setSelectedId: (id) => set({ selectedId: id }),
  deleteSelected: () =>
    set((s) => ({ items: s.items.filter((item) => item.id !== s.selectedId), selectedId: null })),
  addItem: (url, x, y) =>
    set((s) => ({
      items: [
        ...s.items,
        {
          id: crypto.randomUUID().slice(0, 8),
          url,
          x: x ?? 80 + (s.items.length % 8) * 32,
          y: y ?? 80 + (s.items.length % 8) * 32,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
      ],
    })),
  clearAll: () => set({ items: [], selectedId: null }),
  setExporter: (fn) => set({ exporter: fn }),
}));
