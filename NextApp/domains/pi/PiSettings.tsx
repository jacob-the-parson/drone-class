// PiSettings — settings sub-area body: what the Pi screen is, what is kept.
'use client';
import { Cpu } from 'lucide-react';
import { usePiStore } from '@/stores/domains/piStore';

export function PiSettings() {
  const address = usePiStore((s) => s.address);
  const token = usePiStore((s) => s.token);
  const setAddress = usePiStore((s) => s.setAddress);
  const setToken = usePiStore((s) => s.setToken);
  return (
    <div className="flex items-start gap-4">
      <div className="rounded-full bg-rose-100 p-3 dark:bg-rose-900/40">
        <Cpu size={24} className="text-rose-600 dark:text-rose-400" />
      </div>
      <div className="min-w-0 flex-1 space-y-3 text-sm text-ink-muted">
        <h3 className="text-lg font-medium text-ink">Pi</h3>
        <p>
          The Pi screen talks to the bridge program on a Raspberry Pi, over this computer&apos;s network. It keeps the Pi&apos;s
          address ({address || 'none yet'}) and the token ({token ? 'kept' : 'none'}) in this browser, and nothing the Pi saw.
        </p>
        <p>
          The Pi&apos;s own settings, including its level (student, instructor or developer), are in a file on the Pi that the
          teacher writes. This app cannot change them.
        </p>
        <button
          onClick={() => {
            setAddress('');
            setToken('');
          }}
          className="rounded-md border border-edge bg-control px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken"
        >
          Forget the address and the token
        </button>
      </div>
    </div>
  );
}
