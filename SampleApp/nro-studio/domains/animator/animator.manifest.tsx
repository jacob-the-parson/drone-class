// Animator — the FIFTH domain port (the staging-law original): dimension
// cards + ANIM_GRID canvas live; sequence/playback stays staged by intent
// (slice order = ANIMATOR-PLAN). Grid/Index footer toggles are REAL.
'use client';
import { Clapperboard, Film } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { AnimatorCellsPanel } from './AnimatorCellsPanel';
import { AnimatorViewerPage } from './AnimatorViewerPage';
import {
  AnimatorGridAction,
  AnimatorIndexAction,
  AnimatorClearStaged,
  AnimatorVaultStaged,
} from './AnimatorFooterActions';
import { StagedSettings } from '@/components/ui/StagedShell';

const AnimatorSettingsStaged = () => <StagedSettings name="Animator" />;

export const animator: AppDefinition = {
  id: 'animator',
  route: 'animator',
  name: 'Animator',
  description: 'Assemble spritesheets into playable animation sequences.',
  icon: Film,
  theme: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/40',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500',
  },
  dimension: '2d',
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  drawerLeftBottom: AnimatorCellsPanel,
  drawerRight: {
    pages: [{ id: 'viewer', title: 'Viewer', icon: Clapperboard, content: AnimatorViewerPage }],
  },
  // footer shape: [Grid][Index][reserved][Clear(staged)][Vault(staged)]
  shellFooter: [
    AnimatorGridAction,
    AnimatorIndexAction,
    null,
    AnimatorClearStaged,
    AnimatorVaultStaged,
  ],
  settingsBody: AnimatorSettingsStaged,
};
