// StitcherSourcePanel — left pane of the split workspace: active
// source sheet under a cell grid; pointer-capture MARQUEE selection with
// shift-extend (dbl-click = select all); the purple selection box drags out as
// a typed JSON payload. Bottom: source gallery strip. Zoom math law:
// overlay lives in unscaled image space, pointer coords divide by scale once.
'use client';
import { useEffect, useRef, useState } from 'react';
import { MousePointer2, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useStitcherStore, registerStitcherUrl } from '@/stores/domains/stitcherStore';
import { useVaultStore } from '@/stores/core/vaultStore';

export function StitcherSourcePanel() {
  const {
    sourceImages,
    activeSourceId,
    setActiveSourceId,
    removeSourceImage,
    addSourceImage,
    cellWidth,
    cellHeight,
    sourceSelection,
    setSourceSelection,
    setDraggedSelection,
  } = useStitcherStore();

  const activeImg = sourceImages.find((img) => img.id === activeSourceId);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ c: number; r: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => setImgSize(null), [activeSourceId]);

  const cellFromEvent = (e: React.PointerEvent) => {
    const el = overlayRef.current;
    if (!el || !imgSize) return null;
    const rect = el.getBoundingClientRect();
    // pointer capture lets drags run off the image — clamp to the grid
    const x = Math.max(0, Math.min((e.clientX - rect.left) / scale, imgSize.w - 1));
    const y = Math.max(0, Math.min((e.clientY - rect.top) / scale, imgSize.h - 1));
    const maxC = Math.max(0, Math.ceil(imgSize.w / cellWidth) - 1);
    const maxR = Math.max(0, Math.ceil(imgSize.h / cellHeight) - 1);
    return {
      c: Math.min(Math.floor(x / cellWidth), maxC),
      r: Math.min(Math.floor(y / cellHeight), maxR),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!activeImg) return;
    if ((e.target as HTMLElement).closest('.source-selection-draggable')) return;
    const cell = cellFromEvent(e);
    if (!cell) return;

    if (e.shiftKey && sourceSelection) {
      const minCol = Math.min(sourceSelection.col, cell.c);
      const maxCol = Math.max(sourceSelection.col + sourceSelection.width - 1, cell.c);
      const minRow = Math.min(sourceSelection.row, cell.r);
      const maxRow = Math.max(sourceSelection.row + sourceSelection.height - 1, cell.r);
      setSourceSelection({ col: minCol, row: minRow, width: maxCol - minCol + 1, height: maxRow - minRow + 1 });
      setStartPoint({ c: cell.c === minCol ? maxCol : minCol, r: cell.r === minRow ? maxRow : minRow });
    } else {
      setStartPoint(cell);
      setSourceSelection({ col: cell.c, row: cell.r, width: 1, height: 1 });
    }
    setIsDrawing(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !startPoint) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    setSourceSelection({
      col: Math.min(startPoint.c, cell.c),
      row: Math.min(startPoint.r, cell.r),
      width: Math.abs(startPoint.c - cell.c) + 1,
      height: Math.abs(startPoint.r - cell.r) + 1,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const vaultId = e.dataTransfer.getData('application/x-nro-vault-item');
    if (vaultId) {
      const item = useVaultStore.getState().items.find((i) => i.id === vaultId);
      if (item?.url && item.mime.startsWith('image/')) addSourceImage(item.url);
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) addSourceImage(registerStitcherUrl(URL.createObjectURL(file)));
  };

  return (
    <div
      className="flex h-full w-full flex-col border-b border-edge md:w-1/2 md:border-b-0 md:border-r"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-nro-vault-item') || e.dataTransfer.types.includes('Files'))
          e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      {/* pane title bar + zoom cluster */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-edge px-4">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">Active Source</span>
        <div className="flex items-center gap-1 rounded border border-edge bg-surface-raised p-0.5">
          <button onClick={() => setScale((s) => Math.max(0.1, s - 0.25))} className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-sunken" title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <button onClick={() => setScale(1)} className="min-w-[3rem] px-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink" title="Reset zoom">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => setScale((s) => Math.min(5, s + 0.25))} className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-sunken" title="Zoom in">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* zoom/pan body */}
      <div className="scrollbars relative min-h-0 flex-1 overflow-auto">
        {activeImg ? (
          <div className="flex h-max min-h-full w-max min-w-full p-8">
            {/* the checker WELL: fixed (unscaled) pattern, centered, clips the
                scaled image — no stretch, no edge bleed */}
            <div
              className="checker-bg relative m-auto box-content overflow-hidden rounded border border-edge shadow-xl"
              style={{
                width: imgSize ? Math.round(imgSize.w * scale) : 'auto',
                height: imgSize ? Math.round(imgSize.h * scale) : 'auto',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImg.url}
                alt="Active source"
                draggable={false}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth) setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
                }}
                className="absolute left-0 top-0 block max-w-none"
                style={{
                  imageRendering: 'pixelated',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: imgSize?.w || 'auto',
                  height: imgSize?.h || 'auto',
                }}
              />
              {imgSize && (
                <div
                  ref={overlayRef}
                  className="absolute left-0 top-0 z-20 cursor-crosshair"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onDoubleClick={() => {
                    const cols = Math.floor(imgSize.w / cellWidth);
                    const rows = Math.floor(imgSize.h / cellHeight);
                    if (cols > 0 && rows > 0) setSourceSelection({ col: 0, row: 0, width: cols, height: rows });
                  }}
                  style={{
                    width: imgSize.w * scale,
                    height: imgSize.h * scale,
                  }}
                >
                  {/* grid lines: unscaled space, scaled visually as one unit */}
                  <div
                    className="pointer-events-none absolute left-0 top-0"
                    style={{
                      width: imgSize.w,
                      height: imgSize.h,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      backgroundSize: `${cellWidth}px ${cellHeight}px`,
                      backgroundImage:
                        'linear-gradient(to right, rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.35) 1px, transparent 1px)',
                    }}
                  />
                  {/* selection box: DIRECT child of the UNtransformed overlay,
                      positioned in scaled coords — Chromium cancels HTML5 drags
                      started inside transformed subtrees, so the draggable
                      must never live under a transform */}
                  {sourceSelection && (
                    <div
                      draggable
                      onDragStart={(e) => {
                        const payload = { type: 'stitcher_selection', sourceId: activeSourceId as string, ...sourceSelection };
                        e.dataTransfer.setData('application/json', JSON.stringify(payload));
                        e.dataTransfer.effectAllowed = 'copy';
                        setDraggedSelection(payload);
                      }}
                      onDragEnd={() => setDraggedSelection(null)}
                      className="source-selection-draggable absolute z-30 flex cursor-grab items-center justify-center border-2 border-purple-400 bg-purple-500/20 opacity-90 shadow-[0_0_10px_rgba(168,85,247,0.5)] hover:opacity-100 active:cursor-grabbing"
                      style={{
                        left: sourceSelection.col * cellWidth * scale,
                        top: sourceSelection.row * cellHeight * scale,
                        width: sourceSelection.width * cellWidth * scale,
                        height: sourceSelection.height * cellHeight * scale,
                      }}
                    >
                      <div className="pointer-events-none rounded bg-black/50 p-1 text-white backdrop-blur-sm">
                        <MousePointer2 size={14} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full max-w-sm flex-col items-start justify-center gap-4 px-8 text-ink-muted">
            <MousePointer2 size={48} className="opacity-20" />
            <p className="text-sm">Source sheets land here, ready for slicing and mapping.</p>
            <p className="text-xs opacity-60">
              Drop an image (Vault or file), marquee cells on the grid — or double-click to select all — then drag the
              purple box onto the composite canvas.
            </p>
          </div>
        )}
      </div>

      {/* source gallery strip */}
      <div className="flex h-20 shrink-0 items-center gap-2 overflow-x-auto border-t border-edge bg-surface-raised/50 p-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-14 w-14 min-w-[56px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-edge text-ink-muted transition-colors hover:border-edge-strong/40 hover:text-ink"
          title="Add a source image"
        >
          <Upload size={14} />
          <span className="text-[9px] font-semibold uppercase">Add</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addSourceImage(registerStitcherUrl(URL.createObjectURL(file)));
            e.target.value = '';
          }}
        />
        {sourceImages.length === 0 ? (
          <div className="w-full text-center text-xs italic text-ink-muted">
            Send an image from the Vault (or Add) to start
          </div>
        ) : (
          sourceImages.map((img) => (
            <div
              key={img.id}
              onClick={() => setActiveSourceId(img.id)}
              className={`checker-bg group relative h-14 w-14 min-w-[56px] cursor-pointer overflow-hidden rounded-md border-2 shadow-sm transition-all ${
                activeSourceId === img.id ? 'scale-105 border-purple-500' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="Source" className="h-full w-full object-contain" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSourceImage(img.id);
                }}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
