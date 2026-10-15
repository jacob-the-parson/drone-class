// SlicerGridPage — right-drawer page: grid form +
// add/subtract steppers + templates + layers (DrawerLayerList) + stats.
// zod-parse on every input: reject = no-op, never crash a keystroke.
'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { GridConfigSchema } from '@/lib/schemas';
import { useSlicerStore } from '@/stores/domains/slicerStore';
import { DrawerSection, DrawerField, DrawerStat } from '@/components/ui/DrawerSection';
import { DrawerLayerList } from '@/components/ui/DrawerLayerList';

const inputCls =
  'w-full rounded border border-edge bg-surface p-2 text-sm text-ink outline-none transition-colors focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50';

export function SlicerGridPage() {
  const {
    gridConfig,
    setGridConfig,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
    templates,
    layers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    tiles,
    baseImage,
  } = useSlicerStore();

  const [colAction, setColAction] = useState<'add' | 'remove'>('add');
  const [rowAction, setRowAction] = useState<'add' | 'remove'>('add');

  const patch = (partial: Partial<typeof gridConfig>) => {
    const result = GridConfigSchema.safeParse({ ...gridConfig, ...partial });
    if (result.success) setGridConfig(result.data);
  };

  const stepper = (
    action: 'add' | 'remove',
    flip: () => void,
    run: () => void,
    caption: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        <button onClick={flip} className="rounded-l border border-r-0 border-edge p-2 text-ink-muted transition-colors hover:bg-surface-sunken">
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={run}
          className={`flex flex-1 items-center justify-center border px-1 py-2 text-white shadow-sm transition-colors ${
            action === 'add'
              ? 'border-emerald-500 bg-emerald-500 hover:bg-emerald-600'
              : 'border-red-500 bg-red-500 hover:bg-red-600'
          }`}
        >
          {action === 'add' ? <Plus size={14} /> : <Minus size={14} />}
        </button>
        <button onClick={flip} className="rounded-r border border-l-0 border-edge p-2 text-ink-muted transition-colors hover:bg-surface-sunken">
          <ChevronRight size={14} />
        </button>
      </div>
      <span className="text-center text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
        {action === 'add' ? 'Add' : 'Subtract'} {caption}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      <DrawerSection title="Tile Dimensions (px)" first>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Auto Detect</span>
          <button
            onClick={() => patch({ autoSize: !gridConfig.autoSize })}
            className={`relative h-4 w-7 rounded-full shadow-inner transition-colors ${
              gridConfig.autoSize ? 'bg-orange-500' : 'border border-edge bg-control'
            }`}
            title="Fit tile size to the loaded image"
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full shadow-sm transition-transform ${
                gridConfig.autoSize ? 'translate-x-3.5 bg-white' : 'translate-x-0.5 bg-ink-muted'
              }`}
            />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DrawerField label="Width">
            <input
              type="number"
              value={gridConfig.tileWidth}
              min={8}
              max={1024}
              disabled={!!gridConfig.autoSize}
              onChange={(e) => patch({ tileWidth: parseInt(e.target.value) || 8 })}
              className={`${inputCls} ${gridConfig.autoSize ? 'cursor-not-allowed opacity-50' : ''}`}
            />
          </DrawerField>
          <DrawerField label="Height">
            <input
              type="number"
              value={gridConfig.tileHeight}
              min={8}
              max={1024}
              disabled={!!gridConfig.autoSize}
              onChange={(e) => patch({ tileHeight: parseInt(e.target.value) || 8 })}
              className={`${inputCls} ${gridConfig.autoSize ? 'cursor-not-allowed opacity-50' : ''}`}
            />
          </DrawerField>
        </div>
      </DrawerSection>

      <DrawerSection title="Grid">
        <div className="grid grid-cols-2 gap-2">
          <DrawerField label="Columns">
            <input
              type="number"
              value={gridConfig.columns}
              min={1}
              max={2048}
              onChange={(e) => patch({ columns: parseInt(e.target.value) || 1 })}
              className={inputCls}
            />
          </DrawerField>
          <DrawerField label="Rows">
            <input
              type="number"
              value={gridConfig.rows}
              min={1}
              max={2048}
              onChange={(e) => patch({ rows: parseInt(e.target.value) || 1 })}
              className={inputCls}
            />
          </DrawerField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stepper(colAction, () => setColAction((a) => (a === 'add' ? 'remove' : 'add')), colAction === 'add' ? addColumn : removeColumn, 'column')}
          {stepper(rowAction, () => setRowAction((a) => (a === 'add' ? 'remove' : 'add')), rowAction === 'add' ? addRow : removeRow, 'row')}
        </div>
      </DrawerSection>

      <DrawerSection title="Templates">
        <div className="space-y-1">
          {templates.map((t) => {
            const active =
              gridConfig.tileWidth === t.config.tileWidth &&
              gridConfig.tileHeight === t.config.tileHeight &&
              gridConfig.columns === t.config.columns;
            return (
              <button
                key={t.id}
                onClick={() => setGridConfig({ ...t.config, autoSize: false })}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  active
                    ? 'border-orange-400 bg-orange-50/60 text-ink dark:border-orange-600 dark:bg-orange-900/20'
                    : 'border-edge bg-surface-raised/60 text-ink-muted hover:text-ink'
                }`}
              >
                <span className="truncate">{t.name}</span>
                <span className="ml-2 shrink-0 font-mono text-[10px] opacity-70">
                  {t.config.tileWidth}×{t.config.tileHeight}
                </span>
              </button>
            );
          })}
        </div>
      </DrawerSection>

      <DrawerSection title="Layers">
        <DrawerLayerList
          layers={layers.map((l) => ({ id: l.id, label: l.name, visible: l.visible }))}
          activeId={activeLayerId}
          onSelect={setActiveLayerId}
          onToggleVisibility={(id) => {
            const layer = layers.find((l) => l.id === id);
            if (layer) updateLayer(id, { visible: !layer.visible });
          }}
          onRemove={(id) => {
            if (activeLayerId === id) setActiveLayerId('base');
            removeLayer(id);
          }}
          onAdd={() =>
            addLayer({ id: `layer-${Date.now()}`, name: `Layer ${layers.length + 1}`, url: null, visible: true, opacity: 1 })
          }
          activeClass="border-orange-400 bg-orange-50/60 text-ink dark:border-orange-600 dark:bg-orange-900/20"
        />
      </DrawerSection>

      <DrawerSection title="Asset Statistics">
        <DrawerStat label="Base image" value={baseImage ? 'Loaded' : 'None'} />
        <DrawerStat label="Replaced cells" value={Object.keys(tiles).length} />
        <DrawerStat label="Total slots" value={gridConfig.columns * gridConfig.rows} />
        <DrawerStat label="Export size" value={`${gridConfig.columns * gridConfig.tileWidth}×${gridConfig.rows * gridConfig.tileHeight}`} />
      </DrawerSection>
    </div>
  );
}
