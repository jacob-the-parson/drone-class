// Registry contract — the ONLY types the Shell knows about.
// Law: slot components are ZERO-PROP and self-connect to their own store.
// Routes own the center viewport (app/(main)/<route>/page.tsx); the registry
// supplies the CHROME around it (drawers, footer, nav presence, theme).
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { VaultItem } from '@/stores/core/vaultStore';

export type LayoutTier = 'wide' | 'medium' | 'compact';
export type DrawerSide = 'left' | 'right';
export type AppDimension = '2d' | '3d';

export type SlotComponent = ComponentType;

/** Three fixed columns; leave a slot undefined to render it empty. */
export type TriSlot = readonly [SlotComponent?, SlotComponent?, SlotComponent?];

/** One tool panel inside a drawer. Drawers paginate; tools are unlimited. */
export interface DrawerPage {
  id: string;
  title: string;
  icon?: LucideIcon;
  content: SlotComponent;
}

/** A drawer is a mini-shell: TOOLS title bar, optional 3-col subheader, paged
 *  content (pages can grow infinitely), optional 3-col subfooter — mirroring
 *  the left unit's segmented rhythm. */
export interface DrawerDefinition {
  /** Title-bar text. Right drawer defaults to 'Tools' (Jacob's convention). */
  title?: string;
  /** Title-bar glyph. Right drawer defaults to the Wrench. */
  icon?: LucideIcon;
  header?: TriSlot;
  footer?: TriSlot;
  pages: DrawerPage[];
}

/** Cross-domain drawer pages (globals/) appended after the domain's own pages. */
export interface GlobalDrawerContribution {
  side: DrawerSide;
  page: DrawerPage;
}

export interface AppTheme {
  colorClass: string;
  bgClass: string;
  hoverBorder: string;
}

export interface AppNavigation {
  showInSidebar: boolean;
  showInDashboard: boolean;
  showInSettings: boolean;
}

export interface AppDefinition {
  id: string;
  /** Route segment under app/(main)/ — e.g. 'dashboard', 'canvas3d'. */
  route: string;
  name: string;
  description: string;
  icon: LucideIcon;
  theme: AppTheme;
  /** Rendering class badge; meta-domains (dashboard, settings) omit it. */
  dimension?: AppDimension;
  navigation: AppNavigation;
  /** Non-pageable per-domain real estate in the LEFT drawer, between the
   *  favorites section and the VaultDock.
   *  One component, always visible while the drawer is open — inventories,
   *  layer lists, asset trees. Pageable tooling belongs in drawerRight. */
  drawerLeftBottom?: SlotComponent;
  drawerRight?: DrawerDefinition;
  /** Global shell footer: 5 positional columns; null renders N/A. */
  shellFooter?: (SlotComponent | null)[];
  /** Body rendered in the Settings domain's tab for this app.
   *  Convention: provide at least a placeholder when showInSettings. */
  settingsBody?: SlotComponent;
  /** Vault send-row contract (favorites-gated, Jacob-approved 2026-07-26):
   *  declare the vault modes this domain accepts; the Vault renders a themed
   *  send button (favorites ∩ accepting domains) that calls handler(item)
   *  then navigates to this domain's route. Registry-driven — the Vault
   *  never names a domain. */
  accepts?: {
    modes: readonly AppDimension[];
    handler: (item: VaultItem) => void;
  };
}
