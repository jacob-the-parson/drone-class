// SlicerInventory — drawerLeftBottom panel: the
// replaced-cell asset list. Rows: pixelated thumb · name · hover Trash.
// Right-click = PopContext (Send to Vault / Remove) — per-tile sends carry tile
// dims (pipeline law). Sits directly above the Vault it feeds.
'use client';
import { useState } from 'react';
import { Archive, Package, Trash2 } from 'lucide-react';
import { useSlicerStore } from '@/stores/domains/slicerStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { PopContext } from '@/components/ui/PopContext';

type MenuState = { x: number; y: number; idx: string } | null;

export function SlicerInventory() {
  const tiles = useSlicerStore((s) => s.tiles);
  const removeTile = useSlicerStore((s) => s.removeTile);
  const gridConfig = useSlicerStore((s) => s.gridConfig);
  const addItem = useVaultStore((s) => s.addItem);
  const [menu, setMenu] = useState<MenuState>(null);

  const entries = Object.entries(tiles).filter(([, data]) => !data.isErased);

  const sendToVault = async (idx: string) => {
    const data = tiles[Number(idx)];
    if (!data) return;
    const blob = await fetch(data.url).then((r) => r.blob());
    await addItem(blob, {
      name: data.name ?? `slicer-slot-${idx}.png`,
      type: 'generation',
      mode: '2d',
      metadata: data.metadata ?? {
        prompt: '',
        prependTemplates: [],
        appendTemplates: [],
        width: gridConfig.tileWidth,
        height: gridConfig.tileHeight,
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-edge">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <Package size={13} className="text-orange-600 dark:text-orange-400" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Asset Inventory
        </h3>
        <span className="ml-auto text-[10px] text-ink-muted">({entries.length})</span>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {entries.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs italic text-ink-muted opacity-60">
            No replaced cells yet — drop or upload onto a grid cell.
          </div>
        ) : (
          entries.map(([idx, data]) => (
            <div
              key={idx}
              className="group flex cursor-context-menu items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-surface-sunken"
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, idx });
              }}
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-edge bg-control">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.url} alt={`Cell ${idx}`} className="h-full w-full object-cover" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="min-w-0 flex-1 truncate text-xs font-medium text-ink" title={data.name ?? `Slot ${idx}`}>
                {data.name ?? `Slot ${idx}`}
              </div>
              <button
                onClick={() => removeTile(Number(idx))}
                className="rounded p-1 text-ink-muted opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/30"
                title="Remove asset"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {menu && (
        <PopContext
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Send to Vault', icon: <Archive size={13} />, onClick: () => sendToVault(menu.idx) },
            { label: 'Remove', icon: <Trash2 size={13} />, danger: true, onClick: () => removeTile(Number(menu.idx)) },
          ]}
        />
      )}
    </div>
  );
}
