// TemplateSlotsPage — the per-domain LEFT-BOTTOM panel:
// non-pageable, mounts between favorites and the Vault. Panels
// bring their own sticky mini-header (the inventory convention).
'use client';
import { CheckCircle2, Circle, ClipboardList, Inbox } from 'lucide-react';
import { useTemplateStore } from '@/stores/domains/templateStore';

export function TemplateSlotsPage() {
  const checklist = useTemplateStore((s) => s.checklist);
  const receivedItem = useTemplateStore((s) => s.receivedItem);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-edge bg-surface-raised/95 px-3 py-2">
        <ClipboardList size={13} className="text-pink-500" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Template Slots
        </h3>
      </div>
      <div className="space-y-1 p-2">
      {checklist.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink-muted"
        >
          {item.done ? (
            <CheckCircle2 size={14} className="shrink-0 text-pink-500" />
          ) : (
            <Circle size={14} className="shrink-0 text-ink-muted/50" />
          )}
          <span className="truncate">{item.label}</span>
        </div>
      ))}
      {/* live proof of the Vault send-row accept hook */}
      <div className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-edge px-2 py-1.5 text-xs text-ink-muted">
        <Inbox size={14} className={receivedItem ? 'shrink-0 text-pink-500' : 'shrink-0 opacity-50'} />
        {receivedItem ? (
          <span className="truncate">
            Received: <span className="font-medium text-ink">{receivedItem.name}</span>{' '}
            ({receivedItem.mode.toUpperCase()})
          </span>
        ) : (
          <span className="italic opacity-60">No vault drop yet</span>
        )}
      </div>
      </div>
    </div>
  );
}
