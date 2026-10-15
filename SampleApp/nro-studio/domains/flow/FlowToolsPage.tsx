// FlowToolsPage — right-drawer Tools page: the
// TOOL-PALETTE archetype — icon toggle group + contextual brush settings
// (only when paint/erase active) + layers via DrawerLayerList.
'use client';
import { Eraser, MousePointer2, Paintbrush, Pipette } from 'lucide-react';
import { useFlowStore, type FlowTool } from '@/stores/domains/flowStore';
import { DrawerSection, DrawerField } from '@/components/ui/DrawerSection';
import { DrawerLayerList } from '@/components/ui/DrawerLayerList';

const TOOLS: { id: FlowTool; icon: typeof Paintbrush; title: string }[] = [
  { id: null, icon: MousePointer2, title: 'Select (no tool)' },
  { id: 'paint', icon: Paintbrush, title: 'Paint' },
  { id: 'erase', icon: Eraser, title: 'Erase' },
  { id: 'picker', icon: Pipette, title: 'Color picker' },
];

export function FlowToolsPage() {
  const {
    activeTool,
    setActiveTool,
    currentColor,
    setCurrentColor,
    brushSize,
    setBrushSize,
    layers,
    activeLayerId,
    setActiveLayer,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
  } = useFlowStore();

  return (
    <div className="space-y-6 p-4">
      <DrawerSection title="Drawing Tools" first>
        <div className="flex gap-2">
          {TOOLS.map(({ id, icon: Icon, title }) => (
            <button
              key={title}
              onClick={() => setActiveTool(id)}
              title={title}
              className={`rounded-md p-2 transition-colors ${
                activeTool === id
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                  : 'bg-control text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* contextual-reveal law: options appear only under an active tool */}
        {(activeTool === 'paint' || activeTool === 'erase') && (
          <div className="space-y-3 pt-1">
            <DrawerField label="Color">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="h-8 w-full cursor-pointer rounded border border-edge bg-transparent p-0"
              />
            </DrawerField>
            <DrawerField label={`Size — ${brushSize}px`}>
              <input
                type="range"
                min={1}
                max={100}
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </DrawerField>
          </div>
        )}
      </DrawerSection>

      {/* FUTURE: "View" section here w/ a Transparency toggle — checker inside
          the canvas bounds vs the clean paper look (see FlowTargetPanel note) */}
      <DrawerSection title="Layers">
        <DrawerLayerList
          layers={layers.map((l) => ({ id: l.id, label: l.name, visible: l.visible }))}
          activeId={activeLayerId}
          onSelect={setActiveLayer}
          onToggleVisibility={toggleLayerVisibility}
          onRemove={removeLayer}
          onAdd={addLayer}
          activeClass="border-indigo-400 bg-indigo-50/60 text-ink dark:border-indigo-600 dark:bg-indigo-900/20"
        />
      </DrawerSection>
    </div>
  );
}
