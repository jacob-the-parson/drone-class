// DOMAIN TEMPLATE — the BASE living scaffold.
// The canonical reference for the registry contract: every slot declared, every
// slot store-connected. Copy this folder + a route to start ANY domain;
// template2d/template3d are its render-class siblings.
'use client';
import { Braces, PanelRight } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { useTemplateStore } from '@/stores/domains/templateStore';
import { TemplateSlotsPage } from './TemplateSlotsPage';
import { TemplateInspector } from './TemplateInspector';
import { TemplateStatusAction, TemplateTickAction, TemplateResetAction, TemplateVaultAction } from './TemplateFooterActions';
import { TemplateSettings } from './TemplateSettings';

export const template: AppDefinition = {
  id: 'template',
  route: 'template',
  name: 'Domain Template',
  description: 'Reusable living scaffold — the registry contract, demonstrated.',
  icon: Braces,
  theme: {
    colorClass: 'text-pink-600 dark:text-pink-400',
    bgClass: 'bg-pink-50 dark:bg-pink-900/40',
    hoverBorder: 'hover:border-pink-300 dark:hover:border-pink-500',
  },
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  // non-pageable per-domain left area (between favorites and the Vault)
  drawerLeftBottom: TemplateSlotsPage,
  drawerRight: {
    // title/icon override demo — omit them and you get 'Tools' + Wrench (the default)
    title: 'Inspector',
    icon: PanelRight,
    pages: [
      { id: 'inspector', title: 'Inspector', icon: PanelRight, content: TemplateInspector },
    ],
  },
  // footer shape: [domain][domain][CENTER reserved][trash-Reset][Vault]
  shellFooter: [TemplateStatusAction, TemplateTickAction, null, TemplateResetAction, TemplateVaultAction],
  settingsBody: TemplateSettings,
  // Vault send-row: this domain accepts drops from both vault modes (demo).
  accepts: {
    modes: ['2d', '3d'],
    handler: (item) => useTemplateStore.getState().receiveVaultItem(item),
  },
};
