// FlowFooterActions — footer shape: [ · ][ · ][ reserved ][ trash-Clear ][ Vault ].
// Export composites visible layers (dataUrls → offscreen canvas) → PNG blob →
// Vault with target-dims metadata.
'use client';
import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { useFlowStore } from '@/stores/domains/flowStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

export function FlowClearAction() {
  const clearCanvas = useFlowStore((s) => s.clearCanvas);
  return <KeycapAction icon={Trash2} label="Canvas" tone="red" onClick={clearCanvas} title="Clear all layers" />;
}

export function FlowExportAction() {
  const layers = useFlowStore((s) => s.layers);
  const addItem = useVaultStore((s) => s.addItem);
  const [busy, setBusy] = useState(false);
  const hasContent = layers.some((l) => l.dataUrl);

  const handleExport = async () => {
    setBusy(true);
    try {
      const { targetWidth, targetHeight, layers: all, gridCols, gridRows } = useFlowStore.getState();
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      for (const layer of [...all].reverse()) {
        if (!layer.visible || !layer.dataUrl) continue;
        const img = new Image();
        img.src = layer.dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }
      ctx.globalAlpha = 1;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (blob) {
        await addItem(blob, {
          name: `flow-export-${targetWidth}x${targetHeight}.png`,
          type: 'generation',
          mode: '2d',
          metadata: {
            prompt: '',
            prependTemplates: [],
            appendTemplates: [],
            width: Math.round(targetWidth / gridCols),
            height: Math.round(targetHeight / gridRows),
          },
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
      onClick={handleExport}
      disabled={busy || !hasContent}
      title={hasContent ? 'Export composite to Vault' : 'Process or paint something first'}
    />
  );
}
