// 2D TEMPLATE — the living scaffold for 2D apps.
// Copy this folder + its route to start any 2D domain; it demonstrates the full
// registry contract for the 2D render class.
'use client';
import { Grid2x2, Layers, SlidersHorizontal } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import {
  Template2dGridAction,
  Template2dSnapAction,
  Template2dResetAction,
  Template2dVaultAction,
} from './Template2dFooterActions';
import { Template2dLayersPage, Template2dBrushPage } from './Template2dPages';
import { Template2dMiniMap } from './Template2dMiniMap';
import { useTemplate2dStore } from '@/stores/domains/template2dStore';

function Template2dSettings() {
  return (
    <p className="text-sm text-ink-muted">
      2D sample settings — nothing to configure; the Brush/Layers drawer pages hold the
      live controls.
    </p>
  );
}

export const template2d: AppDefinition = {
  id: 'template_2d',
  route: 'template2d',
  name: '2D Template',
  description: 'Living scaffold — copy this domain to start a 2D app.',
  icon: Grid2x2,
  dimension: '2d',
  // 2D = green (the dimension color law; see BadgeDim)
  theme: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/40',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500',
  },
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  // left-bottom: live export preview, directly above the Vault it feeds
  drawerLeftBottom: Template2dMiniMap,
  drawerRight: {
    pages: [
      { id: 'layers', title: 'Layers', icon: Layers, content: Template2dLayersPage },
      { id: 'brush', title: 'Brush', icon: SlidersHorizontal, content: Template2dBrushPage },
    ],
  },
  // Vault send-row: sent 2D images land on the sample canvas
  accepts: {
    modes: ['2d'],
    handler: (item) => useTemplate2dStore.getState().setDroppedImage(item.url ?? null),
  },
  // footer shape: [domain][domain][CENTER reserved][trash-Reset][Vault]
  shellFooter: [
    Template2dGridAction,
    Template2dSnapAction,
    null,
    Template2dResetAction,
    Template2dVaultAction,
  ],
  settingsBody: Template2dSettings,
};
