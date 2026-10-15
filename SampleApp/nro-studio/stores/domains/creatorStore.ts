// Character Creator domain store — the EON creator (first REAL 3D domain,
// template3d's first copy). Regions manifest + palette are SEMANTIC data
// (dimensional bridge law): same regions.body.json the Blender side uses.
// The three.js viewport reads via getState() in its render loop (zero
// re-renders per frame); drawer pages + footer keycaps self-connect here.
import { create } from 'zustand';

export type CreatorGender = 'female' | 'male';

export interface RegionDef {
  id: number;
  name: string;
  /** Raw ID-map key color (linear 0-1 RGB, matches the baked idmap pixels). */
  key: [number, number, number];
  /** Default display color (sRGB 0-1 RGB from the legend). */
  display: [number, number, number];
  faces: number;
}

export const rgbToHex = (rgb: [number, number, number]) =>
  '#' +
  rgb
    .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0'))
    .join('');

interface CreatorState {
  gender: CreatorGender;
  /** From /assets/entities/humanoids/regions.body.json (fetched once). */
  regions: RegionDef[];
  maskRadius: number;
  /** Current palette: region name -> hex. Seeded from each region's display color. */
  colors: Record<string, string>;
  activeRegion: string | null;
  turntable: boolean;
  outline: boolean;
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  statusText: string;
  /** Registered by the mounted viewport (frame capture); null when unmounted. */
  exporter: (() => Promise<Blob | null>) | null;
  setGender: (g: CreatorGender) => void;
  loadManifest: () => Promise<void>;
  setRegionColor: (name: string, hex: string) => void;
  resetPalette: () => void;
  setActiveRegion: (name: string | null) => void;
  toggleTurntable: () => void;
  toggleOutline: () => void;
  setLoadState: (s: CreatorState['loadState'], text?: string) => void;
  setExporter: (fn: (() => Promise<Blob | null>) | null) => void;
}

export const useCreatorStore = create<CreatorState>((set, get) => ({
  gender: 'female',
  regions: [],
  maskRadius: 0.2,
  colors: {},
  activeRegion: null,
  turntable: true,
  outline: true,
  loadState: 'idle',
  statusText: '',
  exporter: null,

  setGender: (g) => set({ gender: g }),

  loadManifest: async () => {
    if (get().regions.length > 0) return;
    try {
      set({ loadState: 'loading', statusText: 'loading region manifest…' });
      const res = await fetch('/assets/entities/humanoids/regions.body.json');
      const manifest = await res.json();
      const regions: RegionDef[] = manifest.regions;
      set({
        regions,
        maskRadius: manifest.mask_radius ?? 0.2,
        colors: Object.fromEntries(regions.map((r) => [r.name, rgbToHex(r.display)])),
      });
    } catch {
      set({ loadState: 'error', statusText: 'failed to load regions manifest' });
    }
  },

  setRegionColor: (name, hex) => set((s) => ({ colors: { ...s.colors, [name]: hex } })),
  resetPalette: () =>
    set((s) => ({
      colors: Object.fromEntries(s.regions.map((r) => [r.name, rgbToHex(r.display)])),
    })),
  setActiveRegion: (name) => set({ activeRegion: name }),
  toggleTurntable: () => set((s) => ({ turntable: !s.turntable })),
  toggleOutline: () => set((s) => ({ outline: !s.outline })),
  setLoadState: (loadState, statusText) =>
    set((s) => ({ loadState, statusText: statusText ?? s.statusText })),
  setExporter: (fn) => set({ exporter: fn }),
}));
