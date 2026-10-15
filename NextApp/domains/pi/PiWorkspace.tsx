// PiWorkspace — the center surface. Single-surface archetype:
//   HeaderWorkspace [ identity · view switch · practice / connect / disconnect ]
//   → the chosen view. With nothing connected, the surface offers the two sources.
'use client';
import { useEffect } from 'react';
import { Boxes, Camera, Cpu, GraduationCap, LayoutGrid, Plane, Plug, Radar, Square, TriangleAlert, X } from 'lucide-react';
import { HeaderWorkspace } from '@/components/ui/HeaderWorkspace';
import { SegmentedTrack } from '@/components/ui/SegmentedTrack';
import { usePiStore, type PiTab } from '@/stores/domains/piStore';
import { PiConnectForm } from './PiParts';
import { PiAutopilot, PiCamera, PiLidar, PiModules, PiOverview } from './PiViews';

const TABS: { id: PiTab; label: string; short: string; icon: typeof Cpu }[] = [
  { id: 'overview', label: 'Overview', short: 'Now', icon: LayoutGrid },
  { id: 'lidar', label: 'LiDAR', short: 'LiDAR', icon: Radar },
  { id: 'camera', label: 'Camera', short: 'Cam', icon: Camera },
  { id: 'modules', label: 'Modules', short: 'Run', icon: Boxes },
  { id: 'autopilot', label: 'Autopilot', short: 'Auto', icon: Plane },
];

export const PI_BUTTON =
  'flex items-center gap-1.5 whitespace-nowrap rounded-md border border-edge bg-control px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50';

export function PiWorkspace() {
  const source = usePiStore((s) => s.source);
  const link = usePiStore((s) => s.link);
  const error = usePiStore((s) => s.error);
  const hello = usePiStore((s) => s.hello);
  const tab = usePiStore((s) => s.tab);
  const notice = usePiStore((s) => s.notice);
  const look = usePiStore((s) => s.look);
  const setTab = usePiStore((s) => s.setTab);
  const startPractice = usePiStore((s) => s.startPractice);
  const stop = usePiStore((s) => s.stop);
  const connect = usePiStore((s) => s.connect);
  const dismissNotice = usePiStore((s) => s.dismissNotice);

  useEffect(() => look(), [look]);

  const subtitle =
    source === 'practice'
      ? 'Practice: a made-up room with one person in it. No Pi is involved.'
      : source === 'pi'
        ? link === 'connected'
          ? `${hello?.name ?? 'Pi'} · level ${hello?.level ?? '?'}${hello?.made_up ? ' · its sensors are MADE UP' : ''}`
          : link === 'lost'
            ? 'The link to the Pi was lost; trying again'
            : link === 'failed'
              ? 'Could not connect'
              : 'Connecting'
        : 'The Raspberry Pi: its camera, its LiDAR, its link to the autopilot';
  const showing = source === 'practice' || (source === 'pi' && (link === 'connected' || link === 'lost'));

  return (
    <div className="flex h-full flex-col">
      <HeaderWorkspace
        icon={Cpu}
        iconClass="text-rose-600 dark:text-rose-400"
        title="Pi"
        subtitle={subtitle}
        fit="wide"
        center={showing ? <SegmentedTrack ariaLabel="Pi view" options={TABS} value={tab} onChange={setTab} /> : undefined}
        actions={
          source === 'off' ? (
            <button onClick={() => void startPractice()} className={PI_BUTTON}>
              <GraduationCap size={13} /> Practice
            </button>
          ) : (
            <button onClick={stop} className={PI_BUTTON}>
              <Square size={13} /> {source === 'pi' ? 'Disconnect' : 'Stop'}
            </button>
          )
        }
      />

      {notice && (
        <div role="status" className="flex shrink-0 items-start gap-2 border-b border-edge bg-amber-50/70 px-4 py-2 text-xs text-ink dark:bg-amber-950/30">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-status-warning" />
          <span className="min-w-0 flex-1">{notice}</span>
          <button onClick={dismissNotice} className="rounded p-0.5 text-ink-muted hover:text-ink" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {source === 'off' && (
          <div className="mx-auto grid max-w-4xl gap-4 p-6 md:grid-cols-2">
            <section className="rounded-2xl border border-edge bg-surface-raised p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <GraduationCap size={16} className="text-rose-600 dark:text-rose-400" /> Practice
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                A made-up room of 6 by 4 metres with one person walking in it, recorded from the bridge&apos;s own made-up
                sensors. The LiDAR draws the walls; the camera finds the person; together they say how far away the
                person is.
              </p>
              <button onClick={() => void startPractice()} className={`${PI_BUTTON} mt-4`}>
                <GraduationCap size={13} /> Start the practice
              </button>
            </section>
            <section className="rounded-2xl border border-edge bg-surface-raised p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Plug size={16} className="text-rose-600 dark:text-rose-400" /> Connect to a Pi
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                On the Pi, start the bridge: <span className="font-mono">python3 bridge.py</span>. It prints a token. Type the
                Pi&apos;s address and the token here.
              </p>
              <PiConnectForm onConnect={() => void connect()} />
            </section>
          </div>
        )}

        {source === 'pi' && link === 'connecting' && <p className="p-6 text-sm text-ink-muted">Asking the Pi who it is…</p>}

        {source === 'pi' && link === 'failed' && (
          <div className="mx-auto max-w-2xl p-6">
            <div className="rounded-xl border border-red-300 bg-red-50/70 p-5 text-sm dark:border-red-900 dark:bg-red-950/30">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <TriangleAlert size={16} className="text-status-critical" /> Could not connect
              </p>
              <p className="mt-1 text-ink-muted">{error}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-ink-muted">
                <li>Is the Pi on, and is the bridge running on it? It prints &quot;listening on&quot; when it is.</li>
                <li>Is this computer on the same network as the Pi?</li>
                <li>Is the address right? On the Pi, <span className="font-mono">hostname -I</span> prints it.</li>
              </ol>
              <button onClick={stop} className={`${PI_BUTTON} mt-4`}>
                Back
              </button>
            </div>
          </div>
        )}

        {showing && tab === 'overview' && <PiOverview />}
        {showing && tab === 'lidar' && <PiLidar />}
        {showing && tab === 'camera' && <PiCamera />}
        {showing && tab === 'modules' && <PiModules />}
        {showing && tab === 'autopilot' && <PiAutopilot />}
      </div>
    </div>
  );
}
