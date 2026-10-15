// CreatorRegionsPage — right-drawer Tools page: the 42-region recolor panel
// (the seed's region list, chrome-native). Row = color swatch input · name ·
// face count; click = select (viewport gives the region a breathing highlight).
'use client';
import { useState } from 'react';
import { Cable, Palette } from 'lucide-react';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { useCreatorStore } from '@/stores/domains/creatorStore';
import { useBlenderStore } from '@/stores/services/blenderStore';
import { pushPaletteToBlender } from './creatorBlender';

export function CreatorRegionsPage() {
  const regions = useCreatorStore((s) => s.regions);
  const colors = useCreatorStore((s) => s.colors);
  const activeRegion = useCreatorStore((s) => s.activeRegion);
  const setRegionColor = useCreatorStore((s) => s.setRegionColor);
  const setActiveRegion = useCreatorStore((s) => s.setActiveRegion);
  const blenderBusy = useBlenderStore((s) => s.busy);
  const [pushResult, setPushResult] = useState<string | null>(null);

  const handlePush = async () => {
    setPushResult(null);
    const res = await pushPaletteToBlender();
    setPushResult(`${res.ok ? '✓' : '✗'} ${res.message}`);
  };

  return (
    <div className="space-y-4 p-4">
      <DrawerSection title={`Regions (${regions.length})`} first>
        {regions.length === 0 ? (
          <p className="text-xs italic text-ink-muted opacity-60">Loading region manifest…</p>
        ) : (
          <div className="space-y-0.5">
            {regions.map((r) => {
              const active = activeRegion === r.name;
              return (
                <div
                  key={r.name}
                  onClick={() => setActiveRegion(active ? null : r.name)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors ${
                    active
                      ? 'border-cyan-400 bg-cyan-50/60 text-ink dark:border-cyan-600 dark:bg-cyan-900/20'
                      : 'border-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink'
                  }`}
                >
                  <input
                    type="color"
                    value={colors[r.name] ?? '#cccccc'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setRegionColor(r.name, e.target.value)}
                    className="h-5 w-6 shrink-0 cursor-pointer rounded border border-edge bg-transparent p-0"
                    title={`Recolor ${r.name}`}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                  <span className="shrink-0 font-mono text-[10px] opacity-50">{r.faces}</span>
                </div>
              );
            })}
          </div>
        )}
      </DrawerSection>

      <DrawerSection title="Bridge">
        <button
          onClick={handlePush}
          disabled={blenderBusy || regions.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 py-2 text-xs font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Paint this palette onto the Blender-side ID-color material (relay must be connected — see Settings)"
        >
          <Cable size={14} /> {blenderBusy ? 'Pushing…' : 'Push palette to Blender'}
        </button>
        {pushResult && (
          <p className={`text-[11px] ${pushResult.startsWith('✓') ? 'text-primary' : 'text-red-500'}`}>
            {pushResult}
          </p>
        )}
      </DrawerSection>

      <p className="rounded-lg border border-dashed border-edge p-2.5 text-[11px] leading-relaxed text-ink-muted">
        <Palette size={12} className="mr-1 inline text-cyan-600 dark:text-cyan-400" />
        Live recolor through the baked ID map — the same <code>regions.body.json</code> the
        Blender pipeline uses. The push is a SYNC: it builds (or updates) the per-gender
        <code> eon.skin.toon.idcolor.body_*</code> material with all 42 regions — recipe
        canonical, both engines resolve it.
      </p>
    </div>
  );
}
