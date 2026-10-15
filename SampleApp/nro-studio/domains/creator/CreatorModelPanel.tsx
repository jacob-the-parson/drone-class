// CreatorModelPanel — drawerLeftBottom: model picker + live stats, above the
// Vault its captures land in.
'use client';
import { PersonStanding } from 'lucide-react';
import { DrawerStat } from '@/components/ui/DrawerSection';
import { useCreatorStore, type CreatorGender } from '@/stores/domains/creatorStore';
import { DIM_TEXT } from '@/components/ui/BadgeDim';

const GENDERS: { id: CreatorGender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

export function CreatorModelPanel() {
  const gender = useCreatorStore((s) => s.gender);
  const setGender = useCreatorStore((s) => s.setGender);
  const regions = useCreatorStore((s) => s.regions);
  const activeRegion = useCreatorStore((s) => s.activeRegion);
  const loadState = useCreatorStore((s) => s.loadState);

  const totalFaces = regions.reduce((sum, r) => sum + r.faces, 0);

  return (
    <div className="flex shrink-0 flex-col border-t border-edge">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <PersonStanding size={13} className="text-cyan-600 dark:text-cyan-400" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Model</h3>
        <span className={`ml-auto text-[10px] font-bold uppercase ${DIM_TEXT['3d']}`}>
          {loadState === 'ready' ? 'live' : loadState}
        </span>
      </div>
      <div className="space-y-2.5 px-3 pb-3">
        <div className="grid grid-cols-2 gap-1 rounded-md border border-edge-strong/15 bg-track p-1 dark:border-edge">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGender(g.id)}
              className={`rounded py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                gender === g.id
                  ? 'bg-surface-raised text-cyan-600 shadow-sm dark:text-cyan-400'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <DrawerStat label="Base" value={`body_${gender}_stylized`} />
        <DrawerStat label="Regions" value={regions.length} />
        <DrawerStat label="Faces" value={totalFaces.toLocaleString()} />
        <DrawerStat label="Selected" value={activeRegion ?? '—'} />
      </div>
    </div>
  );
}
