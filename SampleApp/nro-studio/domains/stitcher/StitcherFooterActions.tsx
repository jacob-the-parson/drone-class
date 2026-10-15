// StitcherFooterActions — footer shape: [ · ][ · ][ reserved ][ trash-Clear ][ Vault ].
// Export composites placements layer-by-layer → PNG blob → Vault
// with cell-size metadata (pipeline law).
'use client';
import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { useStitcherStore } from '@/stores/domains/stitcherStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

export function StitcherClearAction() {
  const clearPlacements = useStitcherStore((s) => s.clearPlacements);
  return (
    <KeycapAction icon={Trash2} label="Canvas" tone="red" onClick={clearPlacements} title="Clear all placements" />
  );
}

export function StitcherExportAction() {
  const placements = useStitcherStore((s) => s.placements);
  const addItem = useVaultStore((s) => s.addItem);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (placements.length === 0) return;
    setIsExporting(true);
    try {
      const { cellWidth, cellHeight, targetCols, targetRows, sourceImages, layers, placements: all } =
        useStitcherStore.getState();
      const canvas = document.createElement('canvas');
      canvas.width = targetCols * cellWidth;
      canvas.height = targetRows * cellHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      const imgMap = new Map<string, HTMLImageElement>();
      for (const src of sourceImages) {
        if (!all.some((p) => p.sourceId === src.id)) continue;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src.url;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        imgMap.set(src.id, img);
      }

      for (const layer of [...layers].reverse()) {
        if (!layer.visible) continue;
        ctx.globalAlpha = layer.opacity;
        for (const p of all.filter((pl) => pl.layerId === layer.id)) {
          const img = imgMap.get(p.sourceId);
          if (!img) continue;
          ctx.drawImage(
            img,
            p.sourceCol * cellWidth,
            p.sourceRow * cellHeight,
            p.width * cellWidth,
            p.height * cellHeight,
            p.targetCol * cellWidth + (p.offsetX || 0),
            p.targetRow * cellHeight + (p.offsetY || 0),
            p.width * cellWidth,
            p.height * cellHeight,
          );
        }
      }
      ctx.globalAlpha = 1;

      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (blob) {
        await addItem(blob, {
          name: `stitched-sheet-${targetCols}x${targetRows}.png`,
          type: 'generation',
          mode: '2d',
          metadata: {
            prompt: '',
            prependTemplates: [],
            appendTemplates: [],
            width: cellWidth,
            height: cellHeight,
          },
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <KeycapAction
      icon={Download}
      label="Vault"
      tone="green"
      onClick={handleExport}
      disabled={placements.length === 0 || isExporting}
      title={placements.length === 0 ? 'Place something first' : 'Export composite to Vault'}
    />
  );
}
