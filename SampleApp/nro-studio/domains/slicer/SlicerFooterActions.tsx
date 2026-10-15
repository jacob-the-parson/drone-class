// SlicerFooterActions — footer shape: [ · ][ · ][ reserved ][ trash-Clear ][ Vault ].
// Clear = red family (clears canvas: tiles + layers). Vault = green family:
// composites visible layers + cell overrides → PNG → Vault (with sheet dims
// metadata — pipeline law) → browser download too (both, by design).
'use client';
import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { useSlicerStore } from '@/stores/domains/slicerStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

const loadImg = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

export function SlicerClearAction() {
  const clearCanvas = useSlicerStore((s) => s.clearCanvas);
  return (
    <KeycapAction icon={Trash2} label="Canvas" tone="red" onClick={clearCanvas} title="Clear canvas (all layers + cells)" />
  );
}

export function SlicerExportAction() {
  const tiles = useSlicerStore((s) => s.tiles);
  const layers = useSlicerStore((s) => s.layers);
  const addItem = useVaultStore((s) => s.addItem);
  const [isExporting, setIsExporting] = useState(false);

  const hasContent = Object.keys(tiles).length > 0 || layers.some((l) => l.url);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { gridConfig, layers: allLayers, tiles: allTiles } = useSlicerStore.getState();
      const width = gridConfig.columns * gridConfig.tileWidth;
      const height = gridConfig.rows * gridConfig.tileHeight;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      // visible layers, scaled to export width, bottom-up
      for (const layer of allLayers) {
        if (!layer.visible || !layer.url) continue;
        const img = await loadImg(layer.url);
        if (!img) continue;
        ctx.globalAlpha = layer.opacity ?? 1;
        const scale = width / img.naturalWidth;
        ctx.drawImage(img, 0, 0, width, img.naturalHeight * scale);
        ctx.globalAlpha = 1;
      }

      // cell overrides: erased = punched hole, custom = drawn on top
      const tw = gridConfig.tileWidth;
      const th = gridConfig.tileHeight;
      for (const [indexStr, tileData] of Object.entries(allTiles)) {
        const idx = parseInt(indexStr);
        const col = idx % gridConfig.columns;
        const row = Math.floor(idx / gridConfig.columns);
        if (tileData.isErased) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillRect(col * tw, row * th, tw, th);
          ctx.restore();
        } else {
          const img = await loadImg(tileData.url);
          if (img) ctx.drawImage(img, col * tw, row * th, tw, th);
        }
      }

      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (blob) {
        await addItem(blob, {
          name: `sliced-sheet-${gridConfig.columns}x${gridConfig.rows}.png`,
          type: 'generation',
          mode: '2d',
          metadata: {
            prompt: '',
            prependTemplates: [],
            appendTemplates: [],
            width: gridConfig.tileWidth,
            height: gridConfig.tileHeight,
          },
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'spritesheet.png';
        a.click();
        URL.revokeObjectURL(a.href);
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
      disabled={isExporting || !hasContent}
      title={hasContent ? 'Export sheet to Vault + download' : 'Load or place something first'}
    />
  );
}
