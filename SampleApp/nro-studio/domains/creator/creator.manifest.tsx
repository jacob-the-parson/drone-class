// Character Creator — THE FIRST REAL 3D DOMAIN (template3d's first copy; the
// nro-three seed re-expressed in the studio chrome). EON base bodies from the
// served asset library, live per-region recolor via the baked ID maps.
'use client';
import { Palette, PersonStanding } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { CreatorRegionsPage } from './CreatorRegionsPage';
import { CreatorModelPanel } from './CreatorModelPanel';
import {
  CreatorSpinAction,
  CreatorInkAction,
  CreatorResetAction,
  CreatorVaultAction,
} from './CreatorFooterActions';
import { CreatorSettings } from './CreatorSettings';

export const creator: AppDefinition = {
  id: 'creator',
  route: 'creator',
  name: 'Character Creator',
  description: 'EON base bodies — live per-region recolor through the baked ID maps.',
  icon: PersonStanding,
  theme: {
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-50 dark:bg-cyan-900/40',
    hoverBorder: 'hover:border-cyan-300 dark:hover:border-cyan-500',
  },
  dimension: '3d',
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  drawerLeftBottom: CreatorModelPanel,
  drawerRight: {
    title: 'Regions',
    icon: Palette,
    pages: [{ id: 'regions', title: 'Regions', icon: Palette, content: CreatorRegionsPage }],
  },
  // footer shape: [domain][domain][CENTER reserved][trash-Reset][Vault]
  shellFooter: [CreatorSpinAction, CreatorInkAction, null, CreatorResetAction, CreatorVaultAction],
  settingsBody: CreatorSettings,
};
