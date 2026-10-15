// Talking to the bridge on a Pi (pi/bridge.py), from the page.
//
// Reading is GET, and the live picture of what the Pi sees comes as Server-Sent
// Events. Starting and stopping a module is POST with the token the bridge printed.
// Nothing here talks to an aircraft: whatever reaches an autopilot is sent by the Pi,
// by a module a person started.
//
// In the desktop app the page may reach only the one Pi address it was given: the
// main process lets that one through and no other (desktop/main.ts, pi:allow).
import type { PiHello, PiInventory, PiKind, PiLogLine, PiModule, PiStatus } from './types.ts';
import { PI_KINDS } from './types.ts';

const API = '/api/v1';

export class PiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.status = status;
  }
}

async function json<T>(r: Response): Promise<T> {
  const text = await r.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new PiError(`The Pi answered with something that is not JSON (${r.status}).`, r.status);
  }
  if (!r.ok) {
    const e = (body as { error?: string } | null)?.error;
    throw new PiError(e ?? `The Pi said ${r.status}.`, r.status);
  }
  return body as T;
}

export interface PiEvents {
  onKind: (kind: PiKind, data: unknown, at: number) => void;
  onModules: (status: PiStatus) => void;
  onLog: (line: PiLogLine) => void;
  onOpen: () => void;
  onLost: () => void;
}

export class PiClient {
  private source: EventSource | null = null;
  readonly origin: string;
  private token: string;

  constructor(origin: string, token: string) {
    this.origin = origin;
    this.token = token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  private async get<T>(path: string): Promise<T> {
    let r: Response;
    try {
      r = await fetch(`${this.origin}${API}${path}`, { cache: 'no-store' });
    } catch {
      throw new PiError(`Nothing answered at ${this.origin}. Is the Pi on, is the bridge running, and is this computer on the same network?`);
    }
    return json<T>(r);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.token.trim()) throw new PiError('Type the token the bridge printed when it started.');
    let r: Response;
    try {
      r = await fetch(`${this.origin}${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FC-Token': this.token.trim() },
        body: JSON.stringify(body ?? {}),
      });
    } catch {
      throw new PiError(`Nothing answered at ${this.origin}.`);
    }
    return json<T>(r);
  }

  hello(): Promise<PiHello> {
    return this.get<PiHello>('/hello');
  }

  inventory(): Promise<PiInventory> {
    return this.get<PiInventory>('/inventory');
  }

  modules(): Promise<{ level: string; modules: PiModule[]; status: PiStatus }> {
    return this.get('/modules');
  }

  start(id: string, options: Record<string, unknown> = {}): Promise<{ ok: boolean; error?: string }> {
    return this.post(`/modules/${encodeURIComponent(id)}/start`, { options });
  }

  stop(id: string): Promise<{ ok: boolean }> {
    return this.post(`/modules/${encodeURIComponent(id)}/stop`, {});
  }

  stopAll(): Promise<{ ok: boolean }> {
    return this.post('/stop-all', {});
  }

  pictureUrl(): string {
    return `${this.origin}${API}/picture.jpg?t=${Date.now()}`;
  }

  /** Open the live stream. Calls `onLost` if it drops; EventSource tries again by itself. */
  listen(e: PiEvents): void {
    this.close();
    if (typeof EventSource === 'undefined') {
      e.onLost();
      return;
    }
    const s = new EventSource(`${this.origin}${API}/events`);
    this.source = s;
    s.onopen = () => e.onOpen();
    s.onerror = () => e.onLost();
    const read = (ev: MessageEvent) => {
      try {
        return JSON.parse(ev.data as string) as { t?: number; data?: unknown };
      } catch {
        return null;
      }
    };
    for (const kind of PI_KINDS) {
      s.addEventListener(kind, (ev) => {
        const item = read(ev as MessageEvent);
        if (item) e.onKind(kind, item.data, item.t ?? Date.now() / 1000);
      });
    }
    s.addEventListener('modules', (ev) => {
      const item = read(ev as MessageEvent);
      if (item) e.onModules(item.data as PiStatus);
    });
    s.addEventListener('log', (ev) => {
      const item = read(ev as MessageEvent);
      if (item) e.onLog(item as unknown as PiLogLine);
    });
  }

  close(): void {
    this.source?.close();
    this.source = null;
  }
}

/** What the desktop app offers: let the page reach one Pi address. Absent in a browser. */
export interface PiBridge {
  version: number;
  allow: (origin: string) => Promise<{ ok: boolean; origin?: string; error?: string }>;
}

export function piBridge(): PiBridge | null {
  if (typeof window === 'undefined') return null;
  const b = (window as unknown as { flightCompanion?: { pi?: PiBridge } }).flightCompanion?.pi;
  return b && typeof b.allow === 'function' ? b : null;
}
