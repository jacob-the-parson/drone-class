// Flow — the THIRD domain port: image processing, cell-aware resize,
// layered pixel editing.
'use client';
import { Paintbrush, Workflow } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { FlowToolsPage } from './FlowToolsPage';
import { FlowClearAction, FlowExportAction } from './FlowFooterActions';
import { useFlowStore } from '@/stores/domains/flowStore';
import { StagedSettings } from '@/components/ui/StagedShell';

const FlowSettingsStaged = () => <StagedSettings name="Flow" />;

export const flow: AppDefinition = {
  id: 'flow',
  route: 'flow',
  name: 'Flow',
  description: 'Image processing, layer adjustments, resize, and pixel editing workflow.',
  icon: Workflow,
  theme: {
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-900/40',
    hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500',
  },
  dimension: '2d',
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  drawerRight: {
    pages: [{ id: 'tools', title: 'Tools', icon: Paintbrush, content: FlowToolsPage }],
  },
  // footer shape: [domain][domain][CENTER reserved][trash-Clear][Vault]
  shellFooter: [null, null, null, FlowClearAction, FlowExportAction],
  settingsBody: FlowSettingsStaged,
  // Vault send-row: 2D images arrive as the SOURCE image
  accepts: {
    modes: ['2d'],
    handler: (item) => {
      if (item.url) useFlowStore.getState().setSourceImage(item.url);
    },
  },
};
