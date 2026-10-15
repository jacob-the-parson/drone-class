// Slicer domain store — battle-tested logic, kept near-verbatim.
// Layered source images sliced by a grid; sparse per-cell overrides in `tiles`.
import { create } from 'zustand';
import type { GridConfig } from '@/lib/schemas';
import type { AIMetadata } from '@/stores/core/vaultStore';

export interface GridTemplate {
  id: string;
  name: string;
  config: Omit<GridConfig, 'autoSize'>;
}

// 48×48 MZ = the RMMZ/NDT texel band — the platform default (pipeline law)
export const DEFAULT_GRID_TEMPLATES: GridTemplate[] = [
  { id: 'rpg-mvtiles', name: 'RPG Maker MV/MZ Tiles', config: { tileWidth: 48, tileHeight: 48, columns: 16, rows: 16 } },
  { id: 'rpg-vxacetiles', name: 'RPG Maker VX Ace Tiles', config: { tileWidth: 32, tileHeight: 32, columns: 16, rows: 16 } },
  { id: 'rpg-icons-mz', name: 'RPG Maker MZ Icons', config: { tileWidth: 32, tileHeight: 32, columns: 16, rows: 20 } },
  { id: 'rpg-faces-mz', name: 'RPG Maker MZ Faces', config: { tileWidth: 144, tileHeight: 144, columns: 4, rows: 2 } },
];

export interface SlicerLayer {
  id: string;
  name: string;
  url: string | null;
  visible: boolean;
  opacity: number;
}

export interface TileData {
  url: string;
  name?: string;
  metadata?: AIMetadata;
  isErased?: boolean;
}

interface SlicerState {
  templates: GridTemplate[];
  layers: SlicerLayer[];
  activeLayerId: string;
  baseImage: string | null;
  baseImageDimensions: { width: number; height: number } | null;
  gridConfig: GridConfig;
  tiles: Record<number, TileData>;
  hoveredTile: number | null;
  selectedTile: number | null;
  addLayer: (layer: SlicerLayer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<SlicerLayer>) => void;
  setActiveLayerId: (id: string) => void;
  setBaseImage: (url: string | null) => void;
  loadAssetToActiveLayer: (url: string) => void;
  setGridConfig: (config: GridConfig) => void;
  setTile: (index: number, data: TileData) => void;
  removeTile: (index: number) => void;
  addRow: () => void;
  removeRow: () => void;
  addColumn: () => void;
  removeColumn: () => void;
  setHoveredTile: (index: number | null) => void;
  setSelectedTile: (index: number | null) => void;
  clearCanvas: () => void;
}

const BASE_LAYER: SlicerLayer = { id: 'base', name: 'Base Layer', url: null, visible: true, opacity: 1 };

/** autoSize fit: square tiles from width/columns (min 8), rows to cover height. */
function autoFit(config: GridConfig, dims: { width: number; height: number }): GridConfig {
  let tileWidth = Math.floor(dims.width / config.columns);
  if (tileWidth < 8) tileWidth = 8;
  const tileHeight = tileWidth;
  const exportWidth = config.columns * tileWidth;
  const scale = exportWidth / dims.width;
  const rows = Math.max(1, Math.ceil((dims.height * scale) / tileHeight));
  return { ...config, tileWidth, tileHeight, rows };
}

/** Object-URL hygiene, OWNERSHIP-AWARE: only revoke URLs slicer itself created
 *  (OS drops/uploads). Vault-sent urls are blob: too but belong to the VAULT —
 *  revoking those kills its thumbnails app-wide (R1 review catch). */
const ownedUrls = new Set<string>();
export const registerSlicerUrl = (url: string) => {
  ownedUrls.add(url);
  return url;
};
const revokeIfOwned = (url: string | null | undefined) => {
  if (url && ownedUrls.has(url)) {
    URL.revokeObjectURL(url);
    ownedUrls.delete(url);
  }
};

export const useSlicerStore = create<SlicerState>((set) => ({
  templates: DEFAULT_GRID_TEMPLATES,
  layers: [{ ...BASE_LAYER }],
  activeLayerId: 'base',
  baseImage: null,
  baseImageDimensions: null,
  gridConfig: { tileWidth: 32, tileHeight: 32, columns: 16, rows: 20, autoSize: false },
  tiles: {},
  hoveredTile: null,
  selectedTile: null,

  addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer] })),
  removeLayer: (id) =>
    set((s) => {
      const layer = s.layers.find((l) => l.id === id);
      revokeIfOwned(layer?.url);
      return { layers: s.layers.filter((l) => l.id !== id) };
    }),
  updateLayer: (id, updates) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),
  setActiveLayerId: (id) => set({ activeLayerId: id }),

  setBaseImage: (url) =>
    set((s) => {
      const newLayers = s.layers.map((l) => (l.id === s.activeLayerId ? { ...l, url } : l));
      const isBase = s.activeLayerId === 'base';
      return { layers: newLayers, ...(isBase ? { baseImage: url } : {}) };
    }),

  loadAssetToActiveLayer: (url) => {
    useSlicerStore.getState().setBaseImage(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const dims = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
      useSlicerStore.setState({ baseImageDimensions: dims });
      const config = useSlicerStore.getState().gridConfig;
      useSlicerStore.setState({
        gridConfig: config.autoSize
          ? autoFit(config, dims)
          : { ...config, rows: Math.max(1, Math.ceil((dims.height * ((config.columns * config.tileWidth) / dims.width)) / config.tileHeight)) },
      });
    };
    img.src = url;
  },

  setGridConfig: (config) =>
    set((s) => ({
      gridConfig: config.autoSize && s.baseImageDimensions ? autoFit(config, s.baseImageDimensions) : config,
    })),

  setTile: (index, data) =>
    set((s) => {
      revokeIfOwned(s.tiles[index]?.url !== data.url ? s.tiles[index]?.url : null);
      return { tiles: { ...s.tiles, [index]: data } };
    }),
  removeTile: (index) =>
    set((s) => {
      revokeIfOwned(s.tiles[index]?.url);
      const tiles = { ...s.tiles };
      delete tiles[index];
      return { tiles };
    }),

  addRow: () => set((s) => ({ gridConfig: { ...s.gridConfig, rows: s.gridConfig.rows + 1, autoSize: false } })),
  removeRow: () => set((s) => ({ gridConfig: { ...s.gridConfig, rows: Math.max(1, s.gridConfig.rows - 1), autoSize: false } })),
  addColumn: () =>
    set((s) => {
      const config = { ...s.gridConfig, columns: s.gridConfig.columns + 1 };
      return { gridConfig: config.autoSize && s.baseImageDimensions ? autoFit(config, s.baseImageDimensions) : config };
    }),
  removeColumn: () =>
    set((s) => {
      const config = { ...s.gridConfig, columns: Math.max(1, s.gridConfig.columns - 1) };
      return { gridConfig: config.autoSize && s.baseImageDimensions ? autoFit(config, s.baseImageDimensions) : config };
    }),

  setHoveredTile: (index) => set({ hoveredTile: index }),
  setSelectedTile: (index) => set({ selectedTile: index }),

  clearCanvas: () =>
    set((s) => {
      Object.values(s.tiles).forEach((t) => revokeIfOwned(t.url));
      s.layers.forEach((l) => revokeIfOwned(l.url));
      return {
        tiles: {},
        baseImage: null,
        baseImageDimensions: null,
        layers: [{ ...BASE_LAYER }],
        activeLayerId: 'base',
        selectedTile: null,
      };
    }),
}));
