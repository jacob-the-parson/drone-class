// ModalProfile — user details. Interface preferences (theme/vibe/tokens) live
// in the Settings domain's Global sub-area; this modal links there.
'use client';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { ModalBase } from '@/components/ui/ModalBase';
import { useAuthStore } from '@/stores/core/authStore';

interface ModalProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalProfile({ isOpen, onClose }: ModalProfileProps) {
  const userProfile = useAuthStore((s) => s.userProfile);

  return (
    <ModalBase isOpen={isOpen} onClose={onClose} title="Profile">
      <div className="space-y-2 text-sm">
        {(
          [
            ['Name', userProfile?.name],
            ['Role', userProfile?.role],
            ['Email', userProfile?.email],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-edge pb-2">
            <span className="text-ink-muted">{label}</span>
            <span className="font-mono text-xs text-ink">{value ?? '—'}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[10px] text-ink-muted">Dev session · not persisted.</p>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md border border-edge px-3 py-1.5 text-xs text-ink shadow-sm transition-colors hover:bg-surface-sunken"
        >
          <Settings size={12} /> Interface settings
        </Link>
      </div>
    </ModalBase>
  );
}
