// 3D TEMPLATE — the living scaffold for 3D apps. Copy this folder + its route
// to start any 3D domain; the EON character creator will be its first copy.
'use client';
import { Box, Palette } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import {
  Template3dTurntableAction,
  Template3dWireframeAction,
  Template3dResetAction,
  Template3dVaultAction,
} from './Template3dFooterActions';

import { Template3dRegionsPage } from './Template3dPages';
import { Template3dOutliner } from './Template3dOutliner';

function Template3dSettings() {
  return (
    <p className="text-sm text-ink-muted">
      3D sample settings — nothing to configure; the Regions drawer page holds the live
      material controls.
    </p>
  );
}

export const template3d: AppDefinition = {
  id: 'template_3d',
  route: 'template3d',
  name: '3D Template',
  description: 'Living scaffold — copy this domain to start a 3D app.',
  icon: Box,
  dimension: '3d',
  // 3D = orange, Blender heritage (the dimension color law; see BadgeDim)
  theme: {
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-900/40',
    hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-500',
  },
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  // left-bottom: Blender-style scene outliner (DrawerLayerList reused in 3D)
  drawerLeftBottom: Template3dOutliner,
  drawerRight: {
    pages: [{ id: 'regions', title: 'Regions', icon: Palette, content: Template3dRegionsPage }],
  },
  // footer shape: [domain][domain][CENTER reserved][trash-Reset][Vault]
  shellFooter: [
    Template3dTurntableAction,
    Template3dWireframeAction,
    null,
    Template3dResetAction,
    Template3dVaultAction,
  ],
  settingsBody: Template3dSettings,
};
