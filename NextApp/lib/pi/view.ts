// Small readings of what the Pi sees, shared by the Pi screen and its checks.
import type { PiMeasured, PiObstacles, PiScan } from './types.ts';

/** The nearest return in the scan, and which way it is. */
export function nearest(scan: PiScan | null): { distance_m: number; bearing_deg: number } | null {
  if (!scan) return null;
  let best: { distance_m: number; bearing_deg: number } | null = null;
  for (let i = 0; i < scan.ranges_m.length; i++) {
    const r = scan.ranges_m[i];
    if (!(r > 0)) continue;
    if (!best || r < best.distance_m) best = { distance_m: r, bearing_deg: scan.angles[i] };
  }
  return best;
}

/** A bearing in words, for a person: "ahead", "12° right", "behind". */
export function bearingWords(deg: number): string {
  const a = Math.round(deg);
  if (Math.abs(a) <= 3) return 'ahead';
  if (Math.abs(a) >= 177) return 'behind';
  return a > 0 ? `${a}° right` : `${-a}° left`;
}

/** The scan as points for a radar drawing: x right, y forward, in metres. */
export function radarPoints(scan: PiScan, maxRange: number): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < scan.ranges_m.length; i++) {
    const r = scan.ranges_m[i];
    if (!(r > 0) || r > maxRange) continue;
    const a = (scan.angles[i] * Math.PI) / 180;
    // clockwise from the nose: right is +x, forward is +y
    out.push({ x: r * Math.sin(a), y: r * Math.cos(a), r });
  }
  return out;
}

/** How many of the 72 sectors hold an obstacle, are clear, or are unknown. */
export function sectorCounts(o: PiObstacles): { obstacle: number; clear: number; unknown: number } {
  let obstacle = 0;
  let clear = 0;
  let unknown = 0;
  for (const d of o.distances_cm) {
    if (d === 65535) unknown++;
    else if (d > o.max_cm) clear++;
    else obstacle++;
  }
  return { obstacle, clear, unknown };
}

/** One line about the nearest thing the camera and LiDAR found together. */
export function measuredLine(items: PiMeasured[]): string {
  if (items.length === 0) return 'Nothing seen';
  const withD = items.filter((i) => i.distance_m !== null).sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
  const it = withD[0] ?? items[0];
  return `${it.label}, ${bearingWords(it.bearing_deg)}${it.distance_m !== null ? `, ${it.distance_m.toFixed(1)} m` : ', too far for the LiDAR'}`;
}
