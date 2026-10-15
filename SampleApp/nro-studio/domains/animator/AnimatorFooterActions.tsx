// AnimatorFooterActions — footer shape [Grid][Index][reserved][Clear][Vault].
// Grid + Index are LIVE store toggles driving the canvas
// (amber accent when on). Clear/Vault stay staged until sequence data exists.
'use client';
import { Grid3X3, Hash } from 'lucide-react';
import { useAnimatorStore } from '@/stores/domains/animatorStore';
import { StagedAction } from '@/components/ui/StagedShell';
import { Download, Trash2 } from 'lucide-react';

const ON = 'text-amber-600 dark:text-amber-400';

export function AnimatorGridAction() {
  const showGrid = useAnimatorStore((s) => s.showGrid);
  const toggleGrid = useAnimatorStore((s) => s.toggleGrid);
  return (
    <button
      onClick={toggleGrid}
      className={`group flex h-full w-full cursor-pointer items-center justify-center gap-1.5 outline-none transition-colors hover:bg-control ${showGrid ? ON : ''}`}
      title={`Grid overlay ${showGrid ? 'on' : 'off'}`}
    >
      <Grid3X3 size={13} className="transition-transform group-hover:-translate-y-0.5" />
      <span className="font-medium uppercase tracking-wide">Grid</span>
    </button>
  );
}

export function AnimatorIndexAction() {
  const showIndexes = useAnimatorStore((s) => s.showIndexes);
  const toggleIndexes = useAnimatorStore((s) => s.toggleIndexes);
  return (
    <button
      onClick={toggleIndexes}
      className={`group flex h-full w-full cursor-pointer items-center justify-center gap-1.5 outline-none transition-colors hover:bg-control ${showIndexes ? ON : ''}`}
      title={`Frame indexes ${showIndexes ? 'on' : 'off'}`}
    >
      <Hash size={13} className="transition-transform group-hover:-translate-y-0.5" />
      <span className="font-medium uppercase tracking-wide">Index</span>
    </button>
  );
}

export function AnimatorClearStaged() {
  return <StagedAction icon={Trash2} label="Canvas" pending="pending sequence wiring" />;
}

export function AnimatorVaultStaged() {
  return <StagedAction icon={Download} label="Vault" pending="pending sheet + JSON export mapping" />;
}
