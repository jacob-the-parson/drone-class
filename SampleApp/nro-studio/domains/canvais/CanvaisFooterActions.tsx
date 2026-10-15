// CanvaisFooterActions — footer shape pair. NOTE: this domain originally
// declared NO footer; the pair is an addition per the footer shape law
// (decision D2 in docs/ROADMAP.md, awaiting Jacob's ruling). Vault export
// captures the Konva stage via the store-registered exporter.
'use client';
import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { useCanvaisStore } from '@/stores/domains/canvaisStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

export function CanvaisClearAction() {
  const clearAll = useCanvaisStore((s) => s.clearAll);
  return <KeycapAction icon={Trash2} label="Canvas" tone="red" onClick={clearAll} title="Remove all objects" />;
}

export function CanvaisExportAction() {
  const items = useCanvaisStore((s) => s.items);
  const exporter = useCanvaisStore((s) => s.exporter);
  const addItem = useVaultStore((s) => s.addItem);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!exporter) return;
    setBusy(true);
    try {
      const blob = await exporter();
      if (blob) {
        await addItem(blob, { name: `canvais-composition.png`, type: 'generation', mode: '2d' });
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
      onClick={handleExport}
      disabled={busy || items.length === 0 || !exporter}
      title={items.length === 0 ? 'Compose something first' : 'Capture stage to Vault'}
    />
  );
}
