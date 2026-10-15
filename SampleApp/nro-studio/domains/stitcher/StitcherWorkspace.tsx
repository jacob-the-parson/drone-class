// StitcherWorkspace — the SPLIT-PANE archetype (+ flow's mobile law):
// Source | Target panes side by side, stacking vertically on narrow screens.
// Panes are workspace-internal, never registry slots.
'use client';
import { StitcherSourcePanel } from './StitcherSourcePanel';
import { StitcherTargetPanel } from './StitcherTargetPanel';

export function StitcherWorkspace() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      <StitcherSourcePanel />
      <StitcherTargetPanel />
    </div>
  );
}
