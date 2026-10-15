// TemplateSettings — settings sub-area body: store-connected inputs.
'use client';
import { Braces } from 'lucide-react';
import { useTemplateStore } from '@/stores/domains/templateStore';

export function TemplateSettings() {
  const templateName = useTemplateStore((s) => s.templateName);
  const accentColor = useTemplateStore((s) => s.accentColor);
  const setTemplateName = useTemplateStore((s) => s.setTemplateName);
  const setAccentColor = useTemplateStore((s) => s.setAccentColor);

  return (
    <div className="flex items-start gap-4">
      <div className="rounded-full bg-pink-100 p-3 dark:bg-pink-900/40">
        <Braces size={24} className="text-pink-600 dark:text-pink-400" />
      </div>
      <div className="min-w-0 flex-1 space-y-5">
        <div>
          <h3 className="mb-1 text-lg font-medium text-ink">Domain Template Settings</h3>
          <p className="text-sm text-ink-muted">
            Intentionally simple, connected to the template store.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Template Name
            </span>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full rounded-md border border-edge bg-surface-raised px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Accent
            </span>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border border-edge bg-surface-raised p-1"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
