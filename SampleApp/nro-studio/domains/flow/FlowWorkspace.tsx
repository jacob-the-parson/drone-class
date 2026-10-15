// FlowWorkspace — split-pane workspace: Source config | Target
// paint canvas, stacking on narrow screens (flow originated the mobile law).
'use client';
import { FlowSourcePanel } from './FlowSourcePanel';
import { FlowTargetPanel } from './FlowTargetPanel';

export function FlowWorkspace() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      <FlowSourcePanel />
      <FlowTargetPanel />
    </div>
  );
}
