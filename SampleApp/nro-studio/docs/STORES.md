# Stores — state taxonomy

Zustand, three tiers:

| tier | stores | persistence |
|---|---|---|
| `stores/core/` | `authStore` (in-memory Dev Login — deliberately unpersisted until real auth) · `shellStore` (tier, drawers, pagination memory) · `themeStore` (theme+vibe, localStorage) · `favoritesStore` (localStorage; → idb later; ordered — `reorderFavorites` backs the drag-reorder, order flows to drawer list + rail) · `vaultStore` (idb: Blob per item + metadata index; object URLs managed; `AIMetadata` prompt-chain fields + `updateItemName` — wired for the AI era) | mixed |
| `stores/domains/` | `templateStore` (the reference) · `template2d/3d` · `slicerStore` · `stitcherStore` · `flowStore` · `canvaisStore` · `animatorStore` · `creatorStore` (regions manifest, palette, gender, maskRadius, exporter). slicer/stitcher/flow ship ownership-aware object-URL helpers — the `registerXUrl` pattern: only self-created URLs get revoked, Vault-owned ones never. | per-store choice |
| `stores/services/` | `blenderStore` (relay: connected/version/scene, `checkStatus`, `execute` — the loopback Blender bridge) · `aiStore` (provider registry `IMAGE_GEN_PROVIDERS`, prompt templates, BYO-key; persist `nro-ai`) | mixed |

## Laws
1. **Zero-prop slots**: slot components subscribe via hooks; the store IS the wiring.
   No context providers, no prop drilling — ever.
2. **Policy in actions**: layout/business rules live in store actions (`toggleDrawer` owns
   the tier policy); components just render state and call actions.
3. **Select narrowly**: `useStore((s) => s.field)` per field — avoids over-rendering.
4. **Persistence is explicit**: `persist` middleware with a named key (`nro-*`); auth is
   deliberately NOT persisted until real auth lands.

## Future
- Vault metadata KINDS: `meta.kind` discriminated payload (`'image.gen' | 'char.staging'
  | 'map.scene' | …`) — see ROADMAP Appendix B (the data-bus law).
- Storage service store (cloud sync era) · favoritesStore → idb.
