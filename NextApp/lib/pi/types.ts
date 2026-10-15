// What the bridge on the Pi says, as the app reads it (pi/bridge.py). The bridge's
// answers are JSON; these are their shapes.

export type PiLevel = 'student' | 'instructor' | 'developer';
export type PiStage = 'lesson' | 'template' | 'A' | 'B' | 'C' | 'experiment';

export interface PiHello {
  app: 'flight-companion-pi';
  version: string;
  name: string;
  level: PiLevel;
  made_up: boolean;
  pictures: boolean;
  uptime_s: number;
  settings: {
    lidar: { max_range_m: number; mount_measured: boolean; zero_offset_deg: number | null; mirrored: boolean | null };
    camera: { model: string; horizontal_fov_deg: number | null; threshold: number };
    autopilot: { device: string; baud: number; share_position: boolean };
    limits: { max_speed_ms: number; max_yaw_rate_dps: number; keep_distance_m: number; setpoint_hz: number };
    config_file: string | null;
    config_note: string | null;
  };
}

export interface PiModule {
  id: string;
  name: string;
  level: PiLevel;
  stage: PiStage;
  uses: string[];
  about: string;
  talks?: boolean;
  options?: string[];
  running: boolean;
  why_not: string | null;
}

export interface PiStatus {
  running: Record<string, { since_s: number; error: string | null }>;
  sensors: Record<string, { alive: boolean; error: string | null }>;
  link: { device: string; talking: boolean } | null;
}

export interface PiInventory {
  made_up: boolean;
  host: string;
  os: string;
  python: string;
  packages: Record<string, boolean>;
  camera: { models: string[]; model_count: number; rpicam: boolean };
  lidar: { ports: string[]; by_id: string[] };
  autopilot: { device: string; present: boolean; serial_ports: string[] };
  desktop_apps: { name: string; file: string }[];
  note: string;
}

export interface PiScan {
  angles: number[];
  ranges_m: number[];
  hz: number | null;
  points: number;
  made_up: boolean;
  mount_measured: boolean;
  max_range_m: number;
}

export interface PiDetection {
  label: string;
  score: number;
  /** x, y, w, h as fractions of the picture. */
  box: [number, number, number, number];
}

export interface PiMeasured {
  label: string;
  score: number;
  bearing_deg: number;
  distance_m: number | null;
}

export interface PiAutopilot {
  heard: boolean;
  last_rx_age_s: number | null;
  vehicle: { type: number; autopilot: number; armed: boolean; mode: string; offboard: boolean } | null;
  attitude?: { roll_deg: number; pitch_deg: number; yaw_deg: number };
  battery?: { volts: number | null; percent: number | null };
  height_m?: number;
  link: string;
  talking: boolean;
  sent: Record<string, number>;
}

export interface PiObstacles {
  distances_cm: number[];
  increment_deg: number;
  min_cm: number;
  max_cm: number;
}

export interface PiSetpoint {
  template: string;
  vx: number;
  yaw_rate_dps: number;
  why: string;
}

export interface PiLogLine {
  seq: number;
  t: number;
  level: 'info' | 'warning' | 'error';
  text: string;
}

/** The newest of each kind, as the screen holds it. */
export interface PiNow {
  scan: PiScan | null;
  detections: { items: PiDetection[]; model: string; made_up: boolean; horizontal_fov_deg: number | null } | null;
  measure: { items: PiMeasured[]; lidar: boolean; made_up: boolean } | null;
  autopilot: PiAutopilot | null;
  obstacles: PiObstacles | null;
  setpoint: PiSetpoint | null;
}

export const EMPTY_NOW: PiNow = { scan: null, detections: null, measure: null, autopilot: null, obstacles: null, setpoint: null };

/** The bridge's event names, and the kind each fills. */
export const PI_KINDS = ['scan', 'detections', 'measure', 'autopilot', 'obstacles', 'setpoint'] as const;
export type PiKind = (typeof PI_KINDS)[number];

export const STAGE_LABEL: Record<PiStage, string> = {
  lesson: 'Sensor lessons',
  template: 'Camera and LiDAR together',
  A: 'Stage A: listen to the autopilot',
  B: 'Stage B: obstacle data to the autopilot',
  C: 'Stage C: setpoints to the autopilot',
  experiment: 'Experiments',
};
