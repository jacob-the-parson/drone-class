// The Pi domain's drawer pages: Connect, Gate (the levels and the rules), The Pi
// (what is installed on it).
'use client';
import { LEVEL_WORDS } from '@/lib/pi/catalog';
import type { PiLevel } from '@/lib/pi/types';
import { usePiStore } from '@/stores/domains/piStore';
import { Facts, LevelBadge, PiConnectForm } from './PiParts';

export function PiConnectPage() {
  const source = usePiStore((s) => s.source);
  const origin = usePiStore((s) => s.origin);
  const link = usePiStore((s) => s.link);
  const desktop = usePiStore((s) => s.desktop);
  const connect = usePiStore((s) => s.connect);
  return (
    <div className="space-y-4 p-4 text-xs">
      <section>
        <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Connection</h3>
        <p className="text-sm text-ink">{source === 'pi' ? `${origin} · ${link}` : source === 'practice' ? 'The practice: made-up data' : 'Not connected'}</p>
        <PiConnectForm onConnect={() => void connect()} />
      </section>
      <section className="text-ink-muted">
        <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest">On the Pi</h3>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            Copy the app&apos;s <span className="font-mono">pi/</span> folder to the Pi (with <span className="font-mono">scp</span>).
          </li>
          <li>
            Run <span className="font-mono">python3 pi/bridge.py</span>. It prints where it listens and a token.
          </li>
          <li>Type the Pi&apos;s address and the token here.</li>
        </ol>
        <p className="mt-2">
          Only an address on this network is accepted.{desktop ? ' The desktop app lets this page reach that one address and no other.' : ''}
        </p>
      </section>
    </div>
  );
}

export function PiGatePage() {
  const level = usePiStore((s) => s.hello?.level ?? null);
  return (
    <div className="space-y-3 p-4 text-xs text-ink-muted">
      <h3 className="text-[10px] font-bold uppercase tracking-widest">The gate</h3>
      <p>Who may start what is set on the Pi, by the teacher, in a file only the admin password can change. This app shows it and cannot change it.</p>
      <ul className="space-y-2">
        {(['student', 'instructor', 'developer'] as PiLevel[]).map((l) => (
          <li key={l} className={`rounded-md border p-2 ${level === l ? 'border-rose-400' : 'border-edge'}`}>
            <LevelBadge level={l} /> {level === l && <span className="ml-1 font-semibold text-ink">this Pi</span>}
            <p className="mt-1">{LEVEL_WORDS[l]}</p>
          </li>
        ))}
      </ul>
      <h3 className="pt-2 text-[10px] font-bold uppercase tracking-widest">At every level</h3>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <span className="font-semibold text-ink">The Pi never arms the aircraft.</span> There is no arm command in the bridge&apos;s code. An
          experiment, at the developer level, is the developer&apos;s own code and sits outside this.
        </li>
        <li>
          <span className="font-semibold text-ink">Starting anything needs the token</span> the bridge printed.
        </li>
        <li>
          <span className="font-semibold text-ink">PX4 decides.</span> Setpoints act only in Offboard, which a person selects. Stopping them hands
          back to Position mode after a second.
        </li>
        <li>
          <span className="font-semibold text-ink">No assistant can start anything.</span> The assistant&apos;s tools only read.
        </li>
        <li>
          <span className="font-semibold text-ink">A guardrail, not a lock.</span> Anyone with the Pi&apos;s login can change its program. The
          level keeps a class within bounds; it does not keep out its teacher.
        </li>
      </ul>
    </div>
  );
}

export function PiPiPage() {
  const inv = usePiStore((s) => s.inventory);
  const hello = usePiStore((s) => s.hello);
  if (!inv || !hello) return <p className="p-4 text-xs text-ink-muted">Connect a Pi to see what is on it.</p>;
  const pk = inv.packages;
  return (
    <div className="space-y-4 p-4 text-xs">
      <Facts
        rows={[
          ['Host', inv.host],
          ['System', inv.os],
          ['Python', inv.python],
          ['Camera models', String(inv.camera.model_count)],
          ['LiDAR ports', inv.lidar.ports.join(', ') || 'none'],
          ['Autopilot port', `${inv.autopilot.device} (${inv.autopilot.present ? 'present' : 'absent'})`],
          ['Packages', Object.entries(pk).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join('  ')],
          ['Settings file', hello.settings.config_file ?? '—'],
        ]}
      />
      {hello.settings.config_note && <p className="text-ink-muted">{hello.settings.config_note}</p>}
      <section>
        <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Not yet set on this Pi</h3>
        <ul className="list-disc space-y-1 pl-4 text-ink-muted">
          {!hello.settings.lidar.mount_measured && <li>Which way the LiDAR points on the aircraft (the hand test). Stages B and C wait for it.</li>}
          {!hello.settings.camera.horizontal_fov_deg && <li>The camera&apos;s field of view. Look and measure, and the person templates, wait for it.</li>}
          {hello.settings.lidar.mount_measured && hello.settings.camera.horizontal_fov_deg && <li>Nothing.</li>}
        </ul>
      </section>
      {inv.desktop_apps.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Icons on its desktop</h3>
          <ul className="space-y-0.5 text-ink">
            {inv.desktop_apps.map((d) => (
              <li key={d.file}>{d.name}</li>
            ))}
          </ul>
          <p className="mt-1 text-ink-muted">{inv.note}</p>
        </section>
      )}
    </div>
  );
}
