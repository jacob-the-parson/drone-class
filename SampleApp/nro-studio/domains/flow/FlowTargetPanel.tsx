// FlowTargetPanel — right pane: the layered paint canvas. Fit-scale
// to container (≤4× for pixel art), paint/erase via an offscreen temp canvas
// committed to the layer on pointer-up, color picker reads composite pixels.
// Tools/brush/layers live in the right drawer's Tools page (store-wired).
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '@/stores/domains/flowStore';

export function FlowTargetPanel() {
  const { targetWidth, targetHeight, layers, activeLayerId, updateLayerDataUrl, activeTool, currentColor, brushSize, setCurrentColor } =
    useFlowStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);

  // fit the canvas to the container (islands spring — observe, don't assume)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const padding = 64;
      const scaleX = (el.clientWidth - padding) / targetWidth;
      const scaleY = (el.clientHeight - padding) / targetHeight;
      setScale(Math.max(Math.min(scaleX, scaleY, 4), 0.1));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetWidth, targetHeight]);

  const renderCanvas = useCallback(
    (useTempForActive: boolean) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      for (const layer of [...layers].reverse()) {
        if (!layer.visible) continue;
        if (useTempForActive && layer.id === activeLayerId && tempCanvasRef.current) {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(tempCanvasRef.current, 0, 0, targetWidth, targetHeight);
          ctx.globalAlpha = 1;
          continue;
        }
        if (!layer.dataUrl) continue;
        const img = new Image();
        img.src = layer.dataUrl;
        if (img.complete) {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          ctx.globalAlpha = 1;
        } else {
          img.onload = () => {
            ctx.globalAlpha = layer.opacity;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            ctx.globalAlpha = 1;
          };
        }
      }
    },
    [layers, targetWidth, targetHeight, activeLayerId],
  );

  useEffect(() => renderCanvas(false), [renderCanvas]);

  // temp canvas mirrors the active layer for in-flight strokes
  useEffect(() => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx && activeLayer?.dataUrl) {
      const img = new Image();
      img.src = activeLayer.dataUrl;
      img.onload = () => tCtx.drawImage(img, 0, 0);
    }
    tempCanvasRef.current = tempCanvas;
  }, [activeLayerId, targetWidth, targetHeight, layers]);

  const posFromEvent = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const draw = (x: number, y: number, isDown: boolean) => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer?.visible || !tempCanvasRef.current) return;
    const tCtx = tempCanvasRef.current.getContext('2d');
    if (!tCtx) return;
    tCtx.lineCap = 'round';
    tCtx.lineJoin = 'round';
    tCtx.lineWidth = brushSize;
    if (activeTool === 'erase') {
      tCtx.globalCompositeOperation = 'destination-out';
      tCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      tCtx.globalCompositeOperation = 'source-over';
      tCtx.strokeStyle = currentColor;
    }
    tCtx.beginPath();
    if (isDown || !lastPos.current) {
      tCtx.moveTo(x - 0.1, y);
      tCtx.lineTo(x, y);
    } else {
      tCtx.moveTo(lastPos.current.x, lastPos.current.y);
      tCtx.lineTo(x, y);
    }
    tCtx.stroke();
    renderCanvas(true);
  };

  const pickColor = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (p[3] > 0) {
      setCurrentColor('#' + ('000000' + ((p[0] << 16) | (p[1] << 8) | p[2]).toString(16)).slice(-6));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pos = posFromEvent(e);
    if (!pos) return;
    if (activeTool === 'picker') {
      pickColor(pos.x, pos.y);
      return;
    }
    if (activeTool === 'paint' || activeTool === 'erase') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      lastPos.current = pos;
      draw(pos.x, pos.y, true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const pos = posFromEvent(e);
    if (!pos) return;
    draw(pos.x, pos.y, false);
    lastPos.current = pos;
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      if (tempCanvasRef.current) updateLayerDataUrl(activeLayerId, tempCanvasRef.current.toDataURL('image/png'));
      setIsDrawing(false);
    }
    lastPos.current = null;
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-edge px-4">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">Target Canvas</span>
        <span className="font-mono text-[10px] text-ink-muted">
          {targetWidth}×{targetHeight} @ {Math.round(scale * 100)}%
        </span>
      </div>
      {/* plain desk backdrop; the canvas floats on it like PAPER
          (deep soft shadow + hairline border, no loud checker).
          FUTURE (Jacob): a "Transparency" TOOL TOGGLE in the right panel's Tools
          page — on = .checker-bg inside the canvas bounds only (see-through
          pixels read as checker), off = this clean paper look. Store flag +
          conditional class on the canvas wrapper. */}
      <div ref={containerRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-surface-sunken/60 p-4">
        <canvas
          ref={canvasRef}
          width={targetWidth}
          height={targetHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`border border-edge bg-transparent shadow-2xl ${
            activeTool === 'picker' ? 'cursor-copy' : activeTool ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{ width: targetWidth * scale, height: targetHeight * scale, imageRendering: 'pixelated', touchAction: 'none' }}
        />

        {/* floating dims chip (helper overlay) */}
        <div className="absolute bottom-4 left-4 flex rounded border border-edge bg-surface-raised/80 px-2 py-1 text-xs text-ink-muted backdrop-blur">
          {targetWidth} × {targetHeight} ({Math.round(scale * 100)}%)
        </div>
      </div>
    </div>
  );
}
