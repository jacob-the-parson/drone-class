// CanvaisObjectsPanel — drawerLeftBottom: the canvas
// objects list. Thumb rows, click = select (Transformer follows), hover trash.
'use client';
import { Shapes, Trash2 } from 'lucide-react';
import { useCanvaisStore } from '@/stores/domains/canvaisStore';

export function CanvaisObjectsPanel() {
  const items = useCanvaisStore((s) => s.items);
  const selectedId = useCanvaisStore((s) => s.selectedId);
  const setSelectedId = useCanvaisStore((s) => s.setSelectedId);
  const setItems = useCanvaisStore((s) => s.setItems);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-edge">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <Shapes size={13} className="text-blue-600 dark:text-blue-400" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Canvas Objects
        </h3>
        <span className="ml-auto text-[10px] text-ink-muted">({items.length})</span>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {items.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs italic text-ink-muted opacity-60">
            No objects — drop images on the stage.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`group flex cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-xs transition-colors ${
                selectedId === item.id
                  ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              <div className="checker-bg h-6 w-6 shrink-0 overflow-hidden rounded border border-edge">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="min-w-0 flex-1 truncate">Image {index + 1}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setItems((prev) => prev.filter((i) => i.id !== item.id));
                }}
                className="rounded p-1 text-ink-muted opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/30"
                title="Remove object"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
