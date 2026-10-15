// FlowSourcePanel — left pane: source image well + Target Config
// card (dims/grid + the CELL-AWARE resize algorithms: Naive Stretch · Centered
// Pad/Crop 1:1 · Proportional Fit — with the bottom-center "feet grounded"
// alignment law) → Process writes onto the ACTIVE layer. Dual drop contract:
// vault items + OS files.
'use client';
import { useRef } from 'react';
import { Image as ImageIcon, Play, Settings2, Trash2, Upload } from 'lucide-react';
import { useFlowStore, registerFlowUrl } from '@/stores/domains/flowStore';
import { useVaultStore } from '@/stores/core/vaultStore';

const inputCls =
  'w-full rounded border border-edge bg-surface p-1.5 text-sm text-ink outline-none transition-colors focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50';
const selectCls = inputCls + ' cursor-pointer';

export function FlowSourcePanel() {
  const {
    sourceImage,
    setSourceImage,
    targetWidth,
    targetHeight,
    setTargetDimensions,
    gridCols,
    gridRows,
    setGridConfig,
    resizeMode,
    setResizeMode,
    align,
    setAlign,
    activeLayerId,
    updateLayerDataUrl,
  } = useFlowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSourceImage(registerFlowUrl(URL.createObjectURL(file)));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const vaultId = e.dataTransfer.getData('application/x-nro-vault-item');
    if (vaultId) {
      const item = useVaultStore.getState().items.find((i) => i.id === vaultId);
      if (item?.url && item.mime.startsWith('image/')) setSourceImage(item.url);
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  /** The resize engine, verbatim battle-tested math: stretch | pad-crop | fit-align. */
  const handleResize = () => {
    if (!sourceImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      if (resizeMode === 'stretch') {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      } else {
        const sourceCellW = img.width / gridCols;
        const sourceCellH = img.height / gridRows;
        const targetCellW = targetWidth / gridCols;
        const targetCellH = targetHeight / gridRows;

        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            const srcX = col * sourceCellW;
            const srcY = row * sourceCellH;
            const dstX = col * targetCellW;
            const dstY = row * targetCellH;

            if (resizeMode === 'pad-crop') {
              const drawX = dstX + (targetCellW - sourceCellW) / 2;
              let drawY = dstY + (targetCellH - sourceCellH) / 2;
              if (align === 'bottom-center') drawY = dstY + (targetCellH - sourceCellH);
              ctx.drawImage(img, srcX, srcY, sourceCellW, sourceCellH, drawX, drawY, sourceCellW, sourceCellH);
            } else {
              const scale = Math.min(targetCellW / sourceCellW, targetCellH / sourceCellH);
              const scaledW = sourceCellW * scale;
              const scaledH = sourceCellH * scale;
              const drawX = dstX + (targetCellW - scaledW) / 2;
              let drawY = dstY + (targetCellH - scaledH) / 2;
              if (align === 'bottom-center') drawY = dstY + (targetCellH - scaledH);
              ctx.drawImage(img, srcX, srcY, sourceCellW, sourceCellH, drawX, drawY, scaledW, scaledH);
            }
          }
        }
      }
      updateLayerDataUrl(activeLayerId, canvas.toDataURL('image/png'));
    };
  };

  return (
    <div
      className="flex w-full shrink-0 flex-col border-b border-edge md:min-w-[300px] md:w-1/3 md:border-b-0 md:border-r"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-edge px-4">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-ink-muted">
          <ImageIcon size={14} /> Source
        </h2>
        {sourceImage && (
          <button
            onClick={() => setSourceImage(null)}
            className="rounded p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30"
            title="Clear source"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {sourceImage ? (
          <div className="checker-bg mb-4 flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-edge p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceImage} alt="Source" className="pointer-events-none max-h-full max-w-full object-contain" style={{ imageRendering: 'pixelated' }} />
          </div>
        ) : (
          <div
            className="mb-4 flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-edge text-ink-muted transition-all hover:border-edge-strong/40 hover:bg-surface-sunken/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mb-2" />
            <span className="text-sm font-medium">Click or drag & drop</span>
            <span className="mt-1 text-xs opacity-60">Vault items welcome too</span>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadFile(f);
            e.target.value = '';
          }}
          accept="image/*"
          className="hidden"
        />

        <div className="rounded-lg border border-edge bg-surface-raised/60 p-4">
          <div className="mb-4 flex items-center gap-2 border-b border-edge pb-2 text-sm font-medium text-ink">
            <Settings2 size={16} className="text-indigo-600 dark:text-indigo-400" /> Target Config
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Target Width</span>
              <input type="number" value={targetWidth} onChange={(e) => setTargetDimensions(parseInt(e.target.value) || 0, targetHeight)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Target Height</span>
              <input type="number" value={targetHeight} onChange={(e) => setTargetDimensions(targetWidth, parseInt(e.target.value) || 0)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Grid Cols</span>
              <input type="number" value={gridCols} onChange={(e) => setGridConfig(parseInt(e.target.value) || 1, gridRows)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Grid Rows</span>
              <input type="number" value={gridRows} onChange={(e) => setGridConfig(gridCols, parseInt(e.target.value) || 1)} className={inputCls} />
            </label>
          </div>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Algorithm Mode</span>
            <select value={resizeMode} onChange={(e) => setResizeMode(e.target.value as typeof resizeMode)} className={selectCls}>
              <option value="stretch">Naive Stretch Map</option>
              <option value="pad-crop">Centered Pad/Crop (1:1 pixels)</option>
              <option value="fit-align">Proportional Uniform Scale</option>
            </select>
          </label>

          {(resizeMode === 'pad-crop' || resizeMode === 'fit-align') && (
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Cell Alignment</span>
              <select value={align} onChange={(e) => setAlign(e.target.value as typeof align)} className={selectCls}>
                <option value="center">Centered</option>
                <option value="bottom-center">Bottom Center (Grounded)</option>
              </select>
            </label>
          )}

          <button
            onClick={handleResize}
            disabled={!sourceImage}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={16} fill="currentColor" /> Process Image
          </button>
        </div>
      </div>
    </div>
  );
}
