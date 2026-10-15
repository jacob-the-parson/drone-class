// Settings — chevron-cycler tab bar; GLOBAL sub-area
// (interface preferences: theme/vibe + the token reference) + one sub-area per
// domain that declares manifest.settingsBody.
'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, Moon, Settings, Sun } from 'lucide-react';
import { APP_REGISTRY } from '@/lib/registry';
import { useThemeStore, type Vibe } from '@/stores/core/themeStore';

const VIBES: { id: Vibe; label: string; hint: string }[] = [
  { id: 'soft', label: 'Soft', hint: 'soft shadows · soft edges' },
  { id: 'toon', label: 'Toon', hint: '3-tone · ink outlines · stepped shadows' },
];

const TRIPLETS = [
  { name: 'primary', tones: ['bg-primary-shadow', 'bg-primary', 'bg-primary-high'] },
  { name: 'secondary', tones: ['bg-secondary-shadow', 'bg-secondary', 'bg-secondary-high'] },
  { name: 'tertiary', tones: ['bg-tertiary-shadow', 'bg-tertiary', 'bg-tertiary-high'] },
];

function GlobalSettings() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const vibe = useThemeStore((s) => s.vibe);
  const setVibe = useThemeStore((s) => s.setVibe);

  return (
    <div className="space-y-6">
      {/* interface preferences */}
      <section className="vibe-card space-y-4 p-5">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
          Interface
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Theme</p>
            <p className="text-xs text-ink-muted">Light / dark surfaces</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-md border border-edge px-3 py-1.5 text-xs text-ink shadow-sm transition-colors hover:bg-surface-sunken"
          >
            {isDark ? <Moon size={13} /> : <Sun size={13} />}
            {isDark ? 'Dark' : 'Light'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Vibe</p>
            <p className="text-xs text-ink-muted">Treatment: shadows, edges, outlines</p>
          </div>
          <div className="flex gap-1 rounded-md border border-edge-strong/15 bg-track p-1 dark:border-edge">
            {VIBES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVibe(v.id)}
                title={v.hint}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  vibe === v.id
                    ? 'bg-surface-raised text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* token reference */}
      <section className="vibe-card space-y-4 p-5">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
          Design tokens · 3-tone triplets
        </h2>
        {TRIPLETS.map((t) => (
          <div key={t.name} className="flex items-center gap-3">
            <span className="w-20 text-xs font-medium capitalize text-ink">{t.name}</span>
            <div className="flex overflow-hidden rounded-md border border-edge">
              {t.tones.map((tone) => (
                <div key={tone} className={`h-8 w-16 ${tone}`} title={tone} />
              ))}
            </div>
            <span className="text-[10px] text-ink-muted">shadow · base · high</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-3 border-t border-edge pt-4">
          <button className="vibe-btn bg-secondary text-white hover:bg-secondary-shadow">
            Secondary
          </button>
          <button className="vibe-btn bg-primary text-white hover:bg-primary-shadow">Primary</button>
          <button className="vibe-btn bg-tertiary text-white hover:bg-tertiary-shadow">
            Tertiary
          </button>
          <button className="vibe-btn bg-surface-raised text-ink hover:bg-surface-sunken">
            Neutral
          </button>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('global');

  const domainTabs = APP_REGISTRY.filter((a) => a.navigation.showInSettings);
  const tabs = [
    { id: 'global', label: 'Global', icon: <Globe size={14} className="text-ink-muted" /> },
    ...domainTabs.map((app) => ({
      id: app.id,
      label: app.name,
      icon: <app.icon size={14} className={app.theme.colorClass} />,
    })),
  ];

  const index = tabs.findIndex((t) => t.id === activeTab);
  const cycle = (dir: 1 | -1) =>
    setActiveTab(tabs[(index + dir + tabs.length) % tabs.length].id);

  const ActiveBody = domainTabs.find((a) => a.id === activeTab)?.settingsBody;

  return (
    <main className="h-full w-full overflow-y-auto p-8 transition-colors duration-200">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-ink">
            <Settings size={22} className="text-ink-muted" />
            Settings
          </h1>

          {/* the tab cycler */}
          <div className="flex items-center gap-3 rounded-lg border border-edge bg-surface-raised p-1 shadow-sm transition-colors duration-200">
            <button
              onClick={() => cycle(-1)}
              className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-sunken"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="flex min-w-32 select-none items-center justify-center gap-2 text-sm font-medium text-ink">
              {tabs[index].icon}
              {tabs[index].label}
            </span>
            <button
              onClick={() => cycle(1)}
              className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-sunken"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {activeTab === 'global' ? (
          <GlobalSettings />
        ) : (
          <div className="vibe-card p-5">{ActiveBody ? <ActiveBody /> : null}</div>
        )}
      </div>
    </main>
  );
}
