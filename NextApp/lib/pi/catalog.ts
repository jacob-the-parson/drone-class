// What the bridge offers to start, as the Pi screen shows it when no Pi is connected.
// The same list as pi/fcpi/modules.py's CATALOG; scripts/verify-pi.mjs asks the bridge
// for its list and fails if the two differ.
import type { PiLevel, PiStage } from './types.ts';

export interface CatalogEntry {
  id: string;
  name: string;
  level: PiLevel;
  stage: PiStage;
  uses: string[];
  talks?: boolean;
}

export const PI_CATALOG: CatalogEntry[] = [
  { id: 'lidar', name: 'LiDAR scan', level: 'student', stage: 'lesson', uses: ['lidar'] },
  { id: 'camera', name: 'Camera: what it sees', level: 'student', stage: 'lesson', uses: ['camera'] },
  { id: 'look-and-measure', name: 'Look and measure', level: 'student', stage: 'template', uses: ['camera', 'lidar'] },
  { id: 'autopilot-listen', name: 'Stage A: listen to the autopilot', level: 'student', stage: 'A', uses: ['link'] },
  { id: 'obstacles', name: 'Stage B: obstacle data to the autopilot', level: 'instructor', stage: 'B', uses: ['lidar', 'link'], talks: true },
  { id: 'offboard-hold', name: 'Stage C: hold', level: 'instructor', stage: 'C', uses: ['link'], talks: true },
  { id: 'offboard-face-person', name: 'Stage C: face person', level: 'instructor', stage: 'C', uses: ['camera', 'link'], talks: true },
  { id: 'offboard-keep-distance', name: 'Stage C: keep distance', level: 'instructor', stage: 'C', uses: ['lidar', 'link'], talks: true },
  { id: 'offboard-follow-person', name: 'Stage C: follow person', level: 'instructor', stage: 'C', uses: ['camera', 'lidar', 'link'], talks: true },
];

export const LEVEL_WORDS: Record<PiLevel, string> = {
  student: 'Student: see everything; start the camera and LiDAR lessons. Nothing that sends to an autopilot.',
  instructor: 'Instructor: also obstacle data (stage B) and the setpoint templates (stage C), within the Pi’s limits.',
  developer: 'Developer: also experiments, and asking the autopilot for Offboard. For the teacher’s and developers’ own tests.',
};
