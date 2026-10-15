// ModalTileViewer — zoomed cell preview (custom tile
// or live slice of the visible layers), Upload replace, manual chroma Key
// buttons (green/magenta, tolerance 120), per-tile SEND TO VAULT (pipeline law:
// tiles are individually sendable, carrying tile dims), Trash. AI generate =
// staged until the provider adapter era (S2).
'use client';
import { useEffect, useRef } from 'react';
import { Download, Droplet, Expand, Sparkles, Trash2, Upload } from 'lucide-react';
import { useSlicerStore, registerSlicerUrl } from '@/stores/domains/slicerStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { removeChromaKeyPixels } from '@/lib/imageUtils';
import { ModalBase } from '@/components/ui/ModalBase';

export function ModalTileViewer({ tileIndex, onClose }: { tileIndex: number | null; onClose: () => void }) {
  const { gridConfig, tiles, setTile, removeTile, layers } = useSlicerStore();
  const addItem = useVaultStore((s) => s.addItem);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tileData = tileIndex !== null ? tiles[tileIndex] : undefined;

  // render the cell: custom tile image, else the visible layers sliced
  useEffect(() => {
    if (tileIndex === null) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { tileWidth, tileHeight, columns } = gridConfig;
    canvas.width = tileWidth;
    canvas.height = tileHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, tileWidth, tileHeight);
    const c = tileIndex % columns;
    const r = Math.floor(tileIndex / columns);

    const drawLayerSlices = () => {
      layers.forEach((layer) => {
        if (!layer.visible || !layer.url) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const scale = img.naturalWidth / (columns * tileWidth);
          ctx.globalAlpha = layer.opacity ?? 1;
          ctx.drawImage(
            img,
            c * tileWidth * scale,
            r * tileHeight * scale,
            tileWidth * scale,
            tileHeight * scale,
            0,
            0,
            tileWidth,
            tileHeight,
          );
          ctx.globalAlpha = 1;
        };
        img.src = layer.url;
      });
    };

    if (tileData && !tileData.isErased) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ctx.drawImage(img, 0, 0, tileWidth, tileHeight);
      img.src = tileData.url;
    } else if (!tileData?.isErased) {
      drawLayerSlices();
    }
  }, [tileIndex, tileData, gridConfig, layers]);

  if (tileIndex === null) return null;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setTile(tileIndex, { url: registerSlicerUrl(URL.createObjectURL(file)), name: file.name });
    e.target.value = '';
  };

  const handleKey = async (rgb: { r: number; g: number; b: number }) => {
    // key the CURRENT cell render (custom tile or slice) — canvas is the truth
    const canvas = canvasRef.current;
    if (!canvas) return;
    const keyed = await removeChromaKeyPixels(canvas.toDataURL('image/png'), rgb, 120);
    setTile(tileIndex, { ...(tileData ?? {}), url: keyed, isErased: false });
  };

  const handleSendToVault = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) return;
    await addItem(blob, {
      name: tileData?.name ?? `slicer-tile-${tileIndex}.png`,
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
  };

  const actionBtn =
    'flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink';

  return (
    <ModalBase
      isOpen
      onClose={onClose}
      maxWidth="max-w-lg"
      title={
        <>
          <Expand size={16} className="shrink-0 text-orange-500" />
          <span className="truncate">Cell {tileIndex}</span>
          <span className="shrink-0 rounded bg-control px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {gridConfig.tileWidth}×{gridConfig.tileHeight}
          </span>
        </>
      }
      headerActions={
        <button
          onClick={handleSendToVault}
          className="group rounded p-1 text-green-600 transition-colors hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-900/20"
          title="Send this tile to the Vault"
        >
          <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />
        </button>
      }
    >
      <div className="space-y-4">
        <div className="checker-bg flex items-center justify-center rounded-lg border border-edge p-4">
          <canvas
            ref={canvasRef}
            className="max-h-64 max-w-full border border-edge/50"
            style={{ imageRendering: 'pixelated', width: 'auto', height: 'auto', minWidth: 96 }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => fileRef.current?.click()} className={actionBtn}>
            <Upload size={14} /> Replace
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

          <button onClick={() => handleKey({ r: 0, g: 255, b: 0 })} className={actionBtn} title="Key out green">
            <Droplet size={14} className="text-green-500" /> Key G
          </button>
          <button onClick={() => handleKey({ r: 255, g: 0, b: 255 })} className={actionBtn} title="Key out magenta">
            <Droplet size={14} className="text-fuchsia-500" /> Key M
          </button>

          <button
            disabled
            className="flex cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-edge px-2.5 py-1.5 text-xs text-ink-muted opacity-45"
            title="AI generate — pending provider adapter wiring (S2)"
          >
            <Sparkles size={14} /> AI
          </button>

          <button
            onClick={() => {
              removeTile(tileIndex);
              onClose();
            }}
            disabled={!tileData}
            className={`ml-auto flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              tileData
                ? 'border-edge text-ink-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30'
                : 'cursor-not-allowed border-edge text-ink-muted opacity-40'
            }`}
          >
            <Trash2 size={14} /> Clear cell
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
