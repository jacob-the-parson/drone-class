// Template2dFooterActions — the FOOTER SHAPE (Jacob's law, all templates):
//   [ domain action ] [ domain action ] [ CENTER reserved ] [ trash-Reset ] [ Vault ]
// Left toggles light in the domain accent when on; Reset = red family;
// Vault = green family (stamps a 2D item into the Vault).
'use client';
import { useState } from 'react';
import { Download, Grid3X3, Magnet, Trash2 } from 'lucide-react';
import { useTemplate2dStore } from '@/stores/domains/template2dStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

const ON = 'text-emerald-600 dark:text-emerald-400';

export function Template2dGridAction() {
  const gridVisible = useTemplate2dStore((s) => s.gridVisible);
  const toggleGrid = useTemplate2dStore((s) => s.toggleGrid);
  return (
    <button
      onClick={toggleGrid}
      className={`group flex h-full w-full cursor-pointer items-center justify-center gap-1.5 outline-none transition-colors hover:bg-control ${gridVisible ? ON : ''}`}
      title={`Grid overlay ${gridVisible ? 'on' : 'off'}`}
    >
      <Grid3X3 size={13} className="transition-transform group-hover:-translate-y-0.5" />
      <span className="font-medium uppercase tracking-wide">Grid</span>
    </button>
  );
}

export function Template2dSnapAction() {
  const snapEnabled = useTemplate2dStore((s) => s.snapEnabled);
  const toggleSnap = useTemplate2dStore((s) => s.toggleSnap);
  return (
    <button
      onClick={toggleSnap}
      className={`group flex h-full w-full cursor-pointer items-center justify-center gap-1.5 outline-none transition-colors hover:bg-control ${snapEnabled ? ON : ''}`}
      title={`Snap to grid ${snapEnabled ? 'on' : 'off'}`}
    >
      <Magnet size={13} className="transition-transform group-hover:-translate-y-0.5" />
      <span className="font-medium uppercase tracking-wide">Snap</span>
    </button>
  );
}

export function Template2dResetAction() {
  const clearCanvas = useTemplate2dStore((s) => s.clearCanvas);
  return (
    <KeycapAction icon={Trash2} label="Reset" tone="red" onClick={clearCanvas} title="Clear canvas (paints + dropped image)" />
  );
}

export function Template2dVaultAction() {
  const addItem = useVaultStore((s) => s.addItem);
  const strokes = useTemplate2dStore((s) => s.strokes);
  const [busy, setBusy] = useState(false);
  const empty = strokes.length === 0;

  // export the REAL drawing: visible layers' paints, cropped to their bounds
  const handleExport = async () => {
    setBusy(true);
    const { strokes: cells, layers } = useTemplate2dStore.getState();
    const visible = new Set(layers.filter((l) => l.visible).map((l) => l.id));
    const paints = cells.filter((c) => visible.has(c.layerId));
    if (paints.length === 0) {
      setBusy(false);
      return;
    }
    const minX = Math.min(...paints.map((c) => c.x));
    const minY = Math.min(...paints.map((c) => c.y));
    const maxX = Math.max(...paints.map((c) => c.x + c.size));
    const maxY = Math.max(...paints.map((c) => c.y + c.size));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, maxX - minX);
    canvas.height = Math.max(1, maxY - minY);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      for (const layer of layers) {
        if (!visible.has(layer.id)) continue;
        for (const c of paints) {
          if (c.layerId !== layer.id) continue;
          ctx.fillStyle = c.c;
          ctx.fillRect(c.x - minX, c.y - minY, c.size, c.size);
        }
      }
    }
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (blob) await addItem(blob, { name: 'template2d-drawing.png', type: 'generation', mode: '2d' });
    setBusy(false);
  };

  return (
    <KeycapAction
      icon={Download}
      label="Vault"
      tone="green"
      onClick={handleExport}
      disabled={busy || empty}
      title={empty ? 'Paint something first' : 'Export drawing to Vault'}
    />
  );
}
