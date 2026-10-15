// Stitcher — the SECOND domain port: compile tiles into master sheets.
// Split-pane workspace (Source | Target), CardSettings cards in the Tools
// drawer (the pattern's birthplace, now running on the primitive).
'use client';
import { Grid2X2, LayoutGrid } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { StitcherGridPage } from './StitcherGridPage';
import { StitcherClearAction, StitcherExportAction } from './StitcherFooterActions';
import { useStitcherStore } from '@/stores/domains/stitcherStore';
import { StagedSettings } from '@/components/ui/StagedShell';

const StitcherSettingsStaged = () => <StagedSettings name="Stitcher" />;

export const stitcher: AppDefinition = {
  id: 'stitcher',
  route: 'stitcher',
  name: 'Stitcher',
  description: 'Compile and arrange generated tiles into master spritesheets.',
  icon: Grid2X2,
  theme: {
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-900/40',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-500',
  },
  dimension: '2d',
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  drawerRight: {
    pages: [{ id: 'grid', title: 'Grid', icon: LayoutGrid, content: StitcherGridPage }],
  },
  // footer shape: [domain][domain][CENTER reserved][trash-Clear][Vault]
  shellFooter: [null, null, null, StitcherClearAction, StitcherExportAction],
  settingsBody: StitcherSettingsStaged,
  // Vault send-row: 2D images arrive as SOURCE SHEETS
  accepts: {
    modes: ['2d'],
    handler: (item) => {
      if (item.url) useStitcherStore.getState().addSourceImage(item.url);
    },
  },
};
