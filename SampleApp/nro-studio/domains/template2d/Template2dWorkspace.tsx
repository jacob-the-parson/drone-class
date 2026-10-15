// Template2dWorkspace — the 2D TECH SAMPLE (an explainer, not an app).
// Demonstrates, live: the single-canvas archetype (native canvas + pointer
// painting), store-driven chrome (footer Grid/Snap toggles + right-drawer
// layers/brush pages command this canvas with zero props), grid overlay,
// checker transparency well, and Vault drag-IN (drop an item here) — the
// footer's Vault keycap exports the drawing back OUT.
'use client';
import { useEffect, useRef } from 'react';
import { Grid2x2 } from 'lucide-react';
import { useTemplate2dStore } from '@/stores/domains/template2dStore';
import { useVaultStore } from '@/stores/core/vaultStore';

export function Template2dWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const strokes = useTemplate2dStore((s) => s.strokes);
  const layers = useTemplate2dStore((s) => s.layers);
  const gridVisible = useTemplate2dStore((s) => s.gridVisible);
  const snapEnabled = useTemplate2dStore((s) => s.snapEnabled);
  const cellSize = useTemplate2dStore((s) => s.cellSize);
  const color = useTemplate2dStore((s) => s.color);
  const droppedImage = useTemplate2dStore((s) => s.droppedImage);
  const addStroke = useTemplate2dStore((s) => s.addStroke);
  const setDroppedImage = useTemplate2dStore((s) => s.setDroppedImage);

  // (re)draw: dropped image -> visible layers' paints (layer order) -> grid
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = imageRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight, 1);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }

    for (const layer of layers) {
      if (!layer.visible) continue;
      for (const cell of strokes) {
        if (cell.layerId !== layer.id) continue;
        ctx.fillStyle = cell.c;
        ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
      }
    }

    if (gridVisible) {
      ctx.strokeStyle = 'rgba(128,128,128,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0.5; x <= canvas.width; x += cellSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0.5; y <= canvas.height; y += cellSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
    }
  };

  // size the canvas to its container (the islands SPRING — this must follow)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load / swap the dropped Vault image
  useEffect(() => {
    if (!droppedImage) {
      imageRef.current = null;
      draw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      draw();
    };
    img.src = droppedImage;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedImage]);

  // redraw when paint state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(draw, [strokes, layers, gridVisible, cellSize]);

  const paint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (snapEnabled) {
      addStroke({
        x: Math.floor(x / cellSize) * cellSize,
        y: Math.floor(y / cellSize) * cellSize,
        size: cellSize,
        c: color,
      });
    } else {
      addStroke({ x: Math.round(x) - 3, y: Math.round(y) - 3, size: 6, c: color });
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      {/* workspace header — the 3-col archetype: identity · live state · hint */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Grid2x2 size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-ink">2D Sample</span>
          <span className="text-ink-muted">paint the grid</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          <span className={gridVisible ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-40'}>Grid</span>
          <span className={snapEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-40'}>Snap</span>
        </div>
        <div className="text-right text-ink-muted">drop a Vault image · paints land on the active layer</div>
      </div>

      {/* the canvas well */}
      <div
        ref={containerRef}
        className="checker-bg relative min-h-0 flex-1 overflow-hidden rounded-lg border border-edge"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/x-nro-vault-item')) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData('application/x-nro-vault-item');
          const item = useVaultStore.getState().items.find((i) => i.id === id);
          if (item?.url && item.mime.startsWith('image/')) setDroppedImage(item.url);
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            paint(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) paint(e);
          }}
        />
      </div>

      {/* what this sample teaches */}
      <div className="shrink-0 rounded-lg border border-dashed border-edge p-2.5 text-[11px] leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">Chrome in action:</span> footer Grid/Snap
        keycaps toggle this canvas · right drawer → Layers (DrawerLayerList) + Brush pages
        drive it zero-prop · drag a Vault item in, footer Vault exports the drawing out ·
        canvas resizes with the springing islands via ResizeObserver.
      </div>
    </div>
  );
}
