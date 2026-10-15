// template3d domain store — the 3D TECH SAMPLE's single source of truth.
// Footer keycaps, the Regions drawer page, the left-bottom OUTLINER, and the
// three.js viewport all self-connect here (zero-prop law). The render loop
// reads via getState() — no React re-render per frame. Copy + rename.
import { create } from 'zustand';

export type SceneObjectId = 'torus' | 'grid' | 'sun';

type Template3dState = {
  turntable: boolean;
  wireframe: boolean;
  color: string;
  /** Outliner-driven visibility per scene object. */
  objects: Record<SceneObjectId, boolean>;
  activeObject: SceneObjectId | null;
  toggleTurntable: () => void;
  toggleWireframe: () => void;
  setColor: (hex: string) => void;
  toggleObject: (id: SceneObjectId) => void;
  setActiveObject: (id: SceneObjectId | null) => void;
  reset: () => void;
};

const DEFAULTS = {
  turntable: true,
  wireframe: false,
  color: '#f97316',
  objects: { torus: true, grid: true, sun: true } as Record<SceneObjectId, boolean>,
  activeObject: null as SceneObjectId | null,
};

export const useTemplate3dStore = create<Template3dState>((set) => ({
  ...DEFAULTS,
  toggleTurntable: () => set((s) => ({ turntable: !s.turntable })),
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
  setColor: (hex) => set({ color: hex }),
  toggleObject: (id) =>
    set((s) => ({ objects: { ...s.objects, [id]: !s.objects[id] } })),
  setActiveObject: (id) => set({ activeObject: id }),
  reset: () => set({ ...DEFAULTS, objects: { ...DEFAULTS.objects } }),
}));
