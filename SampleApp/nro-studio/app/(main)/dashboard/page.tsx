// Dashboard — centered domain cards (icon chip, star
// favorite, hover border in the domain's accent) + the token style-guide strip
// below (temporary living reference until a design-system page exists).
'use client';
import Link from 'next/link';
import { House, Star } from 'lucide-react';
import { APP_REGISTRY } from '@/lib/registry';
import { BadgeDim, DIM_TEXT } from '@/components/ui/BadgeDim';
import { useFavoritesStore } from '@/stores/core/favoritesStore';

export default function DashboardPage() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const cards = APP_REGISTRY.filter((a) => a.navigation.showInDashboard);

  // category sections: 2D apps · 3D apps · platform (no dimension)
  const sections = [
    { label: '2D Apps', labelClass: DIM_TEXT['2d'], apps: cards.filter((a) => a.dimension === '2d') },
    { label: '3D Apps', labelClass: DIM_TEXT['3d'], apps: cards.filter((a) => a.dimension === '3d') },
    { label: 'Platform', labelClass: 'text-ink-muted', apps: cards.filter((a) => !a.dimension) },
  ].filter((s) => s.apps.length > 0);

  return (
    <main className="h-full w-full overflow-y-auto p-8 transition-colors duration-200">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 flex items-center gap-3 text-2xl font-semibold text-ink">
          <House size={22} className="text-ink-muted" />
          Dashboard
        </h1>

        {sections.map((section) => (
          <section key={section.label} className="mb-8">
            <h2 className={`mb-3 text-[11px] font-bold uppercase tracking-widest ${section.labelClass}`}>
              {section.label}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {section.apps.map((app) => {
            const isFavorite = favorites.includes(app.id);
            return (
              <Link
                key={app.id}
                href={`/${app.route}`}
                className={`group relative flex cursor-pointer flex-col items-center gap-4 rounded-xl border border-edge bg-surface-raised p-6 text-center shadow-sm transition-all hover:shadow-md ${app.theme.hoverBorder}`}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(app.id);
                  }}
                  className={`absolute right-4 top-4 rounded-full p-2 transition-colors ${
                    isFavorite
                      ? 'text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-500/10'
                      : 'text-ink-muted/40 hover:bg-surface-sunken hover:text-yellow-500'
                  }`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>

                {app.dimension && (
                  <BadgeDim dim={app.dimension} className="absolute left-4 top-4 px-2" />
                )}

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${app.theme.bgClass}`}
                >
                  <app.icon size={32} className={app.theme.colorClass} />
                </div>
                <div>
                  <h2 className="mb-1 text-lg font-semibold text-ink">{app.name}</h2>
                  <p className="text-sm text-ink-muted">{app.description}</p>
                </div>
              </Link>
            );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
