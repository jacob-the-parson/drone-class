// AnimatorWorkspace — the ANIM_GRID preview canvas (DPR-aware,
// theme-aware checker + amber grid) + the ANIM_BUILDER clip tray (disabled
// shells, staging law). Upgrades: footer Grid/Index toggles are LIVE — grid
// lines and cell index labels render from the store.
'use client';
import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useThemeStore } from '@/stores/core/themeStore';
import { useAnimatorStore } from '@/stores/domains/animatorStore';

const STANDARD_ANIMATIONS = ['Idle', 'Walk', 'Run', 'Attack', 'Hurt', 'Die', 'Jump', 'Fall', 'Push', 'Pull', 'Lift', 'Carry'];
const DEFAULT_PREVIEW_CELL_SIZE = 48;

export function AnimatorWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { cellWidth, cellHeight, gridCols, gridRows, useCustomCellSize, showGrid, showIndexes } = useAnimatorStore();
  const isDark = useThemeStore((s) => s.isDark);

  const previewCellWidth = useCustomCellSize ? cellWidth : DEFAULT_PREVIEW_CELL_SIZE;
  const previewCellHeight = useCustomCellSize ? cellHeight : DEFAULT_PREVIEW_CELL_SIZE;
  const canvasWidth = gridCols * previewCellWidth;
  const canvasHeight = gridRows * previewCellHeight;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // theme-aware checker
    const checkerSize = 16;
    const checkerA = isDark ? '#18181b' : '#ffffff';
    const checkerB = isDark ? '#27272a' : '#f4f4f5';
    for (let y = 0; y < canvasHeight; y += checkerSize) {
      for (let x = 0; x < canvasWidth; x += checkerSize) {
        ctx.fillStyle = (x / checkerSize + y / checkerSize) % 2 === 0 ? checkerA : checkerB;
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    if (showGrid) {
      ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.36)' : 'rgba(217, 119, 6, 0.34)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let col = 0; col <= gridCols; col += 1) {
        const x = Math.round(col * previewCellWidth) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let row = 0; row <= gridRows; row += 1) {
        const y = Math.round(row * previewCellHeight) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
      }
      ctx.stroke();
    }

    if (showIndexes) {
      ctx.fillStyle = isDark ? 'rgba(251, 191, 36, 0.8)' : 'rgba(180, 83, 9, 0.8)';
      ctx.font = '600 9px var(--font-sans), sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let row = 0; row < gridRows; row += 1) {
        for (let col = 0; col < gridCols; col += 1) {
          ctx.fillText(String(row * gridCols + col), col * previewCellWidth + 3, row * previewCellHeight + 3);
        }
      }
    }

    ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.72)' : 'rgba(217, 119, 6, 0.66)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, Math.max(0, canvasWidth - 2), Math.max(0, canvasHeight - 2));
  }, [canvasWidth, canvasHeight, previewCellWidth, previewCellHeight, gridCols, gridRows, isDark, showGrid, showIndexes]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1">
        <div className="absolute inset-0 flex overflow-auto p-8">
          <div className="m-auto min-w-max">
            <div className="mb-3 flex items-center justify-between gap-6 text-[10px] font-black uppercase tracking-[0.2em]">
              <span className="text-amber-600 dark:text-amber-400">ANIM_GRID</span>
              <span className="text-ink-muted">
                {gridCols} x {gridRows} / {useCustomCellSize ? `${cellWidth} x ${cellHeight}px` : 'Cell 48px'}
              </span>
            </div>
            <div className="rounded-md border border-edge bg-surface-raised p-2 shadow-2xl">
              <canvas ref={canvasRef} className="block rounded-sm [image-rendering:pixelated]" aria-label="Animator grid canvas" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[0.18em] text-ink-muted opacity-70">
              <span>Sequence Wiring Pending</span>
              <span>Source Asset Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* ANIM_BUILDER clip tray — disabled shells (staging law) */}
      <div className="flex h-14 shrink-0 items-center gap-2 overflow-x-auto border-t border-edge px-4">
        <span className="mr-2 hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-ink-muted sm:inline">
          ANIM_BUILDER
        </span>
        {STANDARD_ANIMATIONS.map((name) => (
          <button
            key={name}
            type="button"
            disabled
            className="flex shrink-0 cursor-not-allowed items-center rounded-md border border-edge bg-control px-3 py-2 text-[10px] font-black uppercase tracking-tight text-ink-muted opacity-60"
            title={`${name} sequence — pending workspace wiring`}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          disabled
          className="ml-1 flex shrink-0 cursor-not-allowed items-center gap-1 rounded-full border border-dashed border-edge px-3 py-2 text-[10px] font-black uppercase tracking-tight text-ink-muted opacity-60"
          title="Custom sequence creation — pending workspace wiring"
        >
          <Plus size={12} /> New
        </button>
      </div>
    </div>
  );
}
