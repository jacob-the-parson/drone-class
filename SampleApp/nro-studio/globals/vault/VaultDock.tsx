// VaultDock — the VAULT, permanent left-drawer real estate.
// Bar: Archive icon · "Vault" · count · capacity meter · + upload.
// Body (spring open/close): 2D|3D segmented modes sharing the footprint,
// thumbnail grid with UP/GEN badges, hover Eye/Trash, HTML5 drag out.
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, Boxes, Eye, Images, Plus, Trash2 } from 'lucide-react';
import { APP_REGISTRY } from '@/lib/registry';
import { DIM_TEXT } from '@/components/ui/BadgeDim';
import { useVaultStore, type VaultItem, type VaultMode } from '@/stores/core/vaultStore';
import { useFavoritesStore } from '@/stores/core/favoritesStore';
import { ModalImageDetails } from '@/components/shared/ModalImageDetails';

const SPRING = { type: 'spring', bounce: 0.2, duration: 0.5 } as const;

export function VaultDock() {
  const router = useRouter();
  const favorites = useFavoritesStore((s) => s.favorites);
  const items = useVaultStore((s) => s.items);
  const isLoading = useVaultStore((s) => s.isLoading);
  const loadVault = useVaultStore((s) => s.loadVault);
  const addItem = useVaultStore((s) => s.addItem);
  const removeItem = useVaultStore((s) => s.removeItem);
  const setDraggedItem = useVaultStore((s) => s.setDraggedItem);

  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<VaultMode>('2d');
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [preview, setPreview] = useState<VaultItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) =>
      setStorageInfo({ usage: e.usage ?? 0, quota: e.quota ?? 0 }),
    );
  }, [items]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addItem(file, { name: file.name, type: 'upload', mode });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const modeItems = items.filter((i) => i.mode === mode);
  // send-row (favorites-gated): favorites ∩ domains accepting this vault mode
  const acceptors = APP_REGISTRY.filter(
    (a) => favorites.includes(a.id) && a.accepts?.modes.includes(mode),
  );
  const sendTo = (app: (typeof acceptors)[number], item: VaultItem) => {
    app.accepts?.handler(item);
    router.push(`/${app.route}`);
  };
  const usagePct = storageInfo && storageInfo.quota > 0
    ? Math.max(storageInfo.usage > 0 ? 2 : 0, Math.min(100, (storageInfo.usage / storageInfo.quota) * 100))
    : 0;

  return (
    <div className="flex max-h-[40%] shrink-0 flex-col border-t border-edge">
      {/* the Vault bar */}
      <div
        className="flex h-10 shrink-0 cursor-pointer items-center gap-2 px-3 transition-colors hover:bg-control/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <Archive size={15} className="shrink-0 text-ink-muted" />
        <span className="text-sm font-semibold text-ink">Vault</span>
        <span className="text-xs text-ink-muted">({items.length})</span>

        {/* capacity meter */}
        {storageInfo && storageInfo.quota > 0 && (
          <div
            className="ml-auto flex w-20 flex-col items-center"
            title={`${(storageInfo.usage / 1048576).toFixed(2)} MB / ${(storageInfo.quota / 1073741824).toFixed(2)} GB`}
          >
            <span className="mb-0.5 whitespace-nowrap text-[9px] font-medium text-ink-muted">
              {(storageInfo.usage / 1048576).toFixed(1)} MB
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-control">
              <div
                className={`h-full transition-all ${usagePct > 80 ? 'bg-red-500' : 'bg-secondary'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className={`shrink-0 rounded p-1 text-ink-muted transition-colors hover:text-secondary ${storageInfo ? '' : 'ml-auto'}`}
          title="Upload to Vault"
        >
          <Plus size={15} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={mode === '2d' ? 'image/*' : '.glb,.gltf,.vrm,image/*'}
          onChange={handleFileUpload}
        />
      </div>

      {/* springy body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden border-t border-edge"
          >
            <div className="flex flex-col p-2">
              {/* 2D | 3D segmented modes — same real estate */}
              <div className="mb-2 grid grid-cols-2 gap-1 rounded-md border border-edge-strong/15 bg-track p-1 dark:border-edge">
                {(
                  [
                    ['2d', Images, '2D'],
                    ['3d', Boxes, '3D'],
                  ] as const
                ).map(([m, Icon, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex items-center justify-center gap-1 rounded py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                      mode === m
                        ? `bg-surface-raised shadow-sm ${DIM_TEXT[m]}`
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>

              <div className="max-h-[24dvh] min-h-20 overflow-y-auto">
                {isLoading ? (
                  <div className="py-4 text-center text-xs text-ink-muted">Loading Vault…</div>
                ) : modeItems.length === 0 ? (
                  <div className="flex h-20 flex-col items-center justify-center gap-1.5 text-ink-muted opacity-50">
                    <Archive size={20} />
                    <span className="text-xs">Empty {mode.toUpperCase()} Vault</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pr-1">
                    {modeItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/x-nro-vault-item', item.id);
                          e.dataTransfer.effectAllowed = 'copy';
                          setDraggedItem(item);
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        className="group relative aspect-square cursor-grab overflow-hidden rounded border border-edge bg-control active:cursor-grabbing"
                      >
                        {item.url && item.mime.startsWith('image/') ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            className="pointer-events-none h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-ink-muted">
                            <Boxes size={22} />
                          </div>
                        )}

                        {/* type badge */}
                        <div className="absolute left-1 top-1 rounded bg-black/60 px-1">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/90">
                            {item.type === 'upload' ? 'Up' : 'Gen'}
                          </span>
                        </div>

                        {/* hover overlay */}
                        <div className="absolute inset-0 flex flex-col justify-between bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setPreview(item)}
                              className="rounded bg-white/20 p-1 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
                              title="View details"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="rounded bg-red-500/80 p-1 text-white transition-colors hover:bg-red-500"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="flex flex-col gap-1">
                            {acceptors.length > 0 && (
                              <div className="flex gap-1 overflow-x-auto">
                                {acceptors.map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => sendTo(a, item)}
                                    className="shrink-0 rounded bg-white/20 p-1 backdrop-blur-sm transition-colors hover:bg-white/40"
                                    title={`Send to ${a.name}`}
                                  >
                                    <a.icon size={12} className={a.theme.colorClass} />
                                  </button>
                                ))}
                              </div>
                            )}
                            <span className="truncate rounded bg-black/50 px-1 py-0.5 text-[9px] text-white/80">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* full item-details modal */}
      <ModalImageDetails item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
