// AnimatorViewerPage — right-drawer Tools page:
// the ANIM_VIEWER card (checker preview well + TransportPill, disabled until
// sequence wiring) + timing fields (staged).
'use client';
import { Film, Gauge } from 'lucide-react';
import { DrawerSection, DrawerField } from '@/components/ui/DrawerSection';
import { TransportPill } from '@/components/ui/TransportPill';

export function AnimatorViewerPage() {
  return (
    <div className="space-y-6 p-4">
      <DrawerSection title="Anim_Viewer" first>
        <div className="flex flex-col items-center rounded-lg border border-edge bg-surface-raised/60 p-4 shadow-sm">
          <div className="checker-bg relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-lg border border-edge">
            <div className="flex flex-col items-center justify-center gap-2 text-ink-muted">
              <Film size={22} className="opacity-40" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">No Sequence</span>
            </div>
          </div>
          <div className="mt-5">
            <TransportPill disabled accentClass="bg-amber-500" />
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Sequence Timing (pending wiring)">
        <DrawerField label="Ticks (ms)">
          <div className="flex items-center gap-2">
            <Gauge size={14} className="shrink-0 text-ink-muted opacity-50" />
            <input
              type="number"
              value={8}
              disabled
              readOnly
              className="w-full cursor-not-allowed rounded-md border border-edge bg-surface px-2 py-1.5 font-mono text-xs text-ink-muted opacity-60"
            />
          </div>
        </DrawerField>
        <label className="flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-md border border-edge bg-surface px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted opacity-60">
          <span>Frame Align</span>
          <input type="checkbox" disabled className="h-4 w-4 shrink-0 rounded border-edge" />
        </label>
        <p className="rounded-lg border border-dashed border-edge p-2.5 text-[11px] leading-relaxed text-ink-muted">
          Viewer shell only — asset, sequence, frame, and playback wiring land in a later
          Animator slice (staging law).
        </p>
      </DrawerSection>
    </div>
  );
}
