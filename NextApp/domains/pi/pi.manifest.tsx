// PI — field domain. The Raspberry Pi on (or beside) the aircraft: what its AI camera
// and LiDAR see, the modules it can run, and its link to the autopilot, through the
// bridge program on the Pi (pi/bridge.py). Practice data when no Pi is connected.
'use client';
import { Cpu, Plug, ShieldCheck } from 'lucide-react';
import type { AppDefinition } from '@/lib/registry.types';
import { PiConnectPage, PiGatePage, PiPiPage } from './PiDrawerPages';
import { PiPracticeAction, PiReportAction, PiStatusLine, PiStopAllAction } from './PiFooterActions';
import { PiSettings } from './PiSettings';

export const pi: AppDefinition = {
  id: 'pi',
  route: 'pi',
  name: 'Pi',
  description: 'The Raspberry Pi: what its AI camera and LiDAR see, the modules it runs, and its link to the autopilot.',
  icon: Cpu,
  category: 'field',
  theme: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-900/40',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-500',
  },
  navigation: { showInSidebar: true, showInDashboard: true, showInSettings: true },
  drawerRight: {
    pages: [
      { id: 'connect', title: 'Connect', icon: Plug, content: PiConnectPage },
      { id: 'gate', title: 'Gate', icon: ShieldCheck, content: PiGatePage },
      { id: 'pi', title: 'The Pi', icon: Cpu, content: PiPiPage },
    ],
  },
  // footer shape: [what is connected][practice][CENTER reserved][Stop all][Report]
  shellFooter: [PiStatusLine, PiPracticeAction, null, PiStopAllAction, PiReportAction],
  settingsBody: PiSettings,
};
