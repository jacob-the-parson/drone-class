// StitcherGridPage — right-drawer Tools page (the birthplace of the
// CardSettings pattern, now rendered BY CardSettings): Cell Size +
// Export Grid tri-part cards (inline inputs · preset popout · deep manager
// modal), layers via DrawerLayerList, placements list, stats.
'use client';
import { useState } from 'react';
import { Eye, EyeOff, LayoutGrid, Plus, Ruler, Trash2 } from 'lucide-react';
import { useStitcherStore, type DimensionPreset } from '@/stores/domains/stitcherStore';
import { CardSettings } from '@/components/ui/CardSettings';
import { DrawerSection, DrawerStat, DrawerListRow } from '@/components/ui/DrawerSection';
import { DrawerLayerList } from '@/components/ui/DrawerLayerList';

const inputCls =
  'w-full rounded border border-edge bg-surface p-2 text-center text-sm text-ink outline-none transition-colors focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50';

/** Deep-config body shared by both cards: visibility toggles + custom CRUD. */
function PresetManagerBody({ kind }: { kind: 'cell' | 'grid' }) {
  const store = useStitcherStore();
  const presets = kind === 'cell' ? store.cellPresets : store.gridPresets;
  const toggle = kind === 'cell' ? store.toggleCellPresetVisibility : store.toggleGridPresetVisibility;
  const del = kind === 'cell' ? store.deleteCellPreset : store.deleteGridPreset;
  const add = kind === 'cell' ? store.addCellPreset : store.addGridPreset;

  const [name, setName] = useState('My Custom Size');
  const [w, setW] = useState(kind === 'cell' ? 48 : 4);
  const [h, setH] = useState(kind === 'cell' ? 48 : 4);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {presets.map((p) => (
          <div key={p.id} className="group flex items-center justify-between rounded-md border border-transparent bg-surface-sunken/50 p-2 transition-colors hover:border-edge">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className="truncate">{p.name}</span>
                {!p.isVisible && (
                  <span className="rounded bg-control px-1.5 py-0.5 text-[10px] text-ink-muted">Hidden</span>
                )}
              </div>
              <span className="text-[10px] text-ink-muted">
                {p.width} × {p.height} · {p.category}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => toggle(p.id)} className="rounded p-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink" title={p.isVisible ? 'Hide from popout' : 'Show in popout'}>
                {p.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              {p.category === 'Custom' && (
                <button onClick={() => del(p.id)} className="rounded p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30" title="Delete preset">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border border-edge p-3">
        <h4 className="flex items-center gap-2 text-xs font-medium text-ink">
          <Plus size={14} /> Add custom preset
        </h4>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} text-left`} placeholder="Name" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={w} min={1} onChange={(e) => setW(parseInt(e.target.value) || 1)} className={inputCls} />
          <input type="number" value={h} min={1} onChange={(e) => setH(parseInt(e.target.value) || 1)} className={inputCls} />
        </div>
        <button
          onClick={() => add({ name: name || `${w} x ${h}`, width: w, height: h, category: 'Custom', isVisible: true })}
          className="w-full rounded-md bg-purple-100 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
        >
          Create preset
        </button>
      </div>
    </div>
  );
}

const presetsFor = (list: DimensionPreset[], apply: (w: number, h: number) => void) =>
  list
    .filter((p) => p.isVisible)
    .map((p) => ({ id: p.id, label: p.name, hint: p.category, onApply: () => apply(p.width, p.height) }));

// stable component identities (module scope) — defining these inside the page
// would remount the open modal on every store re-render, wiping typed input
const CellManagerBody = () => <PresetManagerBody kind="cell" />;
const GridManagerBody = () => <PresetManagerBody kind="grid" />;

export function StitcherGridPage() {
  const {
    cellWidth,
    cellHeight,
    setCellSize,
    targetCols,
    targetRows,
    setTargetGrid,
    cellPresets,
    gridPresets,
    layers,
    activeLayerId,
    setActiveLayer,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    placements,
    activePlacementId,
    setActivePlacementId,
    removePlacement,
    sourceImages,
  } = useStitcherStore();

  return (
    <div className="space-y-4 p-4">
      <CardSettings
        title="Cell Size"
        icon={Ruler}
        presets={presetsFor(cellPresets, setCellSize)}
        modalBody={CellManagerBody}
        modalTitle="Manage Cell Presets"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <input type="number" value={cellWidth} min={1} onChange={(e) => setCellSize(parseInt(e.target.value) || 1, cellHeight)} className={inputCls} />
          <span className="px-1 text-xs text-ink-muted">×</span>
          <input type="number" value={cellHeight} min={1} onChange={(e) => setCellSize(cellWidth, parseInt(e.target.value) || 1)} className={inputCls} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] text-center">
          <span className="text-[9px] uppercase tracking-widest text-ink-muted">Width</span>
          <span />
          <span className="text-[9px] uppercase tracking-widest text-ink-muted">Height</span>
        </div>
      </CardSettings>

      <CardSettings
        title="Export Grid"
        icon={LayoutGrid}
        presets={presetsFor(gridPresets, setTargetGrid)}
        modalBody={GridManagerBody}
        modalTitle="Manage Grid Presets"
        cardClass="border-purple-200/70 bg-purple-50/40 dark:border-purple-900/40 dark:bg-purple-900/10"
        titleClass="text-purple-700 dark:text-purple-300"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <input type="number" value={targetCols} min={1} onChange={(e) => setTargetGrid(parseInt(e.target.value) || 1, targetRows)} className={inputCls} />
          <span className="px-1 text-xs text-ink-muted">×</span>
          <input type="number" value={targetRows} min={1} onChange={(e) => setTargetGrid(targetCols, parseInt(e.target.value) || 1)} className={inputCls} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] text-center">
          <span className="text-[9px] uppercase tracking-widest text-purple-500 dark:text-purple-400">Cols</span>
          <span />
          <span className="text-[9px] uppercase tracking-widest text-purple-500 dark:text-purple-400">Rows</span>
        </div>
      </CardSettings>

      <DrawerSection title="Layers">
        <DrawerLayerList
          layers={layers.map((l) => ({ id: l.id, label: l.name, visible: l.visible }))}
          activeId={activeLayerId}
          onSelect={setActiveLayer}
          onToggleVisibility={toggleLayerVisibility}
          onRemove={removeLayer}
          onAdd={addLayer}
          activeClass="border-purple-400 bg-purple-50/60 text-ink dark:border-purple-600 dark:bg-purple-900/20"
        />
      </DrawerSection>

      <DrawerSection title={`Placements (${placements.length})`}>
        {placements.length === 0 ? (
          <p className="text-xs italic text-ink-muted opacity-60">
            Drag a source selection onto the composite grid.
          </p>
        ) : (
          <div className="space-y-1">
            {placements.map((p, i) => {
              const src = sourceImages.find((img) => img.id === p.sourceId);
              return (
                <DrawerListRow
                  key={p.id}
                  active={activePlacementId === p.id}
                  onClick={() => setActivePlacementId(activePlacementId === p.id ? null : p.id)}
                  icon={
                    <span
                      className="checker-bg h-5 w-5 shrink-0 rounded border border-edge"
                      style={
                        src
                          ? {
                              backgroundImage: `url(${src.url})`,
                              backgroundSize: 'cover',
                              imageRendering: 'pixelated',
                            }
                          : undefined
                      }
                    />
                  }
                  label={`Object ${i + 1} (${p.targetCol},${p.targetRow})`}
                  actions={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlacement(p.id);
                      }}
                      className="rounded p-1 text-ink-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                      title="Remove placement"
                    >
                      <Trash2 size={13} />
                    </button>
                  }
                />
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-ink-muted opacity-60">
          Drag placed objects to move them (release snaps to grid · Shift = free-place) ·
          selected placements nudge with arrow keys (Shift = 8px).
        </p>
      </DrawerSection>

      <DrawerSection title="Stats">
        <DrawerStat label="Sources" value={sourceImages.length} />
        <DrawerStat label="Export size" value={`${targetCols * cellWidth}×${targetRows * cellHeight}px`} />
      </DrawerSection>
    </div>
  );
}
