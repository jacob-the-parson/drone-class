// The compose list — one import line per domain (Open/Closed: adding a domain
// never edits the Shell). Cross-domain PERMANENT chrome (StorageDock, FooterUser)
// is assembled by DrawerLeft, not declared here; GlobalDrawerContribution remains
// available for future cross-domain PAGE injections.
import type { AppDefinition } from './registry.types';
import { dashboard } from '@/domains/dashboard/dashboard.manifest';
import { slicer } from '@/domains/slicer/slicer.manifest';
import { stitcher } from '@/domains/stitcher/stitcher.manifest';
import { flow } from '@/domains/flow/flow.manifest';
import { canvais } from '@/domains/canvais/canvais.manifest';
import { animator } from '@/domains/animator/animator.manifest';
import { creator } from '@/domains/creator/creator.manifest';
import { template } from '@/domains/template/template.manifest';
import { template2d } from '@/domains/template2d/template2d.manifest';
import { template3d } from '@/domains/template3d/template3d.manifest';
import { settings } from '@/domains/settings/settings.manifest';

export const APP_REGISTRY: AppDefinition[] = [
  dashboard,
  slicer,
  stitcher,
  flow,
  canvais,
  animator,
  creator,
  template,
  template2d,
  template3d,
  settings,
];

export function appByRoute(segment: string | null): AppDefinition {
  return APP_REGISTRY.find((a) => a.route === segment) ?? APP_REGISTRY[0];
}

