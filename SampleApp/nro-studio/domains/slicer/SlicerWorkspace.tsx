// SlicerWorkspace — the battle-tested single-canvas mechanics:
// virtualized canvas draw (±2-cell buffer, DPR-aware, rAF), refs-not-state on
// the hot path (scroll/hover/drag), image caches with dirty checks, Cell|Full
// drop modes, toast + delete-confirm. Adapted to Blob-vault (draggedItem.url,
// typed drag payload) and tokens.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, MousePointerSquareDashed, Scissors, Trash2, Upload } from 'lucide-react';
import { useSlicerStore, registerSlicerUrl } from '@/stores/domains/slicerStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { ModalTileViewer } from './ModalTileViewer';

const GAP = 8;
const PADDING = 32;

export function SlicerWorkspace() {
  const {
    gridConfig,
    tiles,
    setTile,
    selectedTile,
    setSelectedTile,
    layers,
    activeLayerId,
    loadAssetToActiveLayer,
    clearCanvas,
    removeTile,
  } = useSlicerStore();
  const draggedItem = useVaultStore((s) => s.draggedItem);

  const [viewingTileIndex, setViewingTileIndex] = useState<number | null>(null);
  const [dropMode, setDropMode] = useState<'cell' | 'full'>('full');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef({ top: 0, left: 0 });
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  const layerImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const patternRef = useRef<CanvasPattern | null>(null);
  const interactionsRef = useRef({
    hoveredIdx: null as number | null,
    selectedIdx: selectedTile,
    dropMode,
    isDragOverFull: false,
  });

  const { rows, columns, tileWidth, tileHeight } = gridConfig;
  const cellStrideW = tileWidth + GAP;
  const cellStrideH = tileHeight + GAP;
  const totalWidth = columns * cellStrideW - GAP;
  const totalHeight = rows * cellStrideH - GAP;

  const draggedUrl = () => {
    const item = useVaultStore.getState().draggedItem;
    return item?.url && item.mime.startsWith('image/') ? item.url : null;
  };

  /** Grid origin: centered while it fits the viewport, PADDING once it scrolls.
   *  MUST be shared by draw + pointer math or clicks drift. */
  const getOrigin = (config: { columns: number; rows: number; tileWidth: number; tileHeight: number }) => {
    const vp = viewportSizeRef.current;
    const totalW = config.columns * (config.tileWidth + GAP) - GAP;
    const totalH = config.rows * (config.tileHeight + GAP) - GAP;
    return {
      x: Math.max(PADDING, Math.floor((vp.width - totalW) / 2)),
      y: Math.max(PADDING, Math.floor((vp.height - totalH) / 2)),
    };
  };

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = useSlicerStore.getState();
    const config = state.gridConfig;
    const currentTiles = state.tiles;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const scroll = scrollPosRef.current;
    const origin = getOrigin(config);
    ctx.translate(-Math.floor(scroll.left) + origin.x, -Math.floor(scroll.top) + origin.y);

    const strideW = config.tileWidth + GAP;
    const strideH = config.tileHeight + GAP;
    const vp = viewportSizeRef.current;

    // virtualization window (+2-cell buffer)
    const BUFFER = 2;
    const startCol = Math.max(0, Math.floor(scroll.left / strideW) - BUFFER);
    const endCol = Math.min(config.columns - 1, Math.floor((scroll.left + vp.width) / strideW) + BUFFER);
    const startRow = Math.max(0, Math.floor(scroll.top / strideH) - BUFFER);
    const endRow = Math.min(config.rows - 1, Math.floor((scroll.top + vp.height) / strideH) + BUFFER);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const idx = r * config.columns + c;
        const x = c * strideW;
        const y = r * strideH;
        const width = config.tileWidth;
        const height = config.tileHeight;

        if (patternRef.current) {
          ctx.save();
          ctx.translate(x, y);
          ctx.fillStyle = patternRef.current;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }

        // layers, sliced by source-rect math
        state.layers.forEach((layer) => {
          if (!layer.visible || !layer.url) return;
          const layerImg = layerImagesRef.current[layer.id];
          if (layerImg?.complete && layerImg.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = layer.opacity ?? 1;
            const expectedWidth = config.columns * width;
            const scale = layerImg.naturalWidth / expectedWidth;
            const sx = c * width * scale;
            const sy = r * height * scale;
            const sW = width * scale;
            const sH = height * scale;
            if (sx < layerImg.naturalWidth && sy < layerImg.naturalHeight) {
              const swClipped = Math.min(sW, layerImg.naturalWidth - sx);
              const shClipped = Math.min(sH, layerImg.naturalHeight - sy);
              ctx.drawImage(layerImg, sx, sy, swClipped, shClipped, x, y, (swClipped / sW) * width, (shClipped / sH) * height);
            }
            ctx.restore();
          }
        });

        // per-cell override (erased = punched hole)
        const customTile = currentTiles[idx];
        if (customTile?.isErased) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillRect(x, y, width, height);
          ctx.restore();
          if (patternRef.current) {
            ctx.save();
            ctx.translate(x, y);
            ctx.fillStyle = patternRef.current;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          }
        } else {
          const cached = customTile ? imageCacheRef.current[customTile.url] : null;
          if (cached?.complete && cached.naturalWidth > 0) ctx.drawImage(cached, x, y, width, height);
        }

        // cell-mode drag ghost
        const dragUrl = draggedUrl();
        if (interactionsRef.current.hoveredIdx === idx && dragUrl && interactionsRef.current.dropMode === 'cell') {
          const draggedImg = imageCacheRef.current[dragUrl];
          if (draggedImg?.complete && draggedImg.naturalWidth > 0) {
            ctx.globalAlpha = 0.6;
            ctx.drawImage(draggedImg, x, y, width, height);
            ctx.globalAlpha = 1.0;
          } else if (!draggedImg) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => requestAnimationFrame(() => interactionsRef.current.hoveredIdx === idx && drawGrid());
            img.src = dragUrl;
            imageCacheRef.current[dragUrl] = img;
          }
        }

        // selection / hover chrome
        if (interactionsRef.current.selectedIdx === idx) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
        } else if (interactionsRef.current.hoveredIdx === idx) {
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(x, y, width, height);
          ctx.fillStyle = 'white';
          ctx.font = '500 10px var(--font-sans), sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.fillText(idx.toString(), x + width / 2, y + height / 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    // full-mode drag ghost: whole sheet + grid border
    if (interactionsRef.current.dropMode === 'full') {
      const dragUrl = draggedUrl();
      if (dragUrl && interactionsRef.current.isDragOverFull) {
        const draggedImg = imageCacheRef.current[dragUrl];
        if (draggedImg?.complete && draggedImg.naturalWidth > 0) {
          ctx.globalAlpha = 0.4;
          const expectedWidth = config.columns * config.tileWidth;
          const scale = expectedWidth / draggedImg.naturalWidth;
          ctx.drawImage(draggedImg, 0, 0, draggedImg.naturalWidth * scale, draggedImg.naturalHeight * scale);
          ctx.globalAlpha = 1.0;
        } else if (!draggedImg) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => requestAnimationFrame(() => interactionsRef.current.isDragOverFull && drawGrid());
          img.src = dragUrl;
          imageCacheRef.current[dragUrl] = img;
        }
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 4;
        ctx.strokeRect(-2, -2, config.columns * strideW + 4, config.rows * strideH + 4);
      }
    }

    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- redraw triggers ----
  useEffect(() => {
    if (interactionsRef.current.selectedIdx !== selectedTile) {
      interactionsRef.current.selectedIdx = selectedTile;
      requestAnimationFrame(drawGrid);
    }
  }, [selectedTile, drawGrid]);

  useEffect(() => {
    requestAnimationFrame(drawGrid);
  }, [gridConfig, draggedItem, drawGrid]);

  useEffect(() => {
    interactionsRef.current.dropMode = dropMode;
    requestAnimationFrame(drawGrid);
  }, [dropMode, drawGrid]);

  useEffect(() => {
    let updated = false;
    Object.values(tiles).forEach((t) => {
      if (t?.url && !imageCacheRef.current[t.url]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => requestAnimationFrame(drawGrid);
        img.src = t.url;
        imageCacheRef.current[t.url] = img;
        updated = true;
      }
    });
    if (!updated) requestAnimationFrame(drawGrid);
  }, [tiles, drawGrid]);

  useEffect(() => {
    let updated = false;
    layers.forEach((layer) => {
      if (layer.url && layerImagesRef.current[layer.id]?.dataset?.originalUrl !== layer.url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.dataset.originalUrl = layer.url;
        img.onload = () => requestAnimationFrame(drawGrid);
        img.src = layer.url;
        layerImagesRef.current[layer.id] = img;
        updated = true;
      }
    });
    if (!updated) requestAnimationFrame(drawGrid);
  }, [layers, drawGrid]);

  // checkered pattern (neutral, reads in both themes)
  useEffect(() => {
    const pcanvas = document.createElement('canvas');
    pcanvas.width = 16;
    pcanvas.height = 16;
    const pctx = pcanvas.getContext('2d')!;
    pctx.fillStyle = 'rgba(148,163,184,0.22)';
    pctx.fillRect(0, 0, 16, 16);
    pctx.fillStyle = 'rgba(148,163,184,0.08)';
    pctx.fillRect(0, 0, 8, 8);
    pctx.fillRect(8, 8, 8, 8);
    const mainCtx = canvasRef.current?.getContext('2d');
    if (mainCtx) {
      patternRef.current = mainCtx.createPattern(pcanvas, 'repeat');
      requestAnimationFrame(drawGrid);
    }
  }, [drawGrid]);

  // scroll + resize observers (passive, rAF-batched)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleScroll = () => {
      scrollPosRef.current = { top: el.scrollTop, left: el.scrollLeft };
      requestAnimationFrame(drawGrid);
    };
    const handleResize = () => {
      viewportSizeRef.current = { width: el.clientWidth, height: el.clientHeight };
      requestAnimationFrame(drawGrid);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [drawGrid]);

  // ---- input helpers ----
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  /** Drop payload resolution: vault item id → object URL · data-URI text · OS file. */
  const getDropImageUrl = async (e: React.DragEvent): Promise<string | null> => {
    const vaultId = e.dataTransfer.getData('application/x-nro-vault-item');
    if (vaultId) {
      const item = useVaultStore.getState().items.find((i) => i.id === vaultId);
      if (item?.url && item.mime.startsWith('image/')) return item.url;
      return null;
    }
    const textData = e.dataTransfer.getData('text/plain');
    if (textData?.startsWith('data:image')) return textData;
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) return registerSlicerUrl(URL.createObjectURL(file));
    return null;
  };

  const getCoordsFromEvent = (e: React.MouseEvent | React.DragEvent) => {
    const config = useSlicerStore.getState().gridConfig;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const origin = getOrigin(config);
    const x = e.clientX - rect.left + scrollPosRef.current.left - origin.x;
    const y = e.clientY - rect.top + scrollPosRef.current.top - origin.y;
    if (x < 0 || y < 0) return null;
    const strideW = config.tileWidth + GAP;
    const strideH = config.tileHeight + GAP;
    const c = Math.floor(x / strideW);
    const r = Math.floor(y / strideH);
    if (c >= config.columns || r >= config.rows || x % strideW > config.tileWidth || y % strideH > config.tileHeight)
      return null;
    return r * config.columns + c;
  };

  const handleImportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (dropMode === 'cell') {
      if (selectedTile === null) {
        showToast('Please select a cell');
        e.target.value = '';
        return;
      }
      setTile(selectedTile, { url: registerSlicerUrl(URL.createObjectURL(file)), name: file.name });
    } else {
      loadAssetToActiveLayer(registerSlicerUrl(URL.createObjectURL(file)));
    }
    e.target.value = '';
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    const idx = getCoordsFromEvent(e);
    if (interactionsRef.current.hoveredIdx !== idx) {
      interactionsRef.current.hoveredIdx = idx;
      requestAnimationFrame(drawGrid);
    }
  };

  const handlePointerLeave = () => {
    if (interactionsRef.current.hoveredIdx !== null) {
      interactionsRef.current.hoveredIdx = null;
      requestAnimationFrame(drawGrid);
    }
  };

  const handleViewportDragLeave = () => {
    if (interactionsRef.current.isDragOverFull) {
      interactionsRef.current.isDragOverFull = false;
      requestAnimationFrame(drawGrid);
    }
    handlePointerLeave();
  };

  const handleViewportDragOver = (e: React.DragEvent) => {
    if (dropMode === 'full') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!interactionsRef.current.isDragOverFull) {
        interactionsRef.current.isDragOverFull = true;
        requestAnimationFrame(drawGrid);
      }
      return;
    }
    const idx = getCoordsFromEvent(e);
    if (idx !== null) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (interactionsRef.current.hoveredIdx !== idx) {
        interactionsRef.current.hoveredIdx = idx;
        requestAnimationFrame(drawGrid);
      }
    } else if (interactionsRef.current.hoveredIdx !== null) {
      interactionsRef.current.hoveredIdx = null;
      requestAnimationFrame(drawGrid);
    }
  };

  const handleViewportDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    handleViewportDragLeave();
    const url = await getDropImageUrl(e);
    if (!url) return;
    if (dropMode === 'full') {
      loadAssetToActiveLayer(url);
    } else {
      const idx = getCoordsFromEvent(e);
      if (idx !== null) setTile(idx, { url });
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-4">
      {/* header — 3-col archetype: identity · mode toggle · actions */}
      <div className="mb-4 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2">
          <Scissors size={17} className="text-orange-600 dark:text-orange-400" />
          <h2 className="whitespace-nowrap text-sm font-medium text-ink">Slicer</h2>
        </div>

        <div className="flex items-center rounded-lg border border-edge-strong/20 bg-track p-1 dark:border-edge">
          <button
            onClick={() => setDropMode('cell')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              dropMode === 'cell' ? 'bg-surface-raised text-ink shadow' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <MousePointerSquareDashed size={14} /> Cell
          </button>
          <button
            onClick={() => setDropMode('full')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              dropMode === 'full' ? 'bg-surface-raised text-ink shadow' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <ImageIcon size={14} /> Full
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title={dropMode === 'cell' ? 'Delete selected cell' : 'Clear active layer'}
            disabled={dropMode === 'cell' && selectedTile === null}
            className={`flex h-[34px] w-8 items-center justify-center rounded border shadow-sm transition-colors ${
              dropMode === 'cell' && selectedTile === null
                ? 'cursor-not-allowed border-edge bg-surface-sunken text-ink-muted opacity-40 shadow-none'
                : 'cursor-pointer border-edge-strong/20 bg-surface-raised text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-edge dark:text-red-400 dark:hover:bg-red-950/30'
            }`}
          >
            <Trash2 size={14} />
          </button>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded border border-edge-strong/20 bg-surface-raised px-3 py-1.5 text-sm text-ink shadow-sm transition-colors hover:bg-control dark:border-edge">
            <Upload size={14} /> <span className="hidden sm:inline">Import</span>
            <input type="file" className="hidden" accept="image/png,image/webp,image/jpeg" onChange={handleImportUpload} />
          </label>
        </div>
      </div>

      {/* viewport: canvas paints (z-0), overlay scrolls + hits (z-10) */}
      <section
        aria-label="Slicer viewport"
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-edge bg-surface-sunken/50 shadow-inner"
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 block" style={{ width: '100%', height: '100%' }} />
        <div
          ref={viewportRef}
          className="scrollbars absolute inset-0 z-10 cursor-crosshair overflow-auto"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onClick={(e) => {
            const idx = getCoordsFromEvent(e);
            if (idx !== null) setSelectedTile(idx);
          }}
          onDoubleClick={(e) => {
            const idx = getCoordsFromEvent(e);
            if (idx !== null) setViewingTileIndex(idx);
          }}
          onDragOver={handleViewportDragOver}
          onDragLeave={handleViewportDragLeave}
          onDrop={handleViewportDrop}
        >
          <div style={{ width: totalWidth + PADDING * 2, height: totalHeight + PADDING * 2 }} />
        </div>

        {toastMessage && (
          <div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-xl">
            {toastMessage}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
            <div className="vibe-card w-72 p-4" onClick={(e) => e.stopPropagation()}>
              <p className="mb-4 text-sm text-ink">
                {dropMode === 'cell' ? `Delete the contents of cell ${selectedTile}?` : `Clear the "${layers.find((l) => l.id === activeLayerId)?.name ?? 'active'}" layer and all cells?`}
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-edge px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-sunken">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (dropMode === 'cell' && selectedTile !== null) removeTile(selectedTile);
                    else clearCanvas();
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <ModalTileViewer tileIndex={viewingTileIndex} onClose={() => setViewingTileIndex(null)} />
    </div>
  );
}
