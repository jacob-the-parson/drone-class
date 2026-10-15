// The Pi domain's views. Each reads the store; none takes a prop.
// Status is always an icon and a word; colour alone never carries it.
'use client';
import { useEffect, useState } from 'react';
import { Camera, CircleCheck, CircleSlash, Cpu, OctagonAlert, Play, Plane, Radar, Square, TriangleAlert } from 'lucide-react';
import { PI_CATALOG } from '@/lib/pi/catalog';
import type { PiModule, PiStage } from '@/lib/pi/types';
import { STAGE_LABEL } from '@/lib/pi/types';
import { bearingWords, measuredLine, nearest, radarPoints, sectorCounts } from '@/lib/pi/view';
import { usePrefsStore } from '@/stores/core/prefsStore';
import { usePiStore } from '@/stores/domains/piStore';
import { Card, Facts, LevelBadge, age } from './PiParts';
import { PI_BUTTON } from './PiWorkspace';

function Learn({ children }: { children: React.ReactNode }) {
  const learn = usePrefsStore((s) => s.learn);
  return learn ? <p className="rounded-lg border border-edge bg-control/50 p-3 text-xs leading-snug text-ink-muted">{children}</p> : null;
}

function useTick(ms: number): void {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

// ---------------------------------------------------------------- Overview

export function PiOverview() {
  const source = usePiStore((s) => s.source);
  const hello = usePiStore((s) => s.hello);
  const now = usePiStore((s) => s.now);
  const at = usePiStore((s) => s.at);
  const status = usePiStore((s) => s.status);
  const log = usePiStore((s) => s.log);
  useTick(1000);
  const near = nearest(now.scan);
  const running = status ? Object.entries(status.running) : [];
  return (
    <div className="space-y-4 p-4">
      <Learn>
        The Pi is a small computer that can ride on the aircraft. It has two sensors of its own: an AI camera that recognises
        things, and a LiDAR that spins and measures distances all around. A program on it, the bridge, tells this app what
        they see. It can also talk to the autopilot, in three stages: listening, sending obstacle data, and asking it to move.
      </Learn>
      <div className="grid gap-3 md:grid-cols-3">
        <Card title="LiDAR" icon={<Radar size={14} className="text-rose-600 dark:text-rose-400" />}>
          <p className="text-xl font-semibold text-ink">{near ? `${near.distance_m.toFixed(2)} m` : 'No scan'}</p>
          <p className="text-[11px] text-ink-muted">{near ? `nearest, ${bearingWords(near.bearing_deg)} · ${now.scan?.points} points · ${age(at.scan)}` : 'Start the LiDAR on the Modules tab'}</p>
        </Card>
        <Card title="Camera" icon={<Camera size={14} className="text-rose-600 dark:text-rose-400" />}>
          <p className="truncate text-xl font-semibold text-ink">{now.detections ? `${now.detections.items.length} seen` : 'Off'}</p>
          <p className="truncate text-[11px] text-ink-muted">{now.measure ? measuredLine(now.measure.items) : now.detections ? now.detections.items.map((d) => d.label).join(', ') || 'nothing' : 'Start the camera on the Modules tab'}</p>
        </Card>
        <Card title="Autopilot" icon={<Plane size={14} className="text-rose-600 dark:text-rose-400" />}>
          <p className="text-xl font-semibold text-ink">{now.autopilot?.vehicle ? now.autopilot.vehicle.mode : now.autopilot ? 'Not heard' : 'No link'}</p>
          <p className="text-[11px] text-ink-muted">{now.autopilot ? (now.autopilot.talking ? 'the Pi is sending' : 'listening: the Pi sends nothing') : source === 'practice' ? 'needs a real Pi' : 'Start stage A on the Modules tab'}</p>
        </Card>
      </div>
      {source === 'pi' && hello && (
        <Card title="This Pi" icon={<Cpu size={14} className="text-rose-600 dark:text-rose-400" />}>
          <div className="mb-2 flex items-center gap-2">
            <LevelBadge level={hello.level} />
            {hello.made_up && <span className="text-[11px] font-semibold text-status-warning">its sensors are made up (--made-up)</span>}
          </div>
          <Facts
            rows={[
              ['Name', hello.name],
              ['Bridge', hello.version],
              ['Running', running.length ? running.map(([id]) => id).join(', ') : 'nothing'],
              ['Pictures', hello.pictures ? 'allowed by the settings' : 'off (detections only)'],
            ]}
          />
        </Card>
      )}
      {log.length > 0 && (
        <Card title="What the Pi did">
          <ul className="max-h-48 space-y-0.5 overflow-y-auto font-mono text-[11px]">
            {[...log].reverse().map((l) => (
              <li key={l.seq} className={l.level === 'error' ? 'text-status-critical' : l.level === 'warning' ? 'text-status-warning' : 'text-ink-muted'}>
                {new Date(l.t * 1000).toLocaleTimeString()} {l.text}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- LiDAR

export function PiLidar() {
  const scan = usePiStore((s) => s.now.scan);
  const obstacles = usePiStore((s) => s.now.obstacles);
  const [range, setRange] = useState(6);
  if (!scan) return <p className="p-6 text-sm text-ink-muted">No scan yet. Start the LiDAR on the Modules tab.</p>;
  const pts = radarPoints(scan, range);
  const near = nearest(scan);
  const R = 100;
  const k = R / range;
  const rings = [1, 2, 4, 8, 12, 16].filter((r) => r <= range);
  return (
    <div className="space-y-3 p-4">
      <Learn>
        The aircraft is in the middle, its nose pointing up. Each dot is one laser return: something that far away in that
        direction. The LiDAR turns ten times a second and takes about 400 measurements each turn.
        {!scan.mount_measured && ' Which way is the nose has not been measured on this aircraft yet: the hand test decides it.'}
      </Learn>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        Show up to
        {[3, 6, 12, 16].map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-md border px-2 py-0.5 ${range === r ? 'border-rose-400 text-ink' : 'border-edge'}`}>
            {r} m
          </button>
        ))}
        <span className="ml-auto">{near ? `nearest ${near.distance_m.toFixed(2)} m, ${bearingWords(near.bearing_deg)}` : ''}</span>
      </div>
      <div className="mx-auto aspect-square w-full max-w-[560px] rounded-xl border border-edge bg-surface-raised p-2">
        <svg viewBox="-105 -105 210 210" role="img" aria-label={`LiDAR scan, ${pts.length} points within ${range} metres`} className="h-full w-full">
          {rings.map((r) => (
            <g key={r}>
              <circle r={r * k} fill="none" className="stroke-edge" strokeWidth="0.5" />
              <text x={2} y={-r * k - 1.5} fontSize="5" className="fill-ink-muted">
                {r} m
              </text>
            </g>
          ))}
          <line x1={0} y1={-R} x2={0} y2={R} className="stroke-edge" strokeWidth="0.4" strokeDasharray="2 2" />
          <line x1={-R} y1={0} x2={R} y2={0} className="stroke-edge" strokeWidth="0.4" strokeDasharray="2 2" />
          {obstacles &&
            obstacles.distances_cm.map((d, i) => {
              if (d === 65535 || d > obstacles.max_cm) return null;
              const a = ((i * obstacles.increment_deg) * Math.PI) / 180;
              const r = Math.min(d / 100, range) * k;
              return <circle key={i} cx={r * Math.sin(a)} cy={-r * Math.cos(a)} r={2.2} className="fill-amber-500/70" />;
            })}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x * k} cy={-p.y * k} r={1.1} className={p.r < 1 ? 'fill-red-500' : p.r < 2.5 ? 'fill-amber-500' : 'fill-sky-500'} />
          ))}
          <path d="M 0 -6 L 4.5 5 L 0 2.5 L -4.5 5 Z" className="fill-rose-600 dark:fill-rose-400" />
        </svg>
      </div>
      <p className="text-center text-[11px] text-ink-muted">
        Red closer than 1 m, amber closer than 2.5 m, blue farther.{obstacles ? ' Large amber dots: the 72 sectors the Pi is sending to the autopilot.' : ''}
        {scan.made_up ? ' Made-up room.' : ''}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Camera

export function PiCamera() {
  const det = usePiStore((s) => s.now.detections);
  const measure = usePiStore((s) => s.now.measure);
  const hello = usePiStore((s) => s.hello);
  const source = usePiStore((s) => s.source);
  const origin = usePiStore((s) => s.origin);
  const [pic, setPic] = useState<string | null>(null);
  useEffect(() => {
    if (source !== 'pi' || !hello?.pictures || !origin) return;
    const t = setInterval(() => setPic(`${origin}/api/v1/picture.jpg?t=${Date.now()}`), 2000);
    return () => clearInterval(t);
  }, [source, hello?.pictures, origin]);
  if (!det) return <p className="p-6 text-sm text-ink-muted">The camera is off. Start it on the Modules tab.</p>;
  return (
    <div className="space-y-3 p-4">
      <Learn>
        The AI camera runs a model on its own chip and sends back only what it found: a name, how sure it is, and a box
        around it. The picture itself stays on the Pi unless the teacher&apos;s settings allow it. Each box here is drawn where
        the camera saw the object.
      </Learn>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[640px] overflow-hidden rounded-xl border border-edge bg-zinc-900">
        {pic && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pic} alt="What the camera sees" className="absolute inset-0 h-full w-full object-cover" onError={() => setPic(null)} />
        )}
        {!pic && <p className="absolute inset-x-0 top-2 text-center text-[11px] text-zinc-400">{source === 'practice' ? 'Made-up camera: boxes only' : 'Detections only: pictures are off in the Pi’s settings'}</p>}
        {det.items.map((d, i) => {
          const m = measure?.items[i];
          return (
            <div key={i} className="absolute border-2 border-emerald-400" style={{ left: `${d.box[0] * 100}%`, top: `${d.box[1] * 100}%`, width: `${d.box[2] * 100}%`, height: `${d.box[3] * 100}%` }}>
              <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                {d.label} {(d.score * 100).toFixed(0)}%{m && m.distance_m !== null ? ` · ${m.distance_m.toFixed(1)} m` : ''}
              </span>
            </div>
          );
        })}
      </div>
      <Card title={`Seen by ${det.model}`}>
        {det.items.length === 0 ? (
          <p className="text-xs text-ink-muted">Nothing above the threshold.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {(measure?.items ?? det.items.map((d) => ({ ...d, bearing_deg: NaN, distance_m: null }))).map((m, i) => (
              <li key={i} className="flex justify-between gap-3 text-ink">
                <span>
                  {m.label} <span className="text-ink-muted">{(m.score * 100).toFixed(0)}%</span>
                </span>
                <span className="font-mono text-ink-muted">
                  {Number.isFinite(m.bearing_deg) ? bearingWords(m.bearing_deg) : ''}
                  {m.distance_m !== null ? ` · ${m.distance_m.toFixed(2)} m` : measure ? ' · LiDAR sees nothing there' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!measure && <p className="mt-2 text-[11px] text-ink-muted">Start “Look and measure” to have the LiDAR say how far each one is.</p>}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Modules

const STAGES: PiStage[] = ['lesson', 'template', 'A', 'B', 'C', 'experiment'];

function ModuleRow({ m }: { m: PiModule }) {
  const source = usePiStore((s) => s.source);
  const busy = usePiStore((s) => s.busy);
  const hello = usePiStore((s) => s.hello);
  const inventory = usePiStore((s) => s.inventory);
  const startModule = usePiStore((s) => s.startModule);
  const stopModule = usePiStore((s) => s.stopModule);
  const [model, setModel] = useState('');
  const [askOffboard, setAskOffboard] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const live = source === 'pi';
  const talks = !!m.talks;
  const go = () => {
    const options: Record<string, unknown> = {};
    if (model) options.model = `/usr/share/imx500-models/${model}`;
    if (askOffboard) options.ask_offboard = true;
    setConfirming(false);
    void startModule(m.id, options);
  };
  return (
    <li className="rounded-lg border border-edge p-3">
      <div className="flex flex-wrap items-center gap-2">
        {m.running ? <CircleCheck size={14} className="text-status-good" /> : m.why_not ? <CircleSlash size={14} className="text-ink-muted" /> : <Play size={14} className="text-ink-muted" />}
        <span className="text-sm font-semibold text-ink">{m.name}</span>
        <LevelBadge level={m.level} />
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-ink-muted">{m.running ? 'Running' : m.why_not ? 'Not now' : 'Ready'}</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{m.about}</p>
      {m.why_not && !m.running && <p className="mt-1 text-xs text-ink">{m.why_not}</p>}
      {live && m.id === 'camera' && !m.running && (inventory?.camera.models.length ?? 0) > 0 && (
        <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-2 w-full rounded-md border border-edge bg-surface px-2 py-1 text-xs text-ink" aria-label="Camera model">
          <option value="">The settings&apos; model</option>
          {inventory!.camera.models.map((x) => (
            <option key={x} value={x}>
              {x.replace(/^imx500_network_|\.rpk$/g, '')}
            </option>
          ))}
        </select>
      )}
      {live && m.stage === 'C' && hello?.level === 'developer' && !m.running && (
        <label className="mt-2 flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={askOffboard} onChange={(e) => setAskOffboard(e.target.checked)} /> Ask the autopilot for Offboard (developer)
        </label>
      )}
      {live && (
        <div className="mt-2 flex flex-wrap gap-2">
          {m.running ? (
            <button onClick={() => void stopModule(m.id)} disabled={busy === m.id} className={PI_BUTTON}>
              <Square size={13} /> Stop
            </button>
          ) : confirming ? (
            <>
              <button onClick={go} disabled={busy === m.id} className={`${PI_BUTTON} border-amber-400`}>
                <TriangleAlert size={13} className="text-status-warning" /> Yes, start it
              </button>
              <button onClick={() => setConfirming(false)} className={PI_BUTTON}>
                Cancel
              </button>
              <p className="w-full text-[11px] text-ink">
                This sends to the autopilot. Props off, or in the simulator; a pilot holding the radio with the kill switch in reach.
                {m.stage === 'C' && ' Nothing moves until the pilot selects Offboard, and the sticks take over only if COM_RC_OVERRIDE allows it.'}
              </p>
            </>
          ) : (
            <button onClick={() => (talks ? setConfirming(true) : go())} disabled={!!m.why_not || busy === m.id} className={PI_BUTTON}>
              <Play size={13} /> Start
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function PiModules() {
  const source = usePiStore((s) => s.source);
  const modules = usePiStore((s) => s.modules);
  const list: PiModule[] =
    source === 'pi'
      ? modules
      : PI_CATALOG.map((c) => ({ ...c, about: '', running: false, why_not: 'Connect a Pi to start this. The practice plays a recording.' }));
  return (
    <div className="space-y-4 p-4">
      <Learn>
        A module is something the Pi can run. The level, set on the Pi by the teacher, decides which can start: students run
        the sensor lessons; an instructor can also send to the autopilot; a developer can also run experiments. The Pi never
        arms the aircraft, at any level, in its own modules.
      </Learn>
      {STAGES.map((stage) => {
        const ms = list.filter((m) => m.stage === stage);
        if (ms.length === 0) return null;
        return (
          <section key={stage}>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-muted">{STAGE_LABEL[stage]}</h2>
            <ul className="space-y-2">
              {ms.map((m) => (
                <ModuleRow key={m.id} m={m} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- Autopilot

export function PiAutopilot() {
  const source = usePiStore((s) => s.source);
  const a = usePiStore((s) => s.now.autopilot);
  const obstacles = usePiStore((s) => s.now.obstacles);
  const sp = usePiStore((s) => s.now.setpoint);
  const at = usePiStore((s) => s.at);
  useTick(1000);
  if (source === 'practice') {
    return (
      <div className="space-y-3 p-4">
        <Learn>
          With the Pi wired to the flight controller&apos;s TELEM2 port, it can hear the autopilot (stage A), send it the
          LiDAR&apos;s obstacle data (stage B), and stream setpoints from a template (stage C). The practice has no autopilot.
        </Learn>
        <p className="text-sm text-ink-muted">Connect a Pi to see its autopilot link.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 p-4">
      {sp && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50/70 p-3 text-xs text-ink dark:border-red-900 dark:bg-red-950/30">
          <OctagonAlert size={16} className="mt-0.5 shrink-0 text-status-critical" />
          <span>
            <b>Stage C is running: the Pi is streaming setpoints ({sp.template}).</b> They act only in Offboard. Forward{' '}
            {sp.vx.toFixed(2)} m/s, turning {sp.yaw_rate_dps.toFixed(1)}°/s: {sp.why}.
          </span>
        </div>
      )}
      <Card title="Stage A: what the Pi hears" icon={<Plane size={14} className="text-rose-600 dark:text-rose-400" />}>
        {!a ? (
          <p className="text-xs text-ink-muted">No link. Start “Stage A: listen to the autopilot” on the Modules tab.</p>
        ) : (
          <Facts
            rows={[
              ['Link', `${a.link} · ${a.talking ? 'talking' : 'listening: sends nothing'}`],
              ['Heard', a.heard ? `yes, ${a.last_rx_age_s ?? '?'} s ago` : 'nothing'],
              ['Mode', a.vehicle ? `${a.vehicle.mode}${a.vehicle.offboard ? ' (the Pi’s setpoints act)' : ''}` : '—'],
              ['Armed', a.vehicle ? (a.vehicle.armed ? 'ARMED' : 'disarmed') : '—'],
              ['Attitude', a.attitude ? `roll ${a.attitude.roll_deg}°, pitch ${a.attitude.pitch_deg}°, heading ${a.attitude.yaw_deg}°` : '—'],
              ['Battery', a.battery?.volts != null ? `${a.battery.volts.toFixed(2)} V` : '—'],
              ['Sent', Object.keys(a.sent).length ? Object.entries(a.sent).map(([k, v]) => `${k} ${v}`).join(', ') : 'nothing'],
            ]}
          />
        )}
      </Card>
      <Card title="Stage B: obstacle data">
        {!obstacles ? (
          <p className="text-xs text-ink-muted">Not sending. Needs the instructor level and a measured LiDAR mount.</p>
        ) : (
          (() => {
            const c = sectorCounts(obstacles);
            return (
              <Facts
                rows={[
                  ['Sectors', `72 of ${obstacles.increment_deg}°: ${c.obstacle} with an obstacle, ${c.clear} clear, ${c.unknown} unknown`],
                  ['Range', `${obstacles.min_cm / 100} to ${obstacles.max_cm / 100} m`],
                  ['Last sent', age(at.obstacles)],
                ]}
              />
            );
          })()
        )}
        <p className="mt-2 text-[11px] text-ink-muted">
          PX4 uses this only in Position mode, with CP_DIST set (it is −1, off, on this aircraft today). If it stops for 0.5 s PX4
          allows no sideways movement; after 5 s it goes to Hold.
        </p>
      </Card>
      <Card title="Stage C: setpoints">
        {!sp ? (
          <p className="text-xs text-ink-muted">Not streaming.</p>
        ) : (
          <Facts rows={[['Template', sp.template], ['Forward', `${sp.vx.toFixed(2)} m/s`], ['Turn', `${sp.yaw_rate_dps.toFixed(1)} °/s`], ['Why', sp.why], ['Last', age(at.setpoint)]]} />
        )}
      </Card>
    </div>
  );
}
