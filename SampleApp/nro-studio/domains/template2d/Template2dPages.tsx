// Template2dPages — right-drawer tool pages for the 2D sample. The chrome
// lesson: pages command the workspace THROUGH THE STORE (zero props), and the
// same state powers the footer keycaps — one truth, three surfaces.
'use client';
import { DrawerSection, DrawerField, DrawerStat } from '@/components/ui/DrawerSection';
import { DrawerLayerList } from '@/components/ui/DrawerLayerList';
import { useTemplate2dStore } from '@/stores/domains/template2dStore';

const SWATCHES = ['#059669', '#f97316', '#8b5cf6', '#db2777', '#3b82f6', '#0f172a'];
const CELL_SIZES = [8, 16, 32];

export function Template2dLayersPage() {
  const layers = useTemplate2dStore((s) => s.layers);
  const activeLayerId = useTemplate2dStore((s) => s.activeLayerId);
  const strokes = useTemplate2dStore((s) => s.strokes);
  const droppedImage = useTemplate2dStore((s) => s.droppedImage);
  const setActiveLayer = useTemplate2dStore((s) => s.setActiveLayer);
  const toggleLayerVisibility = useTemplate2dStore((s) => s.toggleLayerVisibility);
  const removeLayer = useTemplate2dStore((s) => s.removeLayer);
  const addLayer = useTemplate2dStore((s) => s.addLayer);

  return (
    <div className="space-y-6 p-4">
      <DrawerSection title="Layers" first>
        <DrawerLayerList
          layers={layers.map((l) => ({ id: l.id, label: l.name, visible: l.visible }))}
          activeId={activeLayerId}
          onSelect={setActiveLayer}
          onToggleVisibility={toggleLayerVisibility}
          onRemove={removeLayer}
          onAdd={addLayer}
          activeClass="border-emerald-400 bg-emerald-50/60 text-ink dark:border-emerald-600 dark:bg-emerald-900/20"
        />
      </DrawerSection>

      <DrawerSection title="Canvas">
        <DrawerStat label="Paints" value={strokes.length} />
        <DrawerStat label="Vault image" value={droppedImage ? 'Loaded' : '—'} />
        <DrawerStat label="Layers" value={layers.length} />
      </DrawerSection>
    </div>
  );
}

export function Template2dBrushPage() {
  const color = useTemplate2dStore((s) => s.color);
  const cellSize = useTemplate2dStore((s) => s.cellSize);
  const gridVisible = useTemplate2dStore((s) => s.gridVisible);
  const snapEnabled = useTemplate2dStore((s) => s.snapEnabled);
  const setColor = useTemplate2dStore((s) => s.setColor);
  const setCellSize = useTemplate2dStore((s) => s.setCellSize);

  return (
    <div className="space-y-6 p-4">
      <DrawerSection title="Brush" first>
        <DrawerField label="Color">
          <div className="flex flex-wrap items-center gap-1.5">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                onClick={() => setColor(hex)}
                className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                  color === hex ? 'border-ink ring-2 ring-emerald-400/60' : 'border-edge'
                }`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-edge bg-transparent p-0"
              title="Custom color"
            />
          </div>
        </DrawerField>
        <DrawerField label="Cell size">
          <div className="grid grid-cols-3 gap-1 rounded-md border border-edge-strong/15 bg-track p-1 dark:border-edge">
            {CELL_SIZES.map((px) => (
              <button
                key={px}
                onClick={() => setCellSize(px)}
                className={`rounded py-1 text-[10px] font-bold transition-colors ${
                  cellSize === px
                    ? 'bg-surface-raised text-emerald-600 shadow-sm dark:text-emerald-400'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {px}px
              </button>
            ))}
          </div>
        </DrawerField>
      </DrawerSection>

      <DrawerSection title="View (synced with footer)">
        <DrawerStat label="Grid" value={gridVisible ? 'On' : 'Off'} />
        <DrawerStat label="Snap" value={snapEnabled ? 'On' : 'Off'} />
      </DrawerSection>
    </div>
  );
}
