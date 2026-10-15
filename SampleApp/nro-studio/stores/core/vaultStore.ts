// Vault store:
//   · Blobs in idb (native support, ~half the memory of base64)
//   · per-item blob keys (`nro-vault-blob-<id>`) + one small metadata index
//   · a `mode` axis ('2d' | '3d') for the segmented Vault views
//   · AIMetadata fields — carried on items, filled by AI flows later
// Object URLs are created on load and revoked on removal.
import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';

export type VaultItemType = 'upload' | 'generation';
export type VaultMode = '2d' | '3d';

/** Generation provenance — prepend/core/append prompt chain + target cell. */
export interface AIMetadata {
  prompt: string;
  prependTemplates: string[];
  appendTemplates: string[];
  width: number;
  height: number;
}

export interface VaultItemMeta {
  id: string;
  name: string;
  type: VaultItemType;
  mode: VaultMode;
  mime: string;
  timestamp: number;
  metadata?: AIMetadata;
}

export interface VaultItem extends VaultItemMeta {
  /** Object URL for the stored blob (preview for images, download for all). */
  url?: string;
}

const INDEX_KEY = 'nro-vault-index';
const blobKey = (id: string) => `nro-vault-blob-${id}`;

interface VaultState {
  items: VaultItem[];
  isLoading: boolean;
  draggedItem: VaultItem | null;
  setDraggedItem: (item: VaultItem | null) => void;
  loadVault: () => Promise<void>;
  addItem: (
    blob: Blob,
    opts: { name: string; type: VaultItemType; mode: VaultMode; metadata?: AIMetadata },
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItemName: (id: string, newName: string) => Promise<void>;
}

async function patchIndex(id: string, patch: Partial<VaultItemMeta>) {
  const index = (await get<VaultItemMeta[]>(INDEX_KEY)) ?? [];
  await set(INDEX_KEY, index.map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export const useVaultStore = create<VaultState>((setStore, getStore) => ({
  items: [],
  isLoading: true,
  draggedItem: null,
  setDraggedItem: (item) => setStore({ draggedItem: item }),

  loadVault: async () => {
    try {
      const index = (await get<VaultItemMeta[]>(INDEX_KEY)) ?? [];
      const items: VaultItem[] = [];
      for (const meta of index) {
        const blob = await get<Blob>(blobKey(meta.id));
        items.push({ ...meta, url: blob ? URL.createObjectURL(blob) : undefined });
      }
      setStore({ items, isLoading: false });
    } catch (error) {
      console.error('Failed to load vault:', error);
      setStore({ isLoading: false });
    }
  },

  addItem: async (blob, { name, type, mode, metadata }) => {
    const meta: VaultItemMeta = {
      id: crypto.randomUUID(),
      name,
      type,
      mode,
      mime: blob.type,
      timestamp: Date.now(),
      metadata,
    };
    await set(blobKey(meta.id), blob);
    const index = (await get<VaultItemMeta[]>(INDEX_KEY)) ?? [];
    await set(INDEX_KEY, [...index, meta]);
    setStore({
      items: [...getStore().items, { ...meta, url: URL.createObjectURL(blob) }],
    });
  },

  removeItem: async (id) => {
    const item = getStore().items.find((i) => i.id === id);
    if (item?.url) URL.revokeObjectURL(item.url);
    await del(blobKey(id));
    const index = (await get<VaultItemMeta[]>(INDEX_KEY)) ?? [];
    await set(INDEX_KEY, index.filter((m) => m.id !== id));
    setStore({ items: getStore().items.filter((i) => i.id !== id) });
  },

  updateItemName: async (id, newName) => {
    await patchIndex(id, { name: newName });
    setStore({
      items: getStore().items.map((i) => (i.id === id ? { ...i, name: newName } : i)),
    });
  },
}));
