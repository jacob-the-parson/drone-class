// Pi domain store — the connection to the bridge on a Raspberry Pi, and the newest
// of what it sees.
//
// Two sources:
//   - 'pi': the page talks to the bridge (pi/bridge.py) at the address the user typed.
//     In the desktop app the main process is asked first to let that one address
//     through (lib/pi/client.ts, piBridge). In a browser the page asks it directly.
//   - 'practice': a recording of the bridge's made-up room (public/data/practice-pi.json),
//     played round and round. Works everywhere, with no Pi.
//
// Kept between visits: the address, the token and the tab, in this browser only.
// What the Pi saw is not kept.
//
// Nothing here talks to an aircraft. Starting a module asks the Pi; what the Pi then
// sends to an autopilot is the Pi's, and the Pi's level decides whether it may.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { piAddress } from '@/lib/pi/address';
import { PiClient, PiError, piBridge } from '@/lib/pi/client';
import { EMPTY_NOW, type PiDetection, type PiHello, type PiInventory, type PiKind, type PiLogLine, type PiMeasured, type PiModule, type PiNow, type PiStatus } from '@/lib/pi/types';

export type PiSource = 'off' | 'practice' | 'pi';
export type PiTab = 'overview' | 'lidar' | 'camera' | 'modules' | 'autopilot';
export type PiLinkState = 'idle' | 'connecting' | 'connected' | 'lost' | 'failed';

export const PRACTICE_PI_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/data/practice-pi.json`;

interface Practice {
  hz: number;
  angles_deg: number[];
  horizontal_fov_deg: number;
  max_range_m: number;
  frames: { t: number; ranges_cm: number[]; detections: PiDetection[]; measure: PiMeasured[] }[];
}

interface PiState {
  source: PiSource;
  address: string;
  token: string;
  origin: string | null;
  link: PiLinkState;
  error: string | null;
  hello: PiHello | null;
  inventory: PiInventory | null;
  modules: PiModule[];
  status: PiStatus | null;
  now: PiNow;
  /** When each kind last arrived, in seconds. */
  at: Partial<Record<PiKind, number>>;
  log: PiLogLine[];
  busy: string | null;
  tab: PiTab;
  notice: string | null;
  desktop: boolean | null;
  secure: boolean;

  look: () => void;
  setAddress: (a: string) => void;
  setToken: (t: string) => void;
  setTab: (t: PiTab) => void;
  dismissNotice: () => void;
  connect: () => Promise<void>;
  startPractice: () => Promise<void>;
  stop: () => void;
  refresh: () => Promise<void>;
  startModule: (id: string, options?: Record<string, unknown>) => Promise<void>;
  stopModule: (id: string) => Promise<void>;
  stopAll: () => Promise<void>;
}

let client: PiClient | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let practice: Practice | null = null;

function halt(): void {
  client?.close();
  client = null;
  if (timer) clearInterval(timer);
  timer = null;
}

const message = (e: unknown) => (e instanceof PiError || e instanceof Error ? e.message : String(e));

export const usePiStore = create<PiState>()(
  persist(
    (set, get) => ({
      source: 'off',
      address: '',
      token: '',
      origin: null,
      link: 'idle',
      error: null,
      hello: null,
      inventory: null,
      modules: [],
      status: null,
      now: EMPTY_NOW,
      at: {},
      log: [],
      busy: null,
      tab: 'overview',
      notice: null,
      desktop: null,
      secure: false,

      look: () => set({ desktop: piBridge() !== null, secure: typeof location !== 'undefined' && location.protocol === 'https:' }),
      setAddress: (address) => set({ address }),
      setToken: (token) => {
        client?.setToken(token);
        set({ token });
      },
      setTab: (tab) => set({ tab }),
      dismissNotice: () => set({ notice: null }),

      connect: async () => {
        get().stop();
        const a = piAddress(get().address);
        if ('error' in a) {
          set({ notice: a.error });
          return;
        }
        if (get().secure) {
          set({ notice: 'This page was loaded over https, and a browser will not let it reach a Pi over http. Use the desktop app, or the app from `npm run dev` on this computer.' });
          return;
        }
        set({ source: 'pi', origin: a.origin, link: 'connecting', error: null, notice: null, now: EMPTY_NOW, at: {}, log: [] });
        const bridge = piBridge();
        if (bridge) {
          const ok = await bridge.allow(a.origin).catch((e: unknown) => ({ ok: false, error: message(e) }));
          if (!ok.ok) {
            set({ link: 'failed', error: ok.error ?? 'The desktop app would not let the page reach that address.' });
            return;
          }
        }
        const c = new PiClient(a.origin, get().token);
        client = c;
        try {
          const [hello, inventory, mods] = await Promise.all([c.hello(), c.inventory(), c.modules()]);
          if (hello.app !== 'flight-companion-pi') throw new PiError('Something answered, and it is not the Flight Companion bridge.');
          if (client !== c) return;
          set({ hello, inventory, modules: mods.modules, status: mods.status, link: 'connected' });
        } catch (e) {
          if (client !== c) return;
          set({ link: 'failed', error: message(e) });
          c.close();
          client = null;
          return;
        }
        c.listen({
          onOpen: () => client === c && set({ link: 'connected' }),
          onLost: () => client === c && set({ link: 'lost' }),
          onKind: (kind, data, t) => {
            if (client !== c) return;
            set((s) => ({ now: { ...s.now, [kind]: data } as PiNow, at: { ...s.at, [kind]: t } }));
          },
          onModules: (status) => {
            if (client !== c) return;
            set((s) => ({ status, modules: s.modules.map((m) => ({ ...m, running: m.id in status.running })) }));
          },
          onLog: (line) => client === c && set((s) => ({ log: [...s.log, line].slice(-100) })),
        });
      },

      refresh: async () => {
        const c = client;
        if (!c) return;
        try {
          const [hello, mods] = await Promise.all([c.hello(), c.modules()]);
          if (client === c) set({ hello, modules: mods.modules, status: mods.status });
        } catch (e) {
          if (client === c) set({ notice: message(e) });
        }
      },

      startModule: async (id, options = {}) => {
        const c = client;
        if (!c) return;
        set({ busy: id, notice: null });
        try {
          const r = await c.start(id, options);
          if (!r.ok) set({ notice: r.error ?? `${id} did not start.` });
        } catch (e) {
          set({ notice: message(e) });
        }
        set({ busy: null });
        await get().refresh();
      },

      stopModule: async (id) => {
        const c = client;
        if (!c) return;
        set({ busy: id });
        try {
          await c.stop(id);
        } catch (e) {
          set({ notice: message(e) });
        }
        set({ busy: null });
        await get().refresh();
      },

      stopAll: async () => {
        const c = client;
        if (!c) return;
        try {
          await c.stopAll();
        } catch (e) {
          set({ notice: message(e) });
        }
        await get().refresh();
      },

      startPractice: async () => {
        get().stop();
        try {
          if (!practice) {
            const r = await fetch(PRACTICE_PI_URL);
            if (!r.ok) throw new Error(`the practice data could not be fetched (${r.status})`);
            const doc = (await r.json()) as Practice & { schema?: string };
            if (doc.schema !== 'flight-companion/practice-pi@1' || !Array.isArray(doc.frames)) throw new Error('the practice data is not in the form this app reads');
            practice = doc;
          }
        } catch (e) {
          set({ notice: message(e) });
          return;
        }
        const p = practice;
        let i = 0;
        set({ source: 'practice', link: 'connected', error: null, notice: null, now: EMPTY_NOW, at: {}, log: [] });
        const step = () => {
          const f = p.frames[i % p.frames.length];
          i += 1;
          const t = Date.now() / 1000;
          set({
            now: {
              ...EMPTY_NOW,
              scan: {
                angles: p.angles_deg, ranges_m: f.ranges_cm.map((c) => c / 100), hz: 10, points: f.ranges_cm.length,
                made_up: true, mount_measured: true, max_range_m: p.max_range_m,
              },
              detections: { items: f.detections, model: 'made-up', made_up: true, horizontal_fov_deg: p.horizontal_fov_deg },
              measure: { items: f.measure, lidar: true, made_up: true },
            },
            at: { scan: t, detections: t, measure: t },
          });
        };
        step();
        timer = setInterval(step, 1000 / p.hz);
      },

      stop: () => {
        halt();
        set({ source: 'off', link: 'idle', origin: null, hello: null, inventory: null, modules: [], status: null, now: EMPTY_NOW, at: {}, busy: null });
      },
    }),
    {
      name: 'fc-pi',
      // the address, the token and the tab are this browser's convenience; nothing the Pi saw is kept
      partialize: (s) => ({ address: s.address, token: s.token, tab: s.tab }),
    },
  ),
);

/** One line for the footer and the dashboard. */
export function piLine(s: Pick<PiState, 'source' | 'link' | 'hello' | 'status'>): string {
  if (s.source === 'off') return 'Not connected';
  if (s.source === 'practice') return 'Practice: made-up room';
  if (s.link === 'connecting') return 'Connecting';
  if (s.link === 'failed') return 'Could not connect';
  if (s.link === 'lost') return 'Link lost';
  const n = s.status ? Object.keys(s.status.running).length : 0;
  return `${s.hello?.name ?? 'Pi'} · ${s.hello?.level ?? ''} · ${n} running`;
}
