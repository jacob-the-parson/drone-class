# Roadmap — THE board (single roadmap, consolidated 2026-07-29)

Everything open lives HERE. Consolidated from the former repo-root plan shelf —
`mapper-plan.md` (→ Appendix A) · `char-staging-plan.md` (→ Appendix B) ·
`studio-notes.md` (open ideas → board + parking lot) · `three-notes.md` (research
synthesis → board + watch list; the full 18-iteration research log lives on as sibling
[THREE-NOTES.md](./THREE-NOTES.md)) · `clode-nightshift.md` (open decisions → Decisions section, review-fix
history → Recently shipped, port conventions → Standing decisions; doc deleted).
Shipped history: DOMAINS.md.

## Recently shipped (context, not work)
All five 2D domain ports — slicer · stitcher · flow · canvais · animator (nightshift
2026-07-26; the review loop caught + fixed 4
real bugs — B1 ownership-aware object-URL revoke across 3 domains, B2 marquee clamp,
B3 preset-modal remount wiping input, B4 cell-preset auto-enabling custom size) ·
Character Creator domain
(cyan 3D: 42-region live recolor, toon+ink, capture→Vault) · **Blender relay**
(`/api/blender/{status,execute}` loopback-only TCP to the Lab add-on :9876; Regions
push = full SYNC building/updating `eon.skin.toon.idcolor.body_<gender>_stylized`) ·
migration 100% done (`pyimg` now stands alone in `nro-python-tools/`, outside the app; assets →
`public/assets/`; shaders → `nro-blender/shaders/`) · three already at r184.

## The board

| item | size | detail |
|---|---|---|
| **HUDPanel primitive** | S | Non-blocking, DRAGGABLE glassmorphism in-canvas overlay panel with a sections API (title bar = drag handle; content sections stack inside; never steals canvas interaction). This row is the spec. First customer: floating region inspector over the creator viewport. |
| **Creator polish arc** | S-M | Race palettes as CardSettings presets · camera bookmarks (front/side/back) · turnaround captures → Scale Showroom (Appendix B) · morph study vs a CC toon-male reference (⚠ the `assets/samples/cartoon_guy` bundle was DELETED 2026-09-16 — 150 MB; re-export from Character Creator if the morph study needs it). North star = **creator data model v2, four orthogonal axes, all tiny JSON**: `raceProfile` (rest-pose bone scales) · `morphs` (shape-key weights — one topology ⇒ one morph set serves every race) · `palette` (region colors — shipped) · `gear` (garments skinned to the shared skeleton, rebind at load; body-hiding = region-mask discard — the `mask.<slot>` law on web). |
| **Provider adapters (imageGen)** | M | **GenAI is NOT implemented yet — this row is the sole spec.** Universal-adapter law: `/api/generate` behind an `{id, label, availability, invoke}` registry (no hardcoded vendors; BYO-key per-request override). **AIGenerateModal**: prompt textarea + chroma-key dropdown (injects "solid bright green screen" into the prompt) + generate w/ loading state + friendly 429/quota messaging; when chroma was chosen the result auto-runs `removeChromaKeyPixels` (`lib/imageUtils`, tolerance 120) → lands as slicer tile / Vault item carrying `AIMetadata` (prepend/core/append prompt chain — ModalImageDetails already displays it in blue/orange/purple copy-cards). **SlicerSettings template CRUD**: edit the prepend/append prompt-template lists (`aiStore` already ships the `IMAGE_GEN_PROVIDERS` registry, EON Toon template, provider/model/BYO-key fields, persist `nro-ai` — only generate + CRUD UI are unwired). Chroma path doubles as the future 3D texture-gen lane (in-house twin of the `nro-python-tools/pyimg` chroma-bg tool). |
| **Animator slices** | M | ANIMATOR-PLAN.md: asset assignment (accepts) → sheet on canvas + frame picking → sequences/builder → sequencer + playback → Auto-Mapper → compile/export (QSprite JSON). Slice order = Jacob's call. Future lane: text-to-motion (Hunyuan Motion / SayMotion / Meshy) → BVH → Blender one-time retarget onto `rig.humanoid` → banked clips — the anim library shortcut. |
| **NDT Forge P0** | L | The tiled-map creator — full plan = **Appendix A** (data model, chrome, PCG phases, semantic-cell NDT generator, 2D→3D port pipeline). P0 = copy template2d → scenes + tile layers + paint/erase + JSON export → Vault. |
| **Char staging pipeline** | L | The 2D→3D character bridge — full plan = **Appendix B**. **Vault metadata KINDS** (`meta.kind` discriminated payload) is the small early piece that can land any time. |
| **Asset build step** | S | glTF-Transform/gltfpack pipeline over `public/assets` GLBs: meshopt-compress + quantize + prune (+ KTX2 textures later) → 3–10× smaller; wire `MeshoptDecoder` in loaders (2 lines). Library form ⇒ the future "publish character" server transform (inject region extras). |
| **Golden-screenshot QA** | S | The one test genre that earns its keep here: deterministic showcase mode (fixed camera + seeded state, per gender × native palette) + Playwright `toHaveScreenshot` baselines. Doubles as the agent-vision comparison gate and the Blender↔web parity check. |
| **Library fan-out (design talk first)** | talk → M | Library = load-source for the 3D viewer/editor; fan-out per asset: add to Vault · download as \<filetype\> · send over bridge to Unreal/Blender/Unity/custom local three.js dir. Mechanics = a dedicated design talk before building (Jacob, 2026-07-26). |
| **Relay live-state upgrade** | S-M | One-shot ops are plain POST today; long ops / viewport sync / live Blender state wants SSE or WS when the time comes. BYO-key pattern = the shape for any keyed service. |
| **2D↔3D bridges** | L | Dimensional-bridge-law instances: ortho rowset capture (3D char → directional spritesheets, RPG 3×4 / 8×4, 48px band → feeds animator/stitcher) · map JSON → three.js world builder (Appendix A §round-trip). |
| **Onboarding page** | S | Still a bare stub. |
| **TSL / WebGPU shader port** | M · future | Region-mask toon shader is raw GLSL `ShaderMaterial` — rewrite as TSL node graph (one source → GLSL+WGSL; structurally Blender-node-shaped ⇒ plausible dual-emitter someday). Adopt `WebGPURenderer` w/ auto WebGL fallback; post-FX (outline pass, bloom) as RenderPipeline nodes. |
| **VRM export adapter** | M · future | VRM's standardized humanoid rig ≈ ecosystem's one-skeleton law. An export adapter = free access to viewers/VTuber/retarget tooling for testing before our engine exists. One pipeline, two emitters (GLB + VRM). |
| **Local gen stack** | future · GPU | Self-hosted Hunyuan3D (mesh) + Hunyuan Motion (BVH/FBX clips) beside Meshy/Tripo/Hitem3d — free/private donor + motion gen feeding the same intake rituals. Needs a GPU box. Donor grammar extends cleanly (`hunyuan.humanoid.*`). |
| **Crowds tech** | engine-era | Our laws are purpose-built for it: one topology + one skeleton + one region-mask material ⇒ instanced skinned crowds ("all look different, one draw call"). Toolkit: `BatchedMesh` (core), agargaro/instanced-mesh (LOD+skinning), VAT bakes of the shared clip library. |

## Decisions awaiting Jacob
- ~~**D1 — git init**~~ **RESOLVED:** the repo is initialised at the `nexus-realms-online` root
  and pushed to the PRIVATE GitHub repo `jacob-the-parson/nr3d` (branch `main`). Sprites commit
  directly — **no LFS needed** (largest object is the 3.5 MB .blend). Ignored: `node_modules`,
  `.next`, build output, `__pycache__`, `*.tsbuildinfo`, logs, `.env*` and
  `.claude/settings.local.json`.
- **D2 — canvais footer**: canvais originally shipped NO footer; ours adds Clear/Vault
  per the footer shape law — keep or strip.
- **D3 — stitcher cell default**: changed 64→48 per the pipeline law — confirm.
- **D5 — flow stretch smoothing**: `imageSmoothingEnabled=false` applied to ALL resize
  modes incl. stretch (which was originally smoothed) — pixel-first choice, veto welcome.
- **D6 — canvais export**: stage exporter captures the VIEWPORT (pan/zoom as seen,
  pixelRatio 2); a content-bounds capture is a possible upgrade.
- **Naming talk bundle**: NDT Forge final name · faction folder letters (a/b/c temp) ·
  flagged datablock names.
- **NDT Forge opens** (Appendix A): default map size (20×15?) · max size before
  DOM-windowing · which special layers ship first (region? shadow?).
- **Char staging build order** (Appendix B): after/alongside NDT Forge — Jacob's call.
- ~~Thumb vocabulary~~ **RESOLVED 2026-07-30 (Jacob): anatomy wins.** The thumb is
  `finger.01.{metacarpal, proximal, distal}` everywhere — bodies, hand part, manifest,
  legends, material. Fingers 02–05 keep `{proximal, middle, distal}`. The asymmetry is
  correct, not a bug: a thumb has only two phalanges, and its metacarpal is visible
  (the thenar mound) where fingers 02–05's metacarpals are buried in the palm mass and
  belong to the `hand` region. **Naming law:** region names follow real anatomy — a
  region is named for the bone/structure it covers, never forced into a uniform pattern.

## Parking lot (ideas, not scheduled)
- Web Workers + OffscreenCanvas for heavy browser jobs (export slicing, ID-map recolor
  bakes, palette exports; zip via JSZip).
- `destination-out` composite op = canvas erase/masking idiom → in-browser ID-map
  touch-up tools.
- Stitcher pointer-capture marquee + shift-extend → echo for box-selecting regions on
  the 3D body.
- drei-vanilla helpers usable in the vanilla three core (no React commitment).
- Region ID maps as semantic masks for AI texturing: "leather on `chest`, skin on
  `face.upper`" = mask-gated generation; flow v1 = flat idcolor albedo → AI detail pass
  per region group → bake to 2K atlas → procedural toon ramp on top (ship-look law kept).
- N1 (minor): canvais OS-file object URLs never revoked — leak-tolerant by choice.

## Watch list / study candidates
- **Spark 2.0** (sparkjs.dev) — streaming-LOD gaussian-splat worlds in three.js; not our
  art direction, but their chunking ≈ NDT streaming; splat backdrops/vistas someday.
- **Kinetiq** — in-browser auto-rig + universal retarget exists; we rig in Blender via
  the bridge (stronger), but client-side rigging is proven viable.
- **Dissection candidates** (labs/ deleted — clone fresh when studied): CharacterStudio
  (M3-org, web VRM avatar creator — closest existing product shape) ·
  threejs-game-skills (slice/QA structure) · von-grid + house_builder (grid-world UX).
- Full research detail: [THREE-NOTES.md](./THREE-NOTES.md) (18-iteration log, reference).

## Standing decisions already made
Universal adapter (no hardcoded vendors) · Vault = data bus w/ metadata kinds · library
vs Vault = separate trees, shared contracts · footer shape law · staging law · dimension
colors · 48px/NDT band defaults · vanilla-TS three core wrapped by thin React (engine =
assembled on three.js: Rapier/instanced-mesh/ECS-later — not Babylon/PlayCanvas) ·
one-skeleton law kills runtime retargeting (imports = one static name-map in Blender) ·
**port conventions** (established slicer→animator, apply to every new domain): vault
boundary = Blob/object-URLs (`draggedItem.url`, `application/x-nro-vault-item`,
`fetch(url).blob()` on send) · drawerRight page(s) w/ Tools chrome · footer = KeycapAction
shape law · accepts hook per domain · DrawerLayerList for layers · exports carry
metadata `{width,height}` = cell/tile dims · object-URL revoke hygiene (ownership-aware) ·
`crypto.randomUUID` over Math.random/uuid pkg · tokens not zinc · staging law for
unwired features · `--webpack` mode only (Smart App Control blocks SWC — never remove).

---

# Appendix A — NDT FORGE (the tiled-map creator; ex `mapper-plan.md`)

Status: **planned, not started.** Name "NDT Forge" pending the naming talk. A scene here
IS an NDT grid (1 cell = 1 m, 48 px = the RMMZ/NDT texel band). Built as **the first
copy of `template2d`** (templates are explainers by law; this proves the copy flow).

> **THE DIMENSIONAL BRIDGE LAW (platform-level, Jacob 2026-07-26):** everything authored
> semantically ports BOTH WAYS across the dimension axis — maps, props, animations,
> characters, eventually anything. 2D items port UP (JSON → 3D resolvers), 3D items port
> DOWN (orthographic capture → sheets/rowsets). Semantic data is the canonical form;
> every engine/dimension render is a resolver output. Design every new system
> bridge-ready.

## Data model (`stores/domains/mapperStore`)
```
Scene   { id, name: 'scene_1', width×height (cells), tileSize: 48, layers: MapLayer[] }
MapLayer{ id, name, kind: 'tile' | 'collision' | 'event' (+ later 'region' | 'shadow'),
          visible, locked?, data }
  tile      → flat number[] (w*h), 0 = empty, else tileId   ← RMMZ-style flat arrays
  collision → bit array (red overlay brush)
  event     → sparse markers { cellIndex: { name, note } }
Tileset { id, name, tileSize, source: 'pcg' | 'image', atlas, tiles[] }
Editor  { activeSceneId, activeLayerId, activeTileId, tool: paint|erase|fill, zoom }
```

## Chrome plan
- **Right drawer**: Layers page = `DrawerLayerList` w/ KIND BADGES (collision = red
  shield · event = flag · specials pinned under the numbered stack) · Tileset page
  (palette grid, click arms brush) · Map page (name/size/tileSize).
- **`drawerLeftBottom`**: tileset inventory (thumbnail rows, slicer-inventory heritage,
  PopContext right-click menu).
- **Footer**: `[Grid] [Collision-view] [reserved] [trash-Clear layer] [Vault export]`.
- **`accepts: ['2d']`**: Vault images arrive as TILESET SOURCES.
- Scene thumbnails reuse template2d's mini-map pattern (build that on the template first).

## Smart tilesets (PCG, phased)
- **A — procedural + autotile**: param-driven tileset gen in-browser (terrain colors +
  noise) + neighbor-bitmask AUTOTILING (4-bit/16-variant first → RMMZ 47-blob A2 later).
- **B — AI tilesets**: prompt → sheet → chroma-key → slice → autotile set (aiStore
  templates; the chroma pipeline from the provider-adapters row).
- **C — sibling feeds**: slicer/stitcher outputs flow in via the Vault send-row.

## Export schema (canonical, versioned, engine-neutral)
```json
{ "v": 1, "name": "scene_1", "tileSize": 48, "width": 20, "height": 15,
  "layers": [
    { "name": "Layer 0", "kind": "tile", "data": [0,3,3,7] },
    { "kind": "collision", "data": [0,1,1,0] },
    { "kind": "event", "objects": [{ "x": 3, "y": 4, "name": "door_01" }] } ],
  "tilesets": [{ "name": "pcg_grass_01", "tileSize": 48, "count": 16 }] }
```
Vault export = JSON blob + rendered PNG preview + download. RMMZ `Map00X.json` = a later
second export preset; this schema stays canonical (no RMMZ-isms in canonical fields —
RMMZ quirks live only in the export preset). Schema addition: scene-level
`palette: [semantic ids…]`, layer `data` holds palette indices.

## Scenes + the paper fold
Tab strip over the canvas (`scene_1 · scene_2 · +`). Transition = CSS 3D fold (top-hinge
rotateX + shading gradient, spring). Rename = click-to-edit inline (Vault-name pattern).
Polish phase — never blocks function.

## Build phases
- **P0**: copy template2d → mapper; scenes + numbered tile layers, paint/erase w/
  built-in PCG placeholder tileset; layers panel; JSON export → Vault. (usable day one)
- **P1**: autotile brush + PCG tileset generator panel.
- **P2**: scene tabs + paper fold + rename.
- **P3**: collision brush + event markers (PopContext + ModalEventEditor).
- **P4**: Vault/slicer intake + RMMZ export preset + region/shadow kinds.

## Prerequisites to verify at P0 (the port-era "pipeline obligations")
48px defaults everywhere ✓ (law) · stitcher exports carry cell-dim metadata ✓ · verify:
slicer per-tile send-row (tiles as palette entries) · Vault card face for JSON blobs
(icon or PNG sidecar) · DrawerLayerList badge/kind-icon slot (icon support exists —
confirm it covers kinds).

## THE NDT GENERATOR — the semantic core (the deep design)
Built from the ATOMIC UNIT upward. **1 tile (48×48 px) = 1 NDT.2d = 1 NDT.3d = 1 meter.**
A 100×100 map = 100×100 NDTs, same grid in both engines.

1. **The atomic unit is a SEMANTIC CELL, never a png.** Cells store meaning; renders are
   resolver output. Tile ids = explicit semantic tags per the naming grammar:
   `terrain.grass.01` · `terrain.water.01` · `wall.brick.02` · `prop.fence.wood.01` ·
   `struct.bridge.wood.01`. JSON decodes WHAT (grass), WHICH variant (01); each engine's
   resolver decides HOW to draw it.
2. **Z-band model (one axis, three worlds).** z0–z9 = level bands (z0 floor — may be
   EMPTY, holes are legal; z1+ = deco/bushes/fences/bridges/buildings; characters render
   interleaved per band rules) · z10+ = overhead parallax (canopy, fog, fly-over) ·
   negative z = under-parallax (chasm backdrops). Editor layers map onto bands; band
   semantics are part of the schema.
3. **Per-cell flags (RMMZ heritage, ours to extend):** `{ pass: 4-dir bits, ladder,
   bush, counter, damage, terrainTag }` — on the tile DEFINITION with per-cell overrides.
   RMMZ A-anatomy for the resolver: A1 animated floors · A2 ground autotiles (47-blob) ·
   A3 building walls · A4 walls+ceilings · A5 static singles · B+ prop sheets. Our
   generator emits equivalents WITHOUT hand-made tilesets.
4. **Tileset synthesis (no assets, just algos):** resolver(semantic id) → generated
   atlas — flat tones + edge ink (EON toon at tile scale); autotile blobs per terrain
   pair; animated floors = generated 3-frame cycles. A starter POCKET of prebuilt tiles
   ships as sample vocabulary.
5. **Prefabs (the algo's building blocks):** prefab = multi-cell multi-layer JSON STAMP
   (house = walls A3 + roof band + door event + collision; trees, wells, fence runs,
   area templates). **PCG composes terrain algo + prefab placement → draft map → Jacob
   edits in mapper → export.** Human-in-the-loop, not autogen soup.
6. **Round-trip law:** the SAME JSON feeds (a) the 2D render path (RMMZ-flavored) and
   (b) the three.js WORLD BUILDER — semantic id → material/mesh, 1 cell = 1 m, z-bands →
   heights/decals, collision → colliders/nav, events → anchors. Build 2D, press export,
   walk the same level in 3D.

## The 2D→3D port pipeline (first-class goal)
- tile layers → 3D scene (cell = 1 m; ids → floor/wall assets or textured planes;
  layer order → y-stacking/decals)
- collision layer → collision boxes + walkable nav grid
- event layer → named 3D anchors (doors, NPCs, portals)
- tileSize 48 ↔ NDT texel band: one authored scene, two engine targets — the map-side
  EON.rmmz ↔ EON.three bridge (character side = the ortho-rowset reverse bridge).

---

# Appendix B — CHAR STAGING (the 2D→3D character pipeline; ex `char-staging-plan.md`)

Status: **planned, not started.** The character-side instance of the DIMENSIONAL BRIDGE
LAW. Working shape from Jacob's dictation; iterate before building.

## The Vault is the DATA BUS
Every micro-domain ships outputs to the Vault **with structured metadata**; other
domains consume via send-row/accepts. Flow is app→Vault→app, never app→app direct.
vaultStore evolution: item metadata becomes a DISCRIMINATED payload —
`meta.kind: 'image.gen' | 'char.staging' | 'map.scene' | …` — AIMetadata (prompt chain)
is just the first kind. JSON sidecars ride with the blob.

## The flow
1. **2D staging** (in a 2D domain): add art OR AI-generate it (e.g. front-facing A-pose
   character). Same app: **rig a 2D skeleton over the image** (bone-pin placement) and
   declare **scale + proportions** (height 1.75 m, build: stocky…).
2. **Send structured data** to the AI 3D generator domain (Hunyuan / Meshy / own trained
   models later): image + staging sidecar. The juicy data buys a high-quality
   SYMMETRICAL model.
3. **Primitive-block base philosophy**: start from simple polygons (foot/torso/leg =
   boxes shaped AFTER the base exists) — like our base meshes with semantic section
   names. Base first, sculpt second, semantics always.
4. **3D viewport intake — the SCALE SHOWROOM**: the 2D cutout pinned to the wall beside
   a **ruler from ground 0 upward**; the generated model stands next to it. Dwarf and
   human side by side read RIGHT; a dragon shows true bulk. (1 m ticks = NDT law.)

## The staging sidecar (sketch — `char.staging` kind)
```json
{ "v": 1, "kind": "char.staging", "name": "durn.male.draft-01",
  "taxonomy": { "kind": "humanoid", "race": "durn", "gender": "male" },
  "height_m": 1.45, "build": "stocky", "stance": "a-front",
  "bones2d": [ { "name": "shoulder_l", "x": 0.38, "y": 0.71 },
               { "name": "elbow_l",   "x": 0.29, "y": 0.58 } ],
  "refs": ["<vault image id(s)>"], "notes": "" }
```
- `bones2d` names = the SHARED SKELETON's bone names (66-bone family) — the 2D rig is a
  projection of the canonical skeleton, so generator output maps home.
- Coordinates normalized 0→1 (the spatial grammar, same as NDT addressing).

## Canon tie-ins
- **VITRUVIAN LAW**: staging pose = the donor contract (A/T front-facing, palms/thumbs
  per family rest) — 2D staging is the DONOR SPEC GENERATOR for the flow doc's rules.
- **One skeleton per kind**: bones2d vocabulary = family bone names, never
  per-character. Proportions = rest-pose profile territory.
- **Semantic sections**: generated meshes conform to base topology with named regions
  (the 178-group anatomy naming) — masks from weights, never AI part-slicing.
- **Heights are real meters** on the ruler; race height variety = profile.

## Dependencies / order
Vault metadata kinds (small — can land early) · 2D staging tools (image + bone-pin
editor, a 2D-domain feature) · the AI 3D generator domain (external APIs first) · the
scale-showroom viewport (template3d descendant; pairs with camera bookmarks +
turnaround captures). Build order TBD — alongside/after NDT Forge.
