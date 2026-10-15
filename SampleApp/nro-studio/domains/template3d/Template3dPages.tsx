// Template3dPages — right-drawer tool page for the 3D sample. The chrome
// lesson: the Regions page recolors the live material THROUGH THE STORE —
// the same wiring the character creator's region recolor panel will use.
'use client';
import { DrawerSection, DrawerField, DrawerStat } from '@/components/ui/DrawerSection';
import { useTemplate3dStore } from '@/stores/domains/template3dStore';

const SWATCHES = ['#f97316', '#10b981', '#8b5cf6', '#3b82f6', '#db2777', '#64748b'];

export function Template3dRegionsPage() {
  const color = useTemplate3dStore((s) => s.color);
  const turntable = useTemplate3dStore((s) => s.turntable);
  const wireframe = useTemplate3dStore((s) => s.wireframe);
  const setColor = useTemplate3dStore((s) => s.setColor);

  return (
    <div className="space-y-6 p-4">
      <DrawerSection title="Material" first>
        <DrawerField label="Albedo color">
          <div className="flex flex-wrap items-center gap-1.5">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                onClick={() => setColor(hex)}
                className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                  color === hex ? 'border-ink ring-2 ring-orange-400/60' : 'border-edge'
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
        <p className="text-[11px] leading-relaxed text-ink-muted">
          Ship-look: matte albedo, no gloss. When the character creator copies this
          domain, this page becomes the per-region recolor panel (mask-driven).
        </p>
      </DrawerSection>

      <DrawerSection title="Viewport (synced with footer)">
        <DrawerStat label="Turntable" value={turntable ? 'On' : 'Off'} />
        <DrawerStat label="Wireframe" value={wireframe ? 'On' : 'Off'} />
      </DrawerSection>
    </div>
  );
}
