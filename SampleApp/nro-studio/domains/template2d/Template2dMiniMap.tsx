// Template2dMiniMap — the 2D sample's drawerLeftBottom panel: a LIVE export
// preview (visible layers' paints, bounds-fit) sitting directly above the
// Vault it exports into. Demonstrates the offscreen-thumbnail pattern the real
// apps (and NDT Forge scene tabs) will reuse.
'use client';
import { useEffect, useRef } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { useTemplate2dStore } from '@/stores/domains/template2dStore';

export function Template2dMiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useTemplate2dStore((s) => s.strokes);
  const layers = useTemplate2dStore((s) => s.layers);

  const visible = new Set(layers.filter((l) => l.visible).map((l) => l.id));
  const paints = strokes.filter((c) => visible.has(c.layerId));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (paints.length === 0) return;

    // bounds-fit, uniform scale, centered — exactly what the Vault export crops to
    const minX = Math.min(...paints.map((c) => c.x));
    const minY = Math.min(...paints.map((c) => c.y));
    const maxX = Math.max(...paints.map((c) => c.x + c.size));
    const maxY = Math.max(...paints.map((c) => c.y + c.size));
    const pad = 4;
    const scale = Math.min(
      (canvas.width - pad * 2) / Math.max(1, maxX - minX),
      (canvas.height - pad * 2) / Math.max(1, maxY - minY),
      1,
    );
    const offX = (canvas.width - (maxX - minX) * scale) / 2;
    const offY = (canvas.height - (maxY - minY) * scale) / 2;

    ctx.imageSmoothingEnabled = false;
    for (const layer of layers) {
      if (!visible.has(layer.id)) continue;
      for (const c of paints) {
        if (c.layerId !== layer.id) continue;
        ctx.fillStyle = c.c;
        ctx.fillRect(
          offX + (c.x - minX) * scale,
          offY + (c.y - minY) * scale,
          Math.max(1, c.size * scale),
          Math.max(1, c.size * scale),
        );
      }
    }
    // paints/layers drive the redraw; `visible` derives from layers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, layers]);

  return (
    <div className="flex shrink-0 flex-col border-t border-edge">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <MapIcon size={13} className="text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Export Preview
        </h3>
        <span className="ml-auto text-[10px] text-ink-muted">{paints.length} paints</span>
      </div>
      <div className="px-3 pb-3">
        <div className="checker-bg relative h-24 overflow-hidden rounded-md border border-edge">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {paints.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] italic text-ink-muted opacity-60">
              paint something →
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-ink-muted opacity-70">
          Live thumbnail of what the footer&apos;s Vault keycap exports.
        </p>
      </div>
    </div>
  );
}
