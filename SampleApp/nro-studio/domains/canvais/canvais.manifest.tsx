// Canvais — the FOURTH domain port: freeform Konva composition stage.
// (The footer pair is an addition beyond the original design — decision D2.)
'use client';
import { Beaker } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { CanvaisObjectsPanel } from './CanvaisObjectsPanel';
import { CanvaisClearAction, CanvaisExportAction } from './CanvaisFooterActions';
import { useCanvaisStore } from '@/stores/domains/canvaisStore';
import { StagedSettings } from '@/components/ui/StagedShell';

const CanvaisSettingsStaged = () => <StagedSettings name="Canvais" />;

export const canvais: AppDefinition = {
  id: 'canvais',
  route: 'canvais',
  name: 'Canvais',
  description: 'Compose, render, and refine visual generations incrementally.',
  icon: Beaker,
  theme: {
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/40',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-500',
  },
  dimension: '2d',
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  drawerLeftBottom: CanvaisObjectsPanel,
  // footer shape (an addition — D2): [·][·][reserved][Clear][Vault]
  shellFooter: [null, null, null, CanvaisClearAction, CanvaisExportAction],
  settingsBody: CanvaisSettingsStaged,
  // Vault send-row: 2D images drop onto the stage (cascade placement)
  accepts: {
    modes: ['2d'],
    handler: (item) => {
      if (item.url) useCanvaisStore.getState().addItem(item.url);
    },
  },
};
