// Template3dOutliner — the 3D sample's drawerLeftBottom panel: a Blender-style
// scene outliner that REUSES DrawerLayerList — the same primitive that drives
// 2D paint layers drives 3D scene objects. Eye toggles hide/show live objects;
// selecting the torus gives it an emissive highlight in the viewport.
'use client';
import { Box, Grid3X3, ListTree, Sun } from 'lucide-react';
import { DrawerLayerList } from '@/components/ui/DrawerLayerList';
import { useTemplate3dStore, type SceneObjectId } from '@/stores/domains/template3dStore';

const OBJECTS: { id: SceneObjectId; label: string; icon: React.ReactNode }[] = [
  { id: 'torus', label: 'torus.sample', icon: <Box size={12} /> },
  { id: 'grid', label: 'grid.floor', icon: <Grid3X3 size={12} /> },
  { id: 'sun', label: 'light.sun', icon: <Sun size={12} /> },
];

export function Template3dOutliner() {
  const objects = useTemplate3dStore((s) => s.objects);
  const activeObject = useTemplate3dStore((s) => s.activeObject);
  const toggleObject = useTemplate3dStore((s) => s.toggleObject);
  const setActiveObject = useTemplate3dStore((s) => s.setActiveObject);

  return (
    <div className="flex shrink-0 flex-col border-t border-edge">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <ListTree size={13} className="text-orange-500 dark:text-orange-400" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Scene Outliner
        </h3>
      </div>
      <div className="px-3 pb-3">
        <DrawerLayerList
          layers={OBJECTS.map((o) => ({
            id: o.id,
            label: o.label,
            visible: objects[o.id],
            icon: o.icon,
          }))}
          activeId={activeObject}
          onSelect={(id) => setActiveObject(activeObject === id ? null : (id as SceneObjectId))}
          onToggleVisibility={(id) => toggleObject(id as SceneObjectId)}
          activeClass="border-orange-400 bg-orange-50/60 text-ink dark:border-orange-600 dark:bg-orange-900/20"
        />
        <p className="mt-1.5 text-[10px] leading-snug text-ink-muted opacity-70">
          Same DrawerLayerList as the 2D layers — one primitive, both dimensions.
        </p>
      </div>
    </div>
  );
}
