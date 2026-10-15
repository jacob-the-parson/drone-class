// FooterUser — the left drawer's permanent bottom row:
// [ avatar+PopMenu ] [ name + status light ] [ theme switcher ]
// Avatar opens PopMenu (up) -> Profile (ModalProfile) / Sign out.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { useAuthStore } from '@/stores/core/authStore';
import { useThemeStore } from '@/stores/core/themeStore';
import { PopMenu } from '@/components/ui/PopMenu';
import { ModalProfile } from './ModalProfile';

export function FooterUser() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-sunken';

  return (
    <div className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-edge px-3">
      {/* col 1 — avatar, the PopMenu trigger */}
      <PopMenu
        direction="up"
        trigger={
          <button
            aria-label="User menu"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-high text-sm font-semibold text-secondary-shadow transition-transform hover:scale-105"
          >
            {userProfile?.name.charAt(0).toUpperCase() ?? 'U'}
          </button>
        }
      >
        <button className={`${item} text-ink`} onClick={() => setProfileOpen(true)}>
          <User size={13} /> Profile
        </button>
        <button className={`${item} text-red-600 dark:text-red-400`} onClick={handleSignOut}>
          <LogOut size={13} /> Sign out
        </button>
      </PopMenu>

      {/* col 2 — name + role + status light */}
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 truncate text-xs font-medium text-ink">
          {userProfile?.name ?? 'User'}
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" title="Online" />
        </span>
        <span className="truncate text-[10px] text-ink-muted">{userProfile?.role ?? 'Guest'}</span>
      </div>

      {/* col 3 — light/dark switcher */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <ModalProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
