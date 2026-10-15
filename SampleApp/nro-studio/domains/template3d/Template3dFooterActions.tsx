// Template3dFooterActions — the FOOTER SHAPE (Jacob's law, all templates):
//   [ domain action ] [ domain action ] [ CENTER reserved ] [ trash-Reset ] [ Vault ]
// Left toggles light in the domain accent (3D = orange) when on; Reset = red
// family; Vault = green family (stamps a 3D-mode item into the Vault).
'use client';
import { useState } from 'react';
import { Box, Download, Rotate3d, Trash2 } from 'lucide-react';
import { useTemplate3dStore } from '@/stores/domains/template3dStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

const ON = 'text-orange-600 dark:text-orange-400';

export function Template3dTurntableAction() {
  const turntable = useTemplate3dStore((s) => s.turntable);
  const toggleTurntable = useTemplate3dStore((s) => s.toggleTurntable);
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

export function Template3dWireframeAction() {
  const wireframe = useTemplate3dStore((s) => s.wireframe);
  const toggleWireframe = useTemplate3dStore((s) => s.toggleWireframe);
  return (
    <button
      onClick={toggleWireframe}
      className={`group flex h-full w-full cursor-pointer items-center justify-center gap-1.5 outline-none transition-colors hover:bg-control ${wireframe ? ON : ''}`}
      title={`Wireframe ${wireframe ? 'on' : 'off'}`}
    >
      <Box size={13} className="transition-transform group-hover:-translate-y-0.5" />
      <span className="font-medium uppercase tracking-wide">Wire</span>
    </button>
  );
}

export function Template3dResetAction() {
  const reset = useTemplate3dStore((s) => s.reset);
  return <KeycapAction icon={Trash2} label="Reset" tone="red" onClick={reset} title="Reset 3D template state" />;
}

export function Template3dVaultAction() {
  const addItem = useVaultStore((s) => s.addItem);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ea580c';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TPL', 64, 48);
      ctx.fillText('3D', 64, 84);
    }
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (blob) await addItem(blob, { name: 'template3d-stamp.png', type: 'generation', mode: '3d' });
    setBusy(false);
  };

  return (
    <KeycapAction icon={Download} label="Vault" tone="green" onClick={handleExport} disabled={busy} title="Send to Vault" />
  );
}
