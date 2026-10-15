// CanvaisWorkspace — the FREEFORM-STAGE archetype: react-konva
// infinite canvas. Wheel zoom at pointer, stage-drag pan, Transformer
// select/scale/rotate, Delete/Backspace, dual drop (vault items + OS files)
// with pointer→stage coordinate translation. Registers a stage exporter so
// the footer Vault keycap can capture the composition.
// BROWSER-ONLY (Konva) — mount via dynamic ssr:false (see route page).
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import useImage from 'use-image';
import { Maximize, Trash2 } from 'lucide-react';
import { useCanvaisStore, type CanvasItem } from '@/stores/domains/canvaisStore';
import { useVaultStore } from '@/stores/core/vaultStore';

function URLImage({
  item,
  isSelected,
  onSelect,
  onChange,
}: {
  item: CanvasItem;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: CanvasItem) => void;
}) {
  const [img] = useImage(item.url, 'anonymous');
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        image={img}
        x={item.x}
        y={item.y}
        scaleX={item.scaleX}
        scaleY={item.scaleY}
        rotation={item.rotation}
        draggable
        ref={imageRef}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onChange({ ...item, x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = imageRef.current;
          if (!node) return;
          onChange({
            ...item,
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
        />
      )}
    </>
  );
}

export function CanvaisWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { items, setItems, selectedId, setSelectedId, deleteSelected, addItem, setExporter } = useCanvaisStore();
  const [stageConfig, setStageConfig] = useState({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleResize = () => setDimensions({ width: el.clientWidth, height: el.clientHeight });
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // register the stage exporter for the footer Vault keycap
  useEffect(() => {
    setExporter(async () => {
      const stage = stageRef.current;
      if (!stage || useCanvaisStore.getState().items.length === 0) return null;
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      return fetch(dataUrl).then((r) => r.blob());
    });
    return () => setExporter(null);
  }, [setExporter]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setStageConfig({ scale: newScale, x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  }, []);

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) setSelectedId(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const stageX = (e.clientX - rect.left - stageConfig.x) / stageConfig.scale;
    const stageY = (e.clientY - rect.top - stageConfig.y) / stageConfig.scale;

    const vaultId = e.dataTransfer.getData('application/x-nro-vault-item');
    if (vaultId) {
      const item = useVaultStore.getState().items.find((i) => i.id === vaultId);
      if (item?.url && item.mime.startsWith('image/')) addItem(item.url, stageX, stageY);
      return;
    }
    if (e.dataTransfer.files?.length) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (file.type.startsWith('image/')) addItem(URL.createObjectURL(file), stageX, stageY);
      });
      return;
    }
    const textData = e.dataTransfer.getData('text/plain');
    if (textData && (textData.startsWith('http') || textData.startsWith('data:image'))) {
      addItem(textData, stageX, stageY);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'Backspace' || e.key === 'Delete') deleteSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected]);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        // light infinite-canvas dot grid, theme-aware — and it TRACKS the stage:
        // position follows pan, spacing follows zoom (the world moves, not the wall)
        backgroundImage:
          'radial-gradient(color-mix(in srgb, var(--ink) 13%, transparent) 1px, transparent 1.6px)',
        backgroundSize: `${24 * stageConfig.scale}px ${24 * stageConfig.scale}px`,
        backgroundPosition: `${stageConfig.x}px ${stageConfig.y}px`,
      }}
    >
      {/* floating toolbar pill */}
      <div className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-4 rounded-full border border-edge bg-surface-raised px-4 py-2 shadow-lg">
        <button
          onClick={() => setStageConfig({ scale: 1, x: 0, y: 0 })}
          className="flex items-center gap-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
          title="Reset view"
        >
          <Maximize size={14} /> 100%
        </button>
        <div className="h-4 w-px bg-edge" />
        <button
          disabled={!selectedId}
          onClick={deleteSelected}
          className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
            selectedId ? 'text-red-500 hover:text-red-600' : 'text-ink-muted opacity-40'
          }`}
        >
          <Trash2 size={14} /> Delete
        </button>
        <div className="h-4 w-px bg-edge" />
        <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-tighter text-ink-muted">
          Drag & drop images · scroll to zoom
        </span>
      </div>

      <div
        ref={containerRef}
        className="h-full w-full flex-1 cursor-grab outline-none active:cursor-grabbing"
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
      >
        {dimensions.width > 0 && dimensions.height > 0 && (
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            onWheel={handleWheel}
            scaleX={stageConfig.scale}
            scaleY={stageConfig.scale}
            x={stageConfig.x}
            y={stageConfig.y}
            draggable
            onDragMove={(e) => {
              // live-sync pan so the dot grid tracks the world mid-drag
              if (e.target === e.target.getStage()) {
                setStageConfig((prev) => ({ ...prev, x: e.target.x(), y: e.target.y() }));
              }
            }}
            onDragEnd={(e) => {
              if (e.target === e.target.getStage()) {
                setStageConfig((prev) => ({ ...prev, x: e.target.x(), y: e.target.y() }));
              }
            }}
            onMouseDown={checkDeselect}
            onTouchStart={checkDeselect}
          >
            <Layer>
              {items.map((item) => (
                <URLImage
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={() => setSelectedId(item.id)}
                  onChange={(attrs) => setItems((prev) => prev.map((i) => (i.id === item.id ? attrs : i)))}
                />
              ))}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}
