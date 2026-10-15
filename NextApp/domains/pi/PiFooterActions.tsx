// PiFooterActions — THE FOOTER SHAPE (all domains):
//   [ domain status ] [ domain action ] [ CENTER reserved ] [ Stop all (red) ] [ Report (green) ]
'use client';
import { Cpu, FileText, GraduationCap, Square } from 'lucide-react';
import { KeycapAction } from '@/components/ui/KeycapAction';
import { measuredLine, nearest } from '@/lib/pi/view';
import { downloadFile } from '@/lib/units';
import { piLine, usePiStore } from '@/stores/domains/piStore';

export function PiStatusLine() {
  const source = usePiStore((s) => s.source);
  const link = usePiStore((s) => s.link);
  const hello = usePiStore((s) => s.hello);
  const status = usePiStore((s) => s.status);
  return (
    <div className={`flex h-full w-full items-center justify-center gap-1.5 ${source === 'off' ? 'opacity-60' : 'text-ink'}`} title="What is connected">
      <Cpu size={13} className="text-rose-600 dark:text-rose-400" />
      <span className="truncate font-medium uppercase tracking-wide">{piLine({ source, link, hello, status })}</span>
    </div>
  );
}

export function PiPracticeAction() {
  const source = usePiStore((s) => s.source);
  const startPractice = usePiStore((s) => s.startPractice);
  const on = source === 'practice';
  return (
    <button
      onClick={() => void startPractice()}
      disabled={on}
      className={`group flex h-full w-full items-center justify-center gap-1.5 outline-none transition-colors ${on ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-control hover:text-rose-600 dark:hover:text-rose-400'}`}
      title={on ? 'The practice is playing' : 'Play the practice: a made-up room, no Pi'}
    >
      <GraduationCap size={13} />
      <span className="font-medium uppercase tracking-wide">Practice</span>
    </button>
  );
}

export function PiStopAllAction() {
  const source = usePiStore((s) => s.source);
  const running = usePiStore((s) => (s.status ? Object.keys(s.status.running).length : 0));
  const stopAll = usePiStore((s) => s.stopAll);
  return (
    <KeycapAction
      icon={Square}
      label="Stop all"
      tone="red"
      disabled={source !== 'pi' || running === 0}
      title="Stop every module on the Pi. If a setpoint template was running, PX4 leaves Offboard after a second."
      onClick={() => void stopAll()}
    />
  );
}

export function PiReportAction() {
  const has = usePiStore((s) => s.source !== 'off');
  return (
    <KeycapAction
      icon={FileText}
      label="Report"
      tone="green"
      disabled={!has}
      title="Download what the Pi sees now, as text"
      onClick={() => {
        const s = usePiStore.getState();
        const lines = [
          s.source === 'practice' ? 'Pi: the practice (made-up room, no Pi)' : `Pi: ${s.hello?.name} at ${s.origin}, level ${s.hello?.level}${s.hello?.made_up ? ', MADE-UP sensors' : ''}`,
          `Written: ${new Date().toISOString()} (UTC)`,
          '',
          `LiDAR: ${(() => {
            const n = nearest(s.now.scan);
            return n ? `nearest ${n.distance_m.toFixed(2)} m at ${n.bearing_deg.toFixed(0)} deg, ${s.now.scan?.points} points` : 'off';
          })()}`,
          `Camera: ${s.now.detections ? s.now.detections.items.map((d) => `${d.label} ${(d.score * 100).toFixed(0)}%`).join(', ') || 'nothing seen' : 'off'}`,
          `Look and measure: ${s.now.measure ? measuredLine(s.now.measure.items) : 'off'}`,
          `Autopilot: ${s.now.autopilot?.vehicle ? `${s.now.autopilot.vehicle.mode}, ${s.now.autopilot.vehicle.armed ? 'ARMED' : 'disarmed'}, ${s.now.autopilot.talking ? 'the Pi is sending' : 'listening only'}` : 'no link'}`,
          `Setpoints: ${s.now.setpoint ? `${s.now.setpoint.template}: ${s.now.setpoint.why}` : 'none'}`,
          `Running: ${s.status ? Object.keys(s.status.running).join(', ') || 'nothing' : '—'}`,
          '',
          'No picture and no position is in this report.',
        ];
        downloadFile(`pi-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`, lines.join('\n') + '\n');
      }}
    />
  );
}
