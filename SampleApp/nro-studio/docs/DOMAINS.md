# Domains — the contract

A domain = one folder in `domains/<name>/` + one route in `app/(main)/<route>/` + one import
line in `lib/registry.ts`. The Shell is never edited.

## AppDefinition (see `lib/registry.types.ts`)
- `id` · `route` · `name` · `description` · `icon` (lucide) · `theme` (3 Tailwind class strings)
- `dimension?: '2d' | '3d'` — the badge + dashboard category; meta-domains omit it (→ Platform)
- `navigation` — `showInSidebar` / `showInDashboard` / `showInSettings`
- `drawerLeftBottom?` — ONE component (non-pageable), the domain's persistent left-drawer
  real estate between favorites and the Vault. Panels bring their
  own sticky mini-header (see TemplateSlotsPage).
- `drawerRight?` — `{ title?, icon?, header?: TriSlot, footer?: TriSlot, pages: DrawerPage[] }`
  · **TOOLS CHROME (Jacob's convention)**: the drawer always opens with a title bar —
  Wrench + 'Tools' by DEFAULT, overridable via `title`/`icon` (template demos the
  override: 'Inspector'). Even undeclared right drawers show the Tools bar + empty state.
  · structure mirrors the left unit's rhythm: title bar → optional subheader → pager →
  page → optional subfooter · unlimited pages; `DrawerShell` paginates (tabs ≤4, cycler
  beyond); only the active page mounts; pagination memory persists per `appId:side`
- `shellFooter?` — 5 positional keycaps, `null` = N/A. **THE FOOTER SHAPE (Jacob's law):**
  `[ domain action ] [ domain action ] [ CENTER — reserved, future shared/global button ]
  [ trash-Reset (Trash2, red hover) ] [ Vault send (Download + "Vault", green) ]`.
  Left toggles light in the domain accent when active; all icons hover-lift.
  All three templates demonstrate it (Status/Tick · Grid/Snap · Spin/Wire) — copy theirs.
- `settingsBody?` — sub-area in the Settings domain (placeholder required if `showInSettings`)
- `accepts?` — `{ modes: ('2d'|'3d')[], handler(item: VaultItem) }`: opt in to the Vault
  send-row. Favorites-gated: the Vault's item-hover strip = favorites ∩ accepting domains;
  clicking calls `handler(item)` then routes to the domain. Registry-driven — the Vault
  never names a domain.

## The template family (living EXPLAINERS — samples of tech, not apps; copy, don't invent)
- **`template`** (`/template`, pink Braces) — the CONTRACT explainer: every slot declared,
  every slot connected to `templateStore`. THE reference for the zero-prop convention +
  the Vault accept hook (left-bottom panel shows the received drop).
- **`template2d`** (green) — the 2D TECH explainer: native-canvas paint sample (pointer
  painting, grid overlay, checker well), **DrawerLayerList living demo** (multi-layer
  select/hide/delete), Brush page, footer Grid/Snap toggles, Vault drag-IN (drop or
  send-row) and real drawing export OUT, **left-bottom MINI-MAP** (live bounds-fit
  export preview above the Vault it feeds). One store, FOUR chrome surfaces.
- **`template3d`** (orange) — the 3D TECH explainer: vanilla three.js r184 viewport
  (OrbitControls, ResizeObserver vs springing islands, `getState()` render loop = zero
  re-renders), footer Spin/Wire toggles, Regions page recolors the matte ship-look
  material, **left-bottom SCENE OUTLINER** (DrawerLayerList reused for 3D objects: Eye
  toggles + emissive selection highlight). **`creator` is its first copy** ✓.

## creator — THE FIRST REAL 3D DOMAIN (cyan, PersonStanding; shipped 2026-07-29)
The three.js character viewer re-expressed in the chrome: EON base bodies (GLB from
`/assets/entities/humanoids/`), **live 42-region recolor** via the baked ID map
(distance-mask ShaderMaterial — shader-pipeline tier 2; same `regions.body.json` the
Blender side uses), 2-band toon ramp + inverted-hull ink outline, per-gender unit
caching, breathing highlight on the selected region. Chrome: Regions drawer (color
rows, Tools-chrome override 'Regions'), Model left-bottom panel (gender track +
stats), footer [Spin][Ink][·][Reset palette][Vault = viewport capture → 3D-mode
item]. Settings = the Blender bridge card (relay status + live scene readout; the
Regions page's push SYNCS the palette into the open .blend).

## Registry caution (hard-won)
Never read `APP_REGISTRY` at module scope in a component file — value-import cycles.
Read it at render time; import only types from `registry.types.ts` at module scope.

## Workspace archetypes
- **Single-canvas** (slicer/animator): 3-col header grid (`[1fr_auto_1fr]`: identity ·
  center segmented mode toggle · contextual actions) → viewport section (native canvas
  z-0 + scroll/hit overlay z-10) → optional bottom clip/tray strip. Errors = bottom-center toast.
- **Split-pane** (stitcher/flow): workspace mounts Source|Target panes internally
  (`flex-col md:flex-row` — stack on narrow). Panes are NOT registry slots. Pane chrome:
  h-10 title bar + zoom chip (out · %-click-resets · in); drag payloads are typed JSON
  (discriminator field, try/catch drops). Drop targets accept vault JSON AND OS files.
- **Freeform stage** (canvais): react-konva Stage + Transformer for select/scale.
- **Staging law** (animator): scaffold domains render every planned control DISABLED
  (`opacity-45` + "pending wiring" tooltip) + a dashed explainer card — ship the UI
  contract first, wire behavior later.

### Performance patterns (battle-tested — reach for these when a canvas gets heavy)
1. **Grid virtualization / DOM windowing** (SlicerWorkspace): ResizeObserver + scroll
   telemetry → render only the visible window (+2-cell buffer) of tens of thousands of
   tiles, absolutely positioned inside a full-size container.
2. **Canvas-driven overlays** (SlicerWorkspace): grid lines/selection/hover drawn on a
   native canvas via rAF; pointer math maps offsetX/Y → cell at the top-level overlay.
   Skips React reconciliation entirely on hot paths.
3. **Konva stage** (CanvaisWorkspace): pan/zoom via the Stage matrix only; `<Transformer>`
   for bbox/rotate/scale wired back into the store; DOM-drop → stage-coordinate
   translation for Vault drag-ins.

## The left drawer is SEGMENTED (Jacob's law, 2026-07-26)
Top→bottom: header chunk · domain pager · favorites (always present, capped+scrollable)
· **`drawerLeftBottom` per-domain area (non-pageable)** · VaultDock · FooterUser.
The per-domain area hosts slicer-style inventories, animator-style dimension cards,
future asset trees. Pageable tooling = right drawer only.

## To add a domain
1. Copy `domains/template/` → rename files/exports (kind-prefix names).
2. Copy its route folder → `app/(main)/<route>/` (thin page importing your workspace).
3. Store (if needed) → `stores/domains/<name>Store.ts`.
4. Add id to nothing — `id` is a plain string; add the manifest import to `lib/registry.ts`.
5. `npx tsc --noEmit` + click-through. Deleting a route later? wipe `.next` (stale gen-types).

## Globals
`globals/` = cross-domain UI (present in every domain). Current resident: `vault/VaultDock` —
the Archive/"Vault" bar with count + capacity meter + `+` upload · spring
open/close · 2D|3D segmented modes · Blob-idb persistence (`vaultStore`: per-item blob keys +
metadata index) · UP/GEN badges · hover Eye (preview modal)/Trash · HTML5 drag-out
(`application/x-nro-vault-item` + `draggedItem` store mirror; drop targets read either).
Expansion capped ~40% of the drawer. **Send row LIVE (2026-07-26)**: item-hover strip of
themed icon buttons from favorites ∩ `accepts`-declaring domains (template = the living
demo — its left-bottom panel shows the received drop). Roadmap: 3D thumbnails.
