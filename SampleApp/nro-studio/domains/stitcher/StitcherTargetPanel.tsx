// StitcherTargetPanel — right pane of the split workspace: the
// composite output grid. Accepts 'stitcher_selection' JSON drops (typed-payload
// guard, hover ghost preview), renders placements layer-by-layer as CSS crop
// windows (background-position trick — refs, never copied pixels), hover-trash,
// active ring; arrow keys nudge the active placement's pixel offset.
'use client';
import { useEffect, useRef, useState } from 'react';
import { Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { useStitcherStore } from '@/stores/domains/stitcherStore';

export function StitcherTargetPanel() {
  const {
    cellWidth,
    cellHeight,
    targetCols,
    targetRows,
    placements,
    addPlacement,
    removePlacement,
    activePlacementId,
    setActivePlacementId,
    updatePlacementOffset,
    movePlacement,
    sourceImages,
    layers,
    activeLayerId,
    draggedSelection,
  } = useStitcherStore();

  const gridRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [dragHoverPoint, setDragHoverPoint] = useState<{ c: number; r: number } | null>(null);

  // drag-to-move placed objects: pointer-based,
  // live preview in unscaled px; release SNAPS to the grid — Shift = free-place
  const [livePos, setLivePos] = useState<{ id: string; left: number; top: number } | null>(null);
  const moveRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    baseLeft: number;
    baseTop: number;
    moved: boolean;
  } | null>(null);

  const clampCell = (v: number, max: number) => Math.max(0, Math.min(v, max - 1));

  const handleMoveDown = (e: React.PointerEvent, id: string, baseLeft: number, baseTop: number) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return; // trash overlay
    moveRef.current = { id, startX: e.clientX, startY: e.clientY, baseLeft, baseTop, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMoveMove = (e: React.PointerEvent) => {
    const move = moveRef.current;
    if (!move) return;
    const dx = (e.clientX - move.startX) / scale;
    const dy = (e.clientY - move.startY) / scale;
    if (!move.moved && Math.abs(dx) + Math.abs(dy) > 3) move.moved = true;
    if (move.moved) setLivePos({ id: move.id, left: move.baseLeft + dx, top: move.baseTop + dy });
  };

  const handleMoveUp = (e: React.PointerEvent, id: string, isActive: boolean) => {
    const move = moveRef.current;
    moveRef.current = null;
    if (!move || move.id !== id) return;
    if (!move.moved) {
      // plain click = select toggle (drag threshold not crossed)
      setActivePlacementId(isActive ? null : id);
      setLivePos(null);
      return;
    }
    const left = move.baseLeft + (e.clientX - move.startX) / scale;
    const top = move.baseTop + (e.clientY - move.startY) / scale;
    if (e.shiftKey) {
      // free-place: keep the pixel remainder as offset
      const col = clampCell(Math.floor(left / cellWidth), targetCols);
      const row = clampCell(Math.floor(top / cellHeight), targetRows);
      movePlacement(id, col, row, Math.round(left - col * cellWidth), Math.round(top - row * cellHeight));
    } else {
      // grid tool: snap to the nearest cell
      movePlacement(
        id,
        clampCell(Math.round(left / cellWidth), targetCols),
        clampCell(Math.round(top / cellHeight), targetRows),
        0,
        0,
      );
    }
    setLivePos(null);
  };

  // arrow-key nudge for the active placement (Shift = 8px)
  useEffect(() => {
    if (!activePlacementId) return;
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 8 : 1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        updatePlacementOffset(activePlacementId, move[0], move[1]);
      }
      if (e.key === 'Escape') setActivePlacementId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePlacementId, updatePlacementOffset, setActivePlacementId]);

  const cellFromDrag = (e: React.DragEvent) => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { c: Math.floor(x / cellWidth), r: Math.floor(y / cellHeight) };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const cell = cellFromDrag(e);
    if (cell && (dragHoverPoint?.c !== cell.c || dragHoverPoint?.r !== cell.r)) setDragHoverPoint(cell);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragHoverPoint(null);
    try {
      // payload first; STORE MIRROR fallback (dragstart sets draggedSelection —
      // survives any dataTransfer quirk, same defense as the Vault's pattern)
      const dataStr = e.dataTransfer.getData('application/json');
      const data = dataStr
        ? JSON.parse(dataStr)
        : (() => {
            const mirror = useStitcherStore.getState().draggedSelection;
            return mirror ? { type: 'stitcher_selection', ...mirror } : null;
          })();
      if (!data || data.type !== 'stitcher_selection') return;
      const cell = cellFromDrag(e);
      if (!cell || cell.c >= targetCols || cell.r >= targetRows) return;
      addPlacement({
        sourceId: data.sourceId,
        sourceCol: data.col,
        sourceRow: data.row,
        width: data.width,
        height: data.height,
        targetCol: cell.c,
        targetRow: cell.r,
        layerId: activeLayerId,
      });
    } catch (err) {
      console.warn('Invalid drop on Stitcher target', err);
    }
  };

  return (
    <div className="flex h-full w-full flex-col md:w-1/2">
      {/* pane title bar + zoom cluster */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-edge px-4">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">Composite Output</span>
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

      <div className="scrollbars relative min-h-0 flex-1 overflow-auto">
        {/* w-max/h-max = grow to zoomed content (scrollable); min-full = never
            smaller than the viewport (m-auto centering when it fits) */}
        <div className="flex h-max min-h-full w-max min-w-full p-8">
          {/* checker WELL: unscaled pattern on the wrapper — the scaled grid
              inside carries ONLY its cell lines (mixing them on one element
              let the checker's background-position list shift the lines) */}
          <div
            className="checker-bg relative m-auto box-content overflow-hidden border border-edge shadow-xl"
            style={{
              width: Math.round(targetCols * cellWidth * scale),
              height: Math.round(targetRows * cellHeight * scale),
            }}
          >
            <div
              ref={gridRef}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragHoverPoint(null)}
              onDrop={handleDrop}
              onClick={() => setActivePlacementId(null)}
              className="absolute left-0 top-0"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: targetCols * cellWidth,
                height: targetRows * cellHeight,
                backgroundSize: `${cellWidth}px ${cellHeight}px`,
                backgroundPosition: '0 0',
                backgroundImage:
                  'linear-gradient(to right, rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.35) 1px, transparent 1px)',
              }}
            >
              {/* placements, back-to-front per layer order */}
              {[...layers].reverse().map((layer) => {
                if (!layer.visible) return null;
                return placements
                  .filter((p) => p.layerId === layer.id)
                  .map((p) => {
                    const src = sourceImages.find((img) => img.id === p.sourceId);
                    if (!src) return null;
                    const isActive = activePlacementId === p.id;
                    const baseLeft = p.targetCol * cellWidth + (p.offsetX || 0);
                    const baseTop = p.targetRow * cellHeight + (p.offsetY || 0);
                    const dragging = livePos?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleMoveDown(e, p.id, baseLeft, baseTop);
                        }}
                        onPointerMove={handleMoveMove}
                        onPointerUp={(e) => handleMoveUp(e, p.id, isActive)}
                        onPointerCancel={() => {
                          moveRef.current = null;
                          setLivePos(null);
                        }}
                        title="Drag to move (release snaps to grid · Shift = free-place)"
                        className={`group absolute shadow ${
                          dragging ? 'z-50 cursor-grabbing opacity-80 ring-2 ring-purple-400' : 'cursor-grab'
                        } ${isActive && !dragging ? 'z-50 ring-2 ring-blue-500' : ''}`}
                        style={{
                          left: dragging ? livePos.left : baseLeft,
                          top: dragging ? livePos.top : baseTop,
                          width: p.width * cellWidth,
                          height: p.height * cellHeight,
                          backgroundImage: `url(${src.url})`,
                          backgroundPosition: `-${p.sourceCol * cellWidth}px -${p.sourceRow * cellHeight}px`,
                          backgroundRepeat: 'no-repeat',
                          opacity: layer.opacity,
                          imageRendering: 'pixelated',
                          touchAction: 'none',
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePlacement(p.id);
                          }}
                          className="absolute inset-0 z-50 m-auto hidden h-6 w-6 cursor-pointer items-center justify-center rounded bg-red-500/80 text-white group-hover:flex"
                          title="Remove placement"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  });
              })}

              {/* drop ghost preview */}
              {dragHoverPoint && (
                <div
                  className="pointer-events-none absolute z-40 border-2 border-white/50 bg-white/20 transition-all duration-75"
                  style={{
                    left: dragHoverPoint.c * cellWidth,
                    top: dragHoverPoint.r * cellHeight,
                    width: (draggedSelection?.width || 1) * cellWidth,
                    height: (draggedSelection?.height || 1) * cellHeight,
                  }}
                >
                  {draggedSelection &&
                    (() => {
                      const src = sourceImages.find((img) => img.id === draggedSelection.sourceId);
                      return src ? (
                        <div
                          className="absolute inset-0 opacity-50"
                          style={{
                            backgroundImage: `url(${src.url})`,
                            backgroundPosition: `-${draggedSelection.col * cellWidth}px -${draggedSelection.row * cellHeight}px`,
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated',
                          }}
                        />
                      ) : null;
                    })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
