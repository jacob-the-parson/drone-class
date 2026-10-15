// Animator domain store — the dimensional half; sequence/playback
// state arrives with the real animation era. 48px default = RMMZ/NDT band;
// grid presets are the classic RMMZ sheet formats. Grid/Index view toggles
// are LIVE (they drive the canvas from the footer).
import { create } from 'zustand';

export interface AnimatorDimensionPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
  isVisible: boolean;
}

interface AnimatorState {
  useCustomCellSize: boolean;
  cellWidth: number;
  cellHeight: number;
  gridCols: number;
  gridRows: number;
  showGrid: boolean;
  showIndexes: boolean;
  cellPresets: AnimatorDimensionPreset[];
  gridPresets: AnimatorDimensionPreset[];
  toggleCustomCellSize: () => void;
  setCellSize: (width: number, height: number) => void;
  setGridSize: (cols: number, rows: number) => void;
  toggleGrid: () => void;
  toggleIndexes: () => void;
}

const positiveInt = (value: number) => Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));

export const useAnimatorStore = create<AnimatorState>((set) => ({
  useCustomCellSize: false,
  cellWidth: 48,
  cellHeight: 48,
  gridCols: 8,
  gridRows: 4,
  showGrid: true,
  showIndexes: false,
  cellPresets: [
    { id: 'anim-cell-16', name: '16 x 16', width: 16, height: 16, category: 'Square', isVisible: true },
    { id: 'anim-cell-32', name: '32 x 32', width: 32, height: 32, category: 'Square', isVisible: true },
    { id: 'anim-cell-48', name: '48 x 48', width: 48, height: 48, category: 'Square', isVisible: true },
    { id: 'anim-cell-64', name: '64 x 64', width: 64, height: 64, category: 'Square', isVisible: true },
    { id: 'anim-cell-48-72', name: '48 x 72', width: 48, height: 72, category: 'Vertical', isVisible: true },
    { id: 'anim-cell-72-48', name: '72 x 48', width: 72, height: 48, category: 'Horizontal', isVisible: true },
  ],
  gridPresets: [
    { id: 'anim-grid-3-4', name: 'RPG Character (3x4)', width: 3, height: 4, category: 'Standard', isVisible: true },
    { id: 'anim-grid-8-4', name: 'Directional Rowset (8x4)', width: 8, height: 4, category: 'Standard', isVisible: true },
    { id: 'anim-grid-12-8', name: 'Basic Sheet (12x8)', width: 12, height: 8, category: 'Sheets', isVisible: true },
    { id: 'anim-grid-16-16', name: 'Large Sheet (16x16)', width: 16, height: 16, category: 'Sheets', isVisible: true },
  ],
  toggleCustomCellSize: () => set((s) => ({ useCustomCellSize: !s.useCustomCellSize })),
  setCellSize: (width, height) => set({ cellWidth: positiveInt(width), cellHeight: positiveInt(height) }),
  setGridSize: (cols, rows) => set({ gridCols: positiveInt(cols), gridRows: positiveInt(rows) }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleIndexes: () => set((s) => ({ showIndexes: !s.showIndexes })),
}));
