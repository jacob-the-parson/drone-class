// ShellHeader — the RIGHT-COLUMN header, itself an island (rounded + vibe
// shadow) matching the workspace. The breadcrumb is centered on the WORKSPACE
// island's center line, not the screen: it lives in-header (so it follows the
// left unit's animated width for free) and springs left by half the right
// drawer's footprint when that drawer opens.
// Crumb = House pill (highlighted on /dashboard, quick-click home from any
// domain; icon-only below sm) · '>' + domain crumb when off-dashboard.
// Compact tier regains a hamburger + brand (no rail there).
'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { House, PanelRight, PanelRightClose } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { BadgeDim } from '@/components/ui/BadgeDim';
import { useShellStore } from '@/stores/core/shellStore';

const SPRING = { type: 'spring', bounce: 0.2, duration: 0.5 } as const;
const RIGHT_W = 288; // keep in sync with Shell.tsx
const GAP = 12; // the drawer island's mr-3

export function ShellHeader({ app }: { app: AppDefinition }) {
  const tier = useShellStore((s) => s.tier);
  const rightOpen = useShellStore((s) => s.rightOpen);
  const toggleDrawer = useShellStore((s) => s.toggleDrawer);
  const compact = tier === 'compact';
  const onDashboard = app.id === 'dashboard';

  // workspace center vs header center: shifted left by half the right drawer
  // footprint when it's open in-flow (compact drawers overlay — no shift)
  const crumbShift = rightOpen && !compact ? -(RIGHT_W + GAP) / 2 : 0;

  return (
    <header className="relative z-40 mx-3 mt-3 flex h-12 shrink-0 items-center justify-between rounded-xl border border-edge bg-surface-raised/85 px-3 shadow-vibe">
      <div className="flex items-center gap-3">
        {compact && (
          <button
            onClick={() => toggleDrawer('left')}
            aria-label="Open panel"
            className="flex h-7 w-7 rotate-12 items-center justify-center rounded bg-secondary transition-transform hover:scale-105"
          >
            <span className="-rotate-12 text-[9px] font-bold text-white">NX</span>
          </button>
        )}
      </div>

      <button
        onClick={() => toggleDrawer('right')}
        className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-sunken"
        aria-label="Toggle right drawer"
      >
        {rightOpen ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
      </button>

      {/* breadcrumb — rides the workspace island's center line */}
      <motion.div
        animate={{ x: crumbShift }}
        transition={SPRING}
        className="pointer-events-none absolute inset-y-0 left-1/2 flex items-center"
      >
        <div className="pointer-events-auto flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap text-xs text-ink-muted">
          <Link
            href="/dashboard"
            title="Dashboard"
            className={`flex items-center justify-center rounded-lg px-2 py-1.5 transition-all duration-200 sm:rounded-full sm:px-3 ${
              onDashboard
                ? 'bg-secondary/15 text-secondary'
                : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
            }`}
          >
            <House size={14} className={onDashboard ? 'fill-current' : ''} />
            <span className="ml-1.5 hidden text-[10px] font-semibold uppercase tracking-wide sm:inline">
              Dashboard
            </span>
          </Link>
          {!onDashboard && (
            <>
              <span className="select-none">&gt;</span>
              <app.icon size={14} className={app.theme.colorClass} />
              <span className="font-medium text-ink">{app.name}</span>
              {app.dimension && <BadgeDim dim={app.dimension} />}
            </>
          )}
        </div>
      </motion.div>
    </header>
  );
}
