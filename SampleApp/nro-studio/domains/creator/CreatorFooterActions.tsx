// CreatorFooterActions — footer shape: [Spin][Ink][reserved][Reset][Vault].
// Spin/Ink = live viewport toggles (cyan accent when on); Reset = palette back
// to legend defaults (red family); Vault = frame capture → Vault as a 3D-mode
// item (green family) — the turnaround-shot seed.
'use client';
import { useState } from 'react';
import { Download, PenTool, Rotate3d, Trash2 } from 'lucide-react';
import { useCreatorStore } from '@/stores/domains/creatorStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

const ON = 'text-cyan-600 dark:text-cyan-400';

export function CreatorSpinAction() {
  const turntable = useCreatorStore((s) => s.turntable);
  const toggleTurntable = useCreatorStore((s) => s.toggleTurntable);
  return (
    <button
      onClick={toggleTurntable}
      className={`group flex h-full w-full cursor-pointer items-center justify-center gap-1.5 outline-none transition-colors hover:bg-control ${turntable ? ON : ''}`}
      title={`Turntable ${turntable ? 'on' : 'off'}`}
    >
      <Rotate3d size={13} className="transition-transform group-hover:-translate-y-0.5" />
      <span className="font-medium uppercase tracking-wide">Spin</span>
    </button>
  );
}

export function CreatorInkAction() {
  const outline = useCreatorStore((s) => s.outline);
  const toggleOutline = useCreatorStore((s) => s.toggleOutline);
  return (
    <button
      onClick={toggleOutline}
      className={`group flex h-full w-full cursor-pointer items-center justify-center gap-1.5 outline-none transition-colors hover:bg-control ${outline ? ON : ''}`}
      title={`Ink outline ${outline ? 'on' : 'off'}`}
    >
      <PenTool size={13} className="transition-transform group-hover:-translate-y-0.5" />
      <span className="font-medium uppercase tracking-wide">Ink</span>
    </button>
  );
}

export function CreatorResetAction() {
  const resetPalette = useCreatorStore((s) => s.resetPalette);
  return (
    <KeycapAction icon={Trash2} label="Reset" tone="red" onClick={resetPalette} title="Reset palette to legend defaults" />
  );
}

export function CreatorVaultAction() {
  const exporter = useCreatorStore((s) => s.exporter);
  const gender = useCreatorStore((s) => s.gender);
  const loadState = useCreatorStore((s) => s.loadState);
  const addItem = useVaultStore((s) => s.addItem);
  const [busy, setBusy] = useState(false);

  const handleCapture = async () => {
    if (!exporter) return;
    setBusy(true);
    try {
      const blob = await exporter();
      if (blob) {
        await addItem(blob, {
          name: `creator-${gender}-capture.png`,
          type: 'generation',
          mode: '3d',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeycapAction
      icon={Download}
      label="Vault"
      tone="green"
      onClick={handleCapture}
      disabled={busy || !exporter || loadState !== 'ready'}
      title={loadState === 'ready' ? 'Capture viewport to Vault' : 'Waiting for the model'}
    />
  );
}
