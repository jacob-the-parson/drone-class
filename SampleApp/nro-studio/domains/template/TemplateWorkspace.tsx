// TemplateWorkspace — center surface:
// slot cards + the shared-store readiness checklist.
'use client';
import { Braces, CheckCircle2, LayoutPanelTop, PanelLeft, PanelRight, Rows3 } from 'lucide-react';
import { useTemplateStore } from '@/stores/domains/templateStore';

const templateCards = [
  { title: 'Workspace', description: 'The routed page — the domain’s center surface.', icon: LayoutPanelTop },
  { title: 'Left Drawer', description: 'Optional tool pages above Storage in the left unit.', icon: PanelLeft },
  { title: 'Right Drawer', description: 'Optional inspector/properties pages, paginated.', icon: PanelRight },
  { title: 'Shell Footer', description: 'Five optional keycap tabs with stable N/A fallback.', icon: Rows3 },
];

export function TemplateWorkspace() {
  const templateName = useTemplateStore((s) => s.templateName);
  const checklist = useTemplateStore((s) => s.checklist);
  const toggleChecklistItem = useTemplateStore((s) => s.toggleChecklistItem);

  return (
    <div className="h-full overflow-y-auto transition-colors duration-200">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-pink-100 p-4 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400">
            <Braces size={32} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-400">
              Reusable Domain Scaffold
            </p>
            <h2 className="text-2xl font-semibold text-ink">{templateName}</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {templateCards.map(({ title, description, icon: Icon }) => (
            <div key={title} className="vibe-card p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                <Icon size={20} />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-ink">{title}</h3>
              <p className="text-sm leading-6 text-ink-muted">{description}</p>
            </div>
          ))}
        </div>

        <div className="vibe-card mt-6 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Template Readiness</h3>
              <p className="text-sm text-ink-muted">
                Shared checklist state proves each slot connects to one domain store.
              </p>
            </div>
            <CheckCircle2 size={20} className="shrink-0 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  item.done
                    ? 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/60 dark:bg-pink-900/20 dark:text-pink-300'
                    : 'border-edge bg-control/60 text-ink-muted hover:border-pink-200 dark:hover:border-pink-900/60'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    item.done ? 'border-pink-500 bg-pink-500 text-white' : 'border-edge'
                  }`}
                >
                  {item.done && <CheckCircle2 size={14} />}
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
