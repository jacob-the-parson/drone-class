// Small pieces shared by the Pi screen's views and drawer pages.
'use client';
import { Plug } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PiLevel } from '@/lib/pi/types';
import { usePiStore } from '@/stores/domains/piStore';

const INPUT = 'w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-rose-400';

export function PiConnectForm({ onConnect }: { onConnect: () => void }) {
  const address = usePiStore((s) => s.address);
  const token = usePiStore((s) => s.token);
  const setAddress = usePiStore((s) => s.setAddress);
  const setToken = usePiStore((s) => s.setToken);
  const secure = usePiStore((s) => s.secure);
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onConnect();
      }}
    >
      <label className="block text-xs text-ink-muted">
        The Pi&apos;s address
        <input className={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="192.168.0.130 or drone-pi.local" spellCheck={false} autoComplete="off" aria-label="The Pi’s address" />
      </label>
      <label className="block text-xs text-ink-muted">
        The token the bridge printed (needed to start and stop things; seeing needs none)
        <input className={`${INPUT} font-mono`} value={token} onChange={(e) => setToken(e.target.value)} placeholder="1a2b3c4d-5e6f7a8b" spellCheck={false} autoComplete="off" aria-label="Token" />
      </label>
      <button type="submit" disabled={secure} className="flex items-center gap-1.5 rounded-md border border-edge bg-control px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken disabled:opacity-50">
        <Plug size={13} /> Connect
      </button>
      {secure && <p className="text-xs text-ink-muted">This page came over https, and a browser will not let it reach a Pi over http. Use the desktop app.</p>}
      <p className="text-[11px] text-ink-muted">The address and the token are kept in this browser only.</p>
    </form>
  );
}

const LEVEL_TONE: Record<PiLevel, string> = {
  student: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  instructor: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  developer: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
};

export function LevelBadge({ level }: { level: PiLevel }) {
  return <span className={`rounded-full border px-2 py-px text-[10px] font-bold uppercase tracking-wider ${LEVEL_TONE[level]}`}>{level}</span>;
}

export function Card({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <section className="rounded-xl border border-edge bg-surface-raised p-3">
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-muted">{k}</dt>
          <dd className="min-w-0 truncate font-mono text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export const age = (t: number | undefined): string => (t === undefined ? 'never' : `${Math.max(0, Date.now() / 1000 - t).toFixed(1)} s ago`);
