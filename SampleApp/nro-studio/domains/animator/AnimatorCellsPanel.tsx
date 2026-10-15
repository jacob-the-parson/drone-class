// AnimatorCellsPanel — drawerLeftBottom: the two dimension cards on the
// CardSettings primitive (animator's dimension cards helped inspire it).
// Cell Size card is toggleable (48px default when off);
// Grid card presets = the RMMZ sheet formats.
'use client';
import { LayoutGrid, Ruler } from 'lucide-react';
import { useAnimatorStore, type AnimatorDimensionPreset } from '@/stores/domains/animatorStore';
import { CardSettings } from '@/components/ui/CardSettings';

const inputCls =
  'w-full rounded border border-edge bg-surface p-1.5 text-center text-sm text-ink outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50';

const presetsFor = (list: AnimatorDimensionPreset[], apply: (w: number, h: number) => void) =>
  list.filter((p) => p.isVisible).map((p) => ({ id: p.id, label: p.name, hint: p.category, onApply: () => apply(p.width, p.height) }));

export function AnimatorCellsPanel() {
  const {
    useCustomCellSize,
    toggleCustomCellSize,
    cellWidth,
    cellHeight,
    setCellSize,
    gridCols,
    gridRows,
    setGridSize,
    cellPresets,
    gridPresets,
  } = useAnimatorStore();

  // preset click = intent: auto-enable custom size so the preview honors it
  const applyCellPreset = (w: number, h: number) => {
    if (!useCustomCellSize) toggleCustomCellSize();
    setCellSize(w, h);
  };

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-edge p-3">
      <CardSettings title="Cell Size" icon={Ruler} presets={presetsFor(cellPresets, applyCellPreset)}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Custom size</span>
          <button
            onClick={toggleCustomCellSize}
            className={`relative h-4 w-7 rounded-full shadow-inner transition-colors ${
              useCustomCellSize ? 'bg-amber-500' : 'border border-edge bg-control'
            }`}
            title={useCustomCellSize ? 'Using custom cell size' : 'Default 48px (RMMZ band)'}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full shadow-sm transition-transform ${
                useCustomCellSize ? 'translate-x-3.5 bg-white' : 'translate-x-0.5 bg-ink-muted'
              }`}
            />
          </button>
        </div>
        <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-1 ${useCustomCellSize ? '' : 'pointer-events-none opacity-50'}`}>
          <input type="number" value={cellWidth} min={1} onChange={(e) => setCellSize(parseInt(e.target.value) || 1, cellHeight)} className={inputCls} />
          <span className="px-1 text-xs text-ink-muted">×</span>
          <input type="number" value={cellHeight} min={1} onChange={(e) => setCellSize(cellWidth, parseInt(e.target.value) || 1)} className={inputCls} />
        </div>
      </CardSettings>

      <CardSettings title="Sheet Grid" icon={LayoutGrid} presets={presetsFor(gridPresets, setGridSize)}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <input type="number" value={gridCols} min={1} onChange={(e) => setGridSize(parseInt(e.target.value) || 1, gridRows)} className={inputCls} />
          <span className="px-1 text-xs text-ink-muted">×</span>
          <input type="number" value={gridRows} min={1} onChange={(e) => setGridSize(gridCols, parseInt(e.target.value) || 1)} className={inputCls} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] text-center">
          <span className="text-[9px] uppercase tracking-widest text-ink-muted">Cols</span>
          <span />
          <span className="text-[9px] uppercase tracking-widest text-ink-muted">Rows</span>
        </div>
      </CardSettings>
    </div>
  );
}
