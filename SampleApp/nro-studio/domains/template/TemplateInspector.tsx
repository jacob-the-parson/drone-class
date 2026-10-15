// TemplateInspector — right drawer page, and the LIVING DEMO of the drawer
// primitives: DrawerSection/DrawerStat/DrawerListRow + the tri-part CardSettings.
'use client';
import { Braces, FileCode2, Palette, Rows3, Settings2 } from 'lucide-react';
import { useTemplateStore } from '@/stores/domains/templateStore';
import { DrawerSection, DrawerStat, DrawerListRow, DrawerField } from '@/components/ui/DrawerSection';
import { CardSettings } from '@/components/ui/CardSettings';

const slotRows: [string, string][] = [
  ['route/page.tsx', 'Required'],
  ['drawerLeftBottom', 'Optional'],
  ['drawerRight', 'Optional'],
  ['shellFooter', 'Optional'],
  ['settingsBody', 'Optional'],
];

const ACCENT_PRESETS = [
  { id: 'pink', label: 'Pink (default)', value: '#db2777' },
  { id: 'violet', label: 'Violet', value: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald', value: '#10b981' },
  { id: 'orange', label: 'Orange', value: '#f97316' },
];

function AccentModal({ close }: { close: () => void }) {
  const accentColor = useTemplateStore((s) => s.accentColor);
  const setAccentColor = useTemplateStore((s) => s.setAccentColor);
  const templateName = useTemplateStore((s) => s.templateName);
  const setTemplateName = useTemplateStore((s) => s.setTemplateName);

  return (
    <div className="space-y-4">
      <DrawerField label="Template name">
        <input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full rounded-md border border-edge bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
        />
      </DrawerField>
      <DrawerField label="Accent color">
        <input
          type="color"
          value={accentColor}
          onChange={(e) => setAccentColor(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-edge bg-surface-raised p-1"
        />
      </DrawerField>
      <button
        onClick={close}
        className="w-full rounded-md bg-secondary py-2 text-sm font-medium text-white transition-colors hover:bg-secondary-shadow"
      >
        Done
      </button>
    </div>
  );
}

export function TemplateInspector() {
  const templateName = useTemplateStore((s) => s.templateName);
  const accentColor = useTemplateStore((s) => s.accentColor);
  const setAccentColor = useTemplateStore((s) => s.setAccentColor);
  const checklist = useTemplateStore((s) => s.checklist);
  const completeCount = checklist.filter((item) => item.done).length;

  return (
    <div className="space-y-6 p-4">
      <DrawerSection title="Identity" first>
        <div className="rounded-lg border border-edge bg-control/60 p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-md bg-pink-100 p-2 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400">
              <Braces size={16} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-ink">{templateName}</div>
              <div className="font-mono text-[11px] text-ink-muted">template</div>
            </div>
          </div>
          <DrawerStat label="Checklist" value={`${completeCount}/${checklist.length}`} />
          <DrawerStat
            label="Accent"
            value={
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border border-edge" style={{ background: accentColor }} />
                {accentColor}
              </span>
            }
          />
        </div>
      </DrawerSection>

      {/* the tri-part CardSettings, demonstrated */}
      <DrawerSection title="Card Settings demo">
        <CardSettings
          title="Accent Presets"
          icon={Palette}
          presets={ACCENT_PRESETS.map((p) => ({
            id: p.id,
            label: p.label,
            hint: p.value,
            onApply: () => setAccentColor(p.value),
          }))}
          modalTitle="Template identity"
          modalBody={AccentModal}
        >
          <p className="text-[11px] text-ink-muted">
            Three-dot = quick presets · header = deep modal. The Stitcher card pattern.
          </p>
        </CardSettings>
      </DrawerSection>

      <DrawerSection title="Registry Slots">
        <div className="space-y-2">
          {slotRows.map(([name, status]) => (
            <DrawerListRow
              key={name}
              label={<span className="font-mono">{name}</span>}
              trailing={
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {status}
                </span>
              }
            />
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title="Files">
        <div className="space-y-2">
          {(
            [
              [FileCode2, 'template.manifest.tsx'],
              [Rows3, 'TemplateFooterActions.tsx'],
              [Settings2, 'templateStore.ts'],
            ] as const
          ).map(([Icon, name]) => (
            <DrawerListRow key={name} icon={<Icon size={14} />} label={name} />
          ))}
        </div>
      </DrawerSection>
    </div>
  );
}
