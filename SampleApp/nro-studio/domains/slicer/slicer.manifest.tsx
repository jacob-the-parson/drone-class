// Slicer — the FIRST domain port (core complete; AI generate staged
// behind the provider adapter). Split and process images into tiled grids.
'use client';
import { Scissors, Grid3X3 } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { SlicerGridPage } from './SlicerGridPage';
import { SlicerInventory } from './SlicerInventory';
import { SlicerClearAction, SlicerExportAction } from './SlicerFooterActions';
import { useSlicerStore } from '@/stores/domains/slicerStore';
import { SlicerSettings } from './SlicerSettings';

export const slicer: AppDefinition = {
  id: 'slicer',
  route: 'slicer',
  name: 'Slicer',
  description: 'Split and process large images into manageable tiled grids.',
  icon: Scissors,
  theme: {
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-900/40',
    hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-500',
  },
  dimension: '2d',
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  drawerLeftBottom: SlicerInventory,
  drawerRight: {
    pages: [{ id: 'grid', title: 'Grid', icon: Grid3X3, content: SlicerGridPage }],
  },
  // footer shape: [domain][domain][CENTER reserved][trash-Clear][Vault]
  shellFooter: [null, null, null, SlicerClearAction, SlicerExportAction],
  settingsBody: SlicerSettings,
  // Vault send-row: 2D images load onto the active layer
  accepts: {
    modes: ['2d'],
    handler: (item) => {
      if (item.url) useSlicerStore.getState().loadAssetToActiveLayer(item.url);
    },
  },
};
