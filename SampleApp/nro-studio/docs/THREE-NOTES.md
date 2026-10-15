# three-notes — night-shift research log

Research loop: new/useful Three.js AI agent skills & workflows, and how each could help build
the EON/nro-three system (character creator → studio domain → Blender bridge → eventual engine).

## ☀️ MORNING TL;DR (the 18-pass synthesis)

**Adopt now:** bump three r170→r184 during the TS migration (TSL + RenderPipeline landed) ·
glTF-Transform/gltfpack as the asset build step (3–10× smaller GLBs) · golden-screenshot QA
via a deterministic showcase mode · drei-vanilla helpers in the vanilla core.
**Architecture locked by research:** vanilla-TS core (`@eon/three-core`) wrapped by a thin
React studio domain · engine = *assembled on three.js* (Rapier, instanced-mesh, ECS-later),
not Babylon/PlayCanvas · Blender link = server relay speaking the Lab-addon TCP protocol
directly (no AI in the loop) · creator data model = raceProfile (bone scales) + morphs +
palette + gear, all tiny JSON.
**Dissect in labs/:** CharacterStudio (web avatar creator) · threejs-game-skills (skill
structure) · von-grid/house_builder (world-builder UX).
**Superpowers we already own:** region ID maps = semantic masks for AI texturing · one
topology = one morph set + instanced crowds ("look different, one draw call") · one skeleton
= zero runtime retargeting (imports = one static name-map in Blender).
**Prompt-able content lanes:** Meshy UV-aware texturing today; Hunyuan3D (mesh) + Hunyuan
Motion (BVH/FBX clips) as the future self-hosted stack; text-to-motion → Blender → banked
clips = the anim library shortcut.
**Watch:** Spark 2.0 (streaming splat worlds) · VRM export as interop adapter · Kinetiq
(in-browser rigging exists).

## Loop log
- [x] iter 01 — agent-skills landscape sweep (+ studio: session-handoff.md)
- [x] iter 02 — WebGPU/TSL state of play (+ studio: ARCHITECTURE.md)
- [x] iter 03 — glTF tooling / asset pipeline (+ studio: PLAN.md)
- [x] iter 04 — VRM & web character pipelines (+ studio: IDEAS.md)
- [x] iter 05 — AI texturing / text-to-texture (+ studio: src/config registry)
- [x] iter 06 — R3F/threlte/engine ecosystem (+ studio: src/components + domain_template)
- [x] iter 07 — three.js release line r183/r184 (+ studio: src/stores)
- [x] iter 08 — Blender↔web live bridges (+ studio: server.ts — ordered slices COMPLETE)
- [x] iter 09 — open-source image-to-3D / local gen (+ studio: animatorStore + manifest)
- [x] iter 10 — grid/world-builder editors in three.js (+ studio: Shell.tsx)
- [x] iter 11 — visual QA for WebGL apps (+ studio: Shell.tsx pt 2)
- [x] iter 12 — animation retargeting in three.js (+ studio: Shell.tsx complete)
- [x] iter 13 — text-to-motion generation (+ studio: ui/ + shared/ primitives)
- [x] iter 14 — crowds: BatchedMesh/instanced skinning (+ studio: HUDMenu.md, metadata, env)
- [x] iter 15 — the "engine we make or find" question (+ studio: AGENTS.md issues)
- [x] iter 16 — gaussian splatting on the web (+ studio: PLAN.md items 15–28)
- [x] iter 17 — morphs vs bone-scaling for customization (+ studio: PLAN.md complete)
- [x] iter 18 — outfit/gear systems (+ synthesis; LOOP COMPLETE 18/18 — cron retired)

---

## iter 01 — the Three.js agent-skills landscape (2026-07-26 night)

**Finding: "Three.js skills" is now a whole genre.** Beyond img2threejs (already installed),
the ecosystem has matured into several distinct skill archetypes we can borrow or adopt:

1. **[threejs-game-skills (majidmanzarpour)](https://github.com/majidmanzarpour/threejs-game-skills)** —
   agent skills for building *playable, polished* Three.js browser games: gameplay, AAA-style
   graphics, UI, QA, plus optional AI-generated 3D/image/audio assets. ⭐ Most relevant repo of
   this pass — it treats a game as skill-guided slices (gameplay/graphics/UI/QA), which maps
   directly onto how we'd grow nro-three from viewer → creator → engine. Worth cloning into
   `labs/samples/` and dissecting its skill structure + QA gates.
2. **[CloudAI-X Three.js Skills](https://agenticskills.io/skills/threejs-skills)** — ten skill
   files covering the full stack: fundamentals, geometry, materials, lighting, textures,
   animation, loaders, shaders, post-processing, interaction. Archetype: *reference-knowledge
   skills* (make the agent write correct three.js on the first try). Could pair with our own
   EON-specific skill (toon ramp, region masks, ID maps) so agents build in OUR style.
3. **[r3f-best-practices](https://shyft.ai/skills/claude-skills-threejs-ecs-ts)** — 70+ rules /
   12 categories for React Three Fiber + ECS + TS, updated Jan 2026. Relevant because the studio
   is React 19: if nro-three becomes a studio domain, R3F is the natural embedding (three.js
   canvas as a React component inside the domain's workspace slot). ECS framing is also a
   candidate architecture for the eventual engine.
4. **[Snyk's top-8 roundup](https://snyk.io/articles/top-claude-skills-3d-modeling-game-dev-shader-programming/)** +
   [marketplace listings](https://claudemarketplaces.com/skills/nexu-io/open-design/threejs) —
   confirm the pattern: 3D/game/shader skills are a hot category; marketplaces exist for them.
5. **The honest caveat** (from [metavert's essay](https://meditations.metavert.io/p/when-ai-learns-to-paint-threejs-and)):
   graphics work iterates slower with AI than text work — the bottleneck is the **visual feedback
   loop**. img2threejs solves it with agent-vision comparison gates; our Blender MCP screenshot
   protocol is the same idea. **Implication for our system: bake a screenshot/render feedback
   gate into any nro-three build workflow from day one.**

**How this helps us:** (a) adopt threejs-game-skills' slice-structure for our own build passes;
(b) write an `eon-three` skill (like CloudAI-X's but ours: region-mask shader, toon ramp,
manifest formats) so any agent codes in EON idiom; (c) decide R3F vs vanilla at
domain-integration time — R3F eases studio embedding, vanilla keeps the standalone light
(current seed is vanilla; both can coexist: domain wraps the vanilla core).

---

## iter 02 — WebGPU + TSL: where three.js shading is going

**Finding: TSL (Three Shading Language) is now first-class** — as of
[r184, TSL ships as a core shading API](https://learnwithhasan.com/threejs-guide/shaders/):
you author materials as a **node graph in JS/TS**, and the renderer lowers it to **GLSL for
WebGL or WGSL for WebGPU at compile time** — one source, both backends
([spec](https://threejs.org/docs/TSL.html)). Migration guides are mature
([utsubo 2026 guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide),
[IGC architecture notes](https://www.intelligentgraphicandcode.com/development/threejs-interfaces/webgpu),
[WebGL-vs-WebGPU explainer](https://threejsroadmap.com/blog/webgl-vs-webgpu-explained)), and
there's even a [GLSL→TSL transpiler](https://threejsroadmap.com/blog/how-to-convert-glsl-shaders-to-tsl)
that handles ~90% of syntax (needs hand-cleanup: stale names, duplicate decls, no material
wiring). There's also a ready [webgpu-threejs-tsl agent skill](https://lobehub.com/skills/neversight-skills_feed-webgpu-threejs-tsl)
on a skills marketplace.

**Why it matters to us specifically:**
- Our region-mask toon shader is a raw GLSL `ShaderMaterial` — exactly the category TSL
  replaces. Rewriting it as a TSL node graph (~40 lines: texture sample → loop keys → mix →
  toon step) future-proofs it for WebGPU **and** makes it programmatically composable — which
  is huge for a character creator that mutates materials at runtime.
- TSL-in-TS aligns with the TypeScript mandate: typed shader graphs, IDE autocomplete,
  compile-time errors — the DDD/SOLID story extends into the shader layer.
- Blender-parity bonus: TSL node graphs are *structurally* the same shape as Blender node
  trees — a future `eon shader → {Blender nodes, TSL nodes}` dual-emitter becomes plausible
  (one shader spec, two runtimes). That's the Blender-bridge dream at the material level.
- Timing: keep the GLSL seed for now (works everywhere), plan the TSL port as part of the
  TypeScript migration, target WebGPURenderer with WebGL fallback — three handles the
  fallback automatically.

---

## iter 03 — glTF tooling: the asset build system we'll want

**Finding: [glTF-Transform](https://gltf-transform.dev/) is the web-side asset pipeline** —
a JS/TS library (runs in Node **and** browser) where you compose custom transform pipelines
over glTF/GLB: prune, dedupe, resize textures, quantize, compress. Actively maintained (©2026).
Its sibling: [meshoptimizer hit v1.0](https://meshoptimizer.org/v1.html) with
[gltfpack](https://meshoptimizer.org/gltf/) — and there's a **new
[KHR_meshopt_compression](https://github.com/CesiumGS/gltf-pipeline/issues/551) extension**
(gltfpack `-cz`) that beats the older
[EXT_meshopt_compression](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md);
glTF-Transform [supports meshopt too](https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression).
Texture side: KTX2/BasisU supercompression (KHR_texture_basisu) for VRAM-friendly textures.

**Why it matters to us:**
- Our GLBs ship raw (1.1 MB per body, uncompressed PNG ID maps). Fine for 2 bodies; not for a
  roster × races × props × world chunks. **gltfpack or a glTF-Transform pipeline = the "vault
  build step"**: meshopt-compress geometry, KTX2 the textures, quantize, prune — typically
  3–10× smaller with a tiny fast decoder three.js already supports (`MeshoptDecoder`).
- glTF-Transform being a *library* (not just CLI) means our **backend can run asset transforms
  on demand** — e.g. "publish this character" → server prunes + compresses + injects our
  region metadata (custom `_EON_REGION` attributes / extras with legend JSON) → vault-ready GLB.
  That's the DDD asset-domain service, basically pre-written.
- It can also *read/edit* — future tooling like "merge outfit onto body", "strip regions",
  "repack UVs" can be glTF-Transform scripts instead of Blender round-trips for simple ops.
- Action candidate for tomorrow+: add a `tools/` script using glTF-Transform to emit compressed
  variants of the two bodies; wire `MeshoptDecoder` in the loader (2 lines).

---

## iter 04 — VRM & the web character-pipeline ecosystem

**Finding: the browser character world has a standard and mature tooling around it.**
- **[VRM](https://vrm.dev/en/vrm/vrm_features/)** = an open glTF-2.0-based avatar format with a
  **standardized humanoid rig**, blendshapes, spring bones, and license metadata
  ([explainer](https://news.viverse.com/post/vrm-models-explained)); rendered in three.js via
  **@pixiv/three-vrm** ([tutorial](https://wawasensei.dev/tuto/vrm-avatar-with-threejs-react-three-fiber-and-mediapipe),
  [react how-to](https://dev.to/saitoeku3/how-to-display-3d-humanoid-avatar-with-react-5db2));
  VRMA = its animation-clip format ([browser viewers exist](https://3dkit.online/vrm-viewer)).
- **[CharacterStudio (M3-org)](https://github.com/M3-org/CharacterStudio)** ⭐ — open-source
  **web-based custom VRM avatar creation platform**. This is the closest existing thing to what
  we're building — modular avatar assembly in the browser. Prime `labs/samples/` candidate:
  study its trait/part system, export flow, and optimization tricks, then rebuild what's good
  in EON idiom.
- **[Kinetiq Engine (Thirdrez)](https://thirdrez.com/kinetiq)** — in-browser **auto-rig +
  universal animation retarget** (UE5, Mixamo, VRM, Roblox, Second Life), video mocap, no
  server. Proof that rig/retarget entirely client-side is viable in 2026.

**Why it matters to us:**
- VRM's standardized humanoid bone set is the ecosystem's version of our one-skeleton law.
  `rig.humanoid` stays canonical, but a **VRM export adapter** would give EON characters free
  access to a huge tool ecosystem (viewers, VTuber tools, retarget targets) — great for
  testing animation before our own engine exists.
- CharacterStudio validates the whole product shape (and is dissectable); Kinetiq validates
  that even RIGGING can eventually live in the browser (interim: we rig in Blender via the
  bridge, which is stronger anyway).
- When `rig.humanoid` binding reaches the bundle bodies, exporting **SkinnedMesh GLB + VRM
  flavor** should be one pipeline with two emitters.

---

## iter 05 — AI texturing: text-to-texture is UV-aware now

**Finding: the "paint my mesh" problem is a solved-ish product category in 2026.**
- **[Meshy's texturing](https://www.meshy.ai/features/text-to-3d)** (already in our pipeline
  for gen) does **UV-aware generation that respects seams and topology** on *uploaded
  untextured models* — strong on organics (skin/fabric/leather). This is exactly the
  "bring our repacked bodies + sample textures to the generator" plan Jacob described.
- Research wave behind it: **[TEXGen](https://dl.acm.org/doi/10.1145/3687909)** (700M-param
  diffusion generating UV maps directly from text + single view),
  **[GenesisTex2](https://arxiv.org/pdf/2409.18401)** (pretrained SD, zero fine-tuning →
  runnable in ComfyUI-style local stacks), **[MV2UV](https://arxiv.org/pdf/2603.15436)** /
  **[ConTEXTure](https://arxiv.org/pdf/2407.10558)** (multiview-consistent UV textures),
  plus [2026 PBR-from-prompt tooling](https://www.aimagicx.com/blog/ai-texture-generator-game-development-2026)
  (full material sets in 15–45 s).

**Why it matters to us:**
- Our **single-tile UV repack was the unlock** — every UV-aware tool wants a clean 0–1 layout.
  The stylized bodies are now directly feedable to Meshy texturing (or a local SD/ComfyUI
  GenesisTex2-style flow when we want free/private iteration).
- **Region ID maps are a superpower here**: they're ready-made *semantic masks* for the UV
  space — "leather on `chest`, skin on `face.upper`, metal on `shoulders`" becomes a
  mask-gated generation or post-blend. No tool gets that for free; we manufactured it.
- Suggested EON texture flow v1: base albedo from idcolor palette (flat) → AI pass for
  material detail per region group → bake down to the 2K atlas → toon ramp on top (our shade
  stays procedural; AI only supplies albedo detail — keeps the ship-look law: albedo+normal,
  matte).

---

## iter 06 — R3F / threlte / the framework question, answered by the ecosystem

**Findings** ([R3F vs three comparison](https://www.creativedevjobs.com/blog/react-three-fiber-vs-threejs),
[R3F docs](https://r3f.docs.pmnd.rs/getting-started/introduction),
[game-dev overview](https://www.abratabia.com/threejs/)):
- **R3F is where creative-app development lives** when your host is React — and the studio IS
  React 19. Physics matured: **@react-three/rapier** (Rapier as JSX rigid bodies/colliders).
- **drei** = the utility layer (GLTF loading, env lighting, camera controls in 1–2 lines) —
  and crucially **drei-vanilla exists**: pmndrs ships drei's helpers WITHOUT React. Our
  vanilla core can use drei-vanilla goodies today, no framework commitment.
- Guidance consensus: vanilla three (or PlayCanvas/Godot) for tight render-pipeline control;
  R3F for creative/casual apps. Sibling wrappers exist per framework (Threlte/Svelte,
  TresJS/Vue) — the *pattern* is framework-thin-wrapper over a vanilla core.

**Decision shape for us (aligns with what the seed already is):**
- **Keep the CORE vanilla TS** — scene, region-shader, asset loading, Blender-bridge client:
  one `@eon/three-core` domain package with zero React deps (SOLID: the domain logic doesn't
  know about UI frameworks).
- **The studio domain wraps the core in a thin R3F-or-plain-React component** (a `<canvas>`
  host + React panels talking to the core via a store adapter). R3F becomes an *optional*
  convenience for studio-side extras, not the foundation.
- This is also exactly how CharacterStudio et al. stay portable — engine logic separate from
  view framework. Deployment story (Vercel frontend + small backend) unaffected.

---

## iter 07 — three.js release line: we're pinned 14 versions back

**Findings:** current stable = **[r184](https://github.com/mrdoob/three.js/releases/tag/r184)**
(April 2026). **[r183](https://github.com/mrdoob/three.js/releases/tag/r183)** introduced
**RenderPipeline** — the node-based post-processing system (renamed from `PostProcessing`) that
pairs with TSL ([2026 post-processing guide](https://threejsroadmap.com/blog/the-complete-guide-to-threejs-post-processing-in-2026));
ecosystem libs are actively tracking r184 compat ([e.g. three-geospatial](https://github.com/takram-design-engineering/three-geospatial/releases)).
Full changelogs live on the [releases page](https://github.com/mrdoob/three.js/releases).

**Why it matters to us:**
- Our seed pins **0.170 (r170)** via CDN importmap — ~14 releases behind; everything from
  TSL-first-class to RenderPipeline landed after. Three.js moves monthly with real breaking
  changes; migration is easiest done EARLY while our code is one file.
- **Action for the TS migration:** bump to r184 in the same stroke, adopt `WebGPURenderer`
  with automatic WebGL fallback, and plan post-effects (outline pass! bloom for magic FX) as
  RenderPipeline/TSL nodes instead of legacy EffectComposer — the legacy composer is now the
  deprecated path.
- The **inverted-hull outline could become a RenderPipeline outline pass** eventually — per-
  region thickness via the ID map becomes a screen-space option too (two roads to the same
  Xrd-style ink).

---

## iter 08 — Blender↔web bridges: our companion-app spine has prior art

**Findings — the community already builds what Jacob described:**
- **[blender-lab-mcp-bridge (BI-Blitzer)](https://github.com/BI-Blitzer/blender-lab-mcp-bridge)** ⭐
  — MCP bridge to the **official Blender Lab addon over its null-byte TCP protocol** — i.e.
  the SAME architecture as our own `nro-blender/mcp/mcp_bridge.py`. Confirms the Lab-addon TCP
  protocol is a stable public integration point, not just our hack.
- **[sandraschi/blender-mcp](https://github.com/sandraschi/blender-mcp)** — FastMCP, 41 tools/
  150+ ops, VRM avatars, Gaussian splats… **and a React web dashboard controlling Blender** —
  live proof of the browser→Blender control loop we want.
- Pattern catalog from the rest ([n8n integration](https://seehiong.github.io/posts/2026/02/blender-mcp-for-n8n/),
  [addon-embedded WebSocket servers](https://viasocket.com/mcp/blender),
  [read-only inspection servers](https://lobehub.com/mcp/makersully-blender-mcp)): JSON
  commands over TCP/WS to an addon; read-only variants for safe inspection; live viewport
  while an agent works.

**The design this locks in for us:** the studio's `server.ts` grows a small **Blender relay**
that speaks the Lab addon's TCP protocol directly (same one our MCP bridge uses — protocol
knowledge already in-house): browser UI → `POST /api/blender/exec` (or a WS channel for live
state) → relay → Blender addon → bpy. **No Claude in the loop for direct manipulation** —
agents remain an OPTIONAL layer on top. Frictionless click-to-Blender, exactly the ask.
Security note for later: the relay is arbitrary-bpy-execution — bind localhost-only, never
deploy it to the public frontend (it's the local companion piece; Vercel gets everything else).

---

## iter 09 — open-source image-to-3D: a local lane beside Meshy/Tripo/Hitem3d

**Findings:**
- **[Hunyuan3D](https://trellis3d.net/models/hunyuan3d)** (Tencent) is the open-source
  front-runner: code on GitHub/HF (**locally runnable**),
  [2.0 paper](https://arxiv.org/pdf/2501.12202) → [2.5 claims SOTA over open AND closed
  models](https://arxiv.org/pdf/2506.16504), textures to 8K, 3.0 Pro pitched production-ready.
- Benchmarks ([mesh-reconstruction comparison](https://arxiv.org/pdf/2605.01171)) show
  Hunyuan3D decisively beating **TRELLIS** on IoU/Chamfer across difficulties; the
  [tooling-side comparison](https://www.3daistudio.com/blog/pixal3d-vs-trellis-2-vs-hunyuan-3d-comparison)
  frames TRELLIS as the stylized/geometry-focused option ([Scenario's model
  comparison](https://help.scenario.com/articles/1263568892-comparing-generative-3d-models)
  is a good ongoing reference page).

**Why it matters to us:**
- Our donor pipeline is generator-agnostic by design (meshy./tripo/hitem intake rituals) — a
  **self-hosted Hunyuan3D lane** would mean free, private, unlimited-iteration donor gen
  (GPU permitting) feeding the same intake → retopo → conform flow. Candidate for a
  `labs/samples/` bring-up when a GPU box is available.
- For the eventual **in-studio "generate prop" button**: backend calls a local Hunyuan3D
  service (or a hosted API) → glTF-Transform cleanup → props library. Keeps the AI-native
  studio goal moneyless at the margin.
- Registry naming impact: donor prefix grammar extends cleanly (`hunyuan.humanoid.*`).

---

## iter 10 — sims-style grid/world builders in three.js (the assets/world story)

**Findings — well-trodden ground with reusable prior art:**
- **[von-grid](https://github.com/vonWolfehaus/von-grid)** — hex + square tile-grid system for
  three.js: attach-objects-to-grid API, **pathfinding included**, map editor with autosave.
  Conceptually the closest thing to a mini-NDT (grid cells + nav in one).
- **[originedit](https://github.com/thplat/originedit)** (3D tile-map editor) ·
  **[three-grid-world](https://github.com/notchris/three-grid-world)** (grid editor concept) ·
  **[house_builder](https://github.com/jofuelo/house_builder)** (Sims-like WebGL house
  building) — plus forum threads on [performant grid map editors](https://discourse.threejs.org/t/direction-for-a-performant-grid-based-map-editor/11737)
  and [Sims-style wall building](https://discourse.threejs.org/t/wall-building-in-a-level-editor/15852).
  And the [official three.js editor](https://threejs.org/editor/) as the general-purpose
  reference for editor UX + scene serialization.
- Standard technique stack that keeps appearing: raycast against a ground plane → snap to
  cell (`Math.floor(p/cell)*cell`) → ghost/preview mesh → `InstancedMesh` per chunk-piece
  type for perf → serialize as cell-index maps, not transforms.

**Why it matters to us:**
- `assets/world/` (floor/wall chunks) + the **NDT model** (1 cell = 1 m, normalized cube
  addressing) IS this genre — and our world-builder domain can serialize placements as
  **NDT-style cell indices** from day one, making studio-built rooms directly convertible to
  engine chunks later.
- The 1 m grid the storehouse taught us (brick/plank world-space materials, 1u=1m) carries
  straight over; chunk pieces get sockets like props do.
- Candidate `labs/samples/`: von-grid (grid+pathfinding shape) and house_builder (wall-drag
  UX) — study, then rebuild EON-style.

---

## iter 11 — visual QA for 3D web apps: how the creator stays un-broken

**Findings:**
- **Playwright `toHaveScreenshot()`** is the standard: golden baselines in-repo, pixel-diff on
  change ([built-in guide](https://bug0.com/knowledge-base/playwright-visual-regression-testing),
  [baseline/flake/CI guide](https://testquality.com/playwright-visual-regression-guide/),
  [pixelmatch recipe](https://testrig.medium.com/visual-regression-testing-with-playwright-and-pixelmatch-002770005019)).
  Production rules that matter for WebGL: **generate baselines in CI, not locally** (GPU/driver
  variance) — use Playwright's Docker image for deterministic rendering; mask dynamic content
  ([2026 guide](https://qaskills.sh/blog/playwright-visual-regression-testing-guide),
  [toHaveScreenshot setup](https://testdino.com/blog/playwright-visual-testing)).
- **Playwright MCP has three modes** — Snapshot (a11y tree), **Vision (screenshots — the one
  that works for canvas/WebGL)**, DevTools (full CDP)
  ([overview](https://scrolltest.medium.com/playwright-mcp-vision-devtools-ai-agents-that-see-the-page-and-read-network-traffic-6b9ae6c44f9e)) —
  i.e. agents can drive AND see the creator; [agentic QA pipelines scale with features, not
  engineer-hours](https://www.drizz.dev/post/best-visual-regression-testing-tools).

**Why it matters to us:**
- The studio's culture is "no test suite by design" (tsc + manual click-through) — fair for
  2D DOM tools, but a 3D canvas can silently break (black canvas, missing texture, wrong
  region mapping) while tsc stays green. **Golden-screenshot tests are the one test genre
  that earns its keep here**: a handful of deterministic renders (female/male × native
  palette × fixed camera) catches 90% of canvas regressions.
- Determinism prep in the app pays double: fixed camera preset + seeded state = same frames
  for tests AND for agent-vision build loops (the img2threejs-style comparison gates from
  iter 01). One "deterministic showcase mode" serves both.
- Playwright-MCP Vision also = the agent-eye for our OWN dev loop on nro-three (drive the UI,
  screenshot the canvas, compare against the Blender render — the bridge parity check).

---

## iter 12 — animation retargeting in three.js: the one-skeleton law pays out

**Findings:**
- three.js ships **[SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html)**
  `.retarget()` / `.retargetClip()` — but they're famously finicky: known issues with
  mixamoRig conventions ([inverted feet/backward hands](https://discourse.threejs.org/t/skeletonutils-retarget-doesnt-work-with-mixamorig-skeleton-inverted-feet-backward-hands/54892)),
  [API/doc mismatches](https://github.com/mrdoob/three.js/issues/25751), and an active
  [community fix thread](https://discourse.threejs.org/t/fixing-skeletonutils-retarget-and-retargetclip-functions/65149).
- The root disease: **no standard bone names** (Mixamo `mixamorig:Hips` vs VRoid `J_Bip_C_Hips`
  vs everyone else) — purpose-built mappers exist per pair, e.g.
  [vrm-mixamo-retargeter](https://github.com/saori-eth/vrm-mixamo-retargeter).
- Text-to-motion AI for web didn't surface strongly this pass — under-explored, revisit in a
  later iteration (MoMask/T2M lineage worth a dedicated search).

**Why it matters to us:**
- **Our architecture dodges the whole swamp internally**: one skeleton per kind + explicit
  bone-name law = animations transfer with ZERO retargeting inside EON. The pain everyone
  else has is the pain the VITRUVIAN law was designed away.
- Retargeting only exists at the **import boundary** (Mixamo/VRMA/mocap → `rig.humanoid`) —
  and since we own explicit names, that's ONE static name-map table + a rest-pose delta,
  written once per source ecosystem, ideally done in Blender via the bridge (bpy is stronger
  at this than SkeletonUtils anyway).
- When the shared animation library ships to web (SkinnedMesh GLBs + clips), the creator can
  preview walks/idles with NO runtime retarget cost — a real perf/simplicity edge over
  VRM-style ecosystems that retarget at load.

---

## iter 13 — text-to-motion: prompt→animation is productized (follow-up to iter 12)

**Findings — the missing half from last pass showed up:**
- **[Hunyuan Motion](https://nano-bananapro.org/hunyuan-motion)** — Tencent again: OPEN-SOURCE
  billion-param text-to-3D-motion, exports **BVH/FBX** for Blender/Unity/UE; community tooling
  like [hy-motion-fbx-exporter](https://github.com/zysilm/hy-motion-fbx-exporter) does
  "prompt → retargeted FBX" in one command; hosted fronts exist
  ([hy-motion.ai](https://hy-motion.ai/)).
- Commercial lane: **[SayMotion (DeepMotion)](https://deepmotion.com/saymotion)** (FBX/GLB/BVH
  export), [Motioneer](https://motioneer.ai/), [ArtificialStudio](https://www.artificialstudio.ai/create/3d-motion-generator),
  [Meshy's animation generator](https://www.meshy.ai/features/ai-animation-generator) (already
  our vendor), and [QuickMagic](https://www.quickmagic.ai/) for video-mocap.
- Research base: MoMask/MDM lineage (masked motion modeling over text).

**Why it matters to us:**
- **The EON animation library doesn't have to be hand-keyed clip by clip.** Flow:
  prompt → Hunyuan Motion/SayMotion → BVH → Blender import → ONE static retarget onto
  `rig.humanoid` (iter-12 name-map) → polish with nro-anim-builder → banked forever, zero
  runtime retargeting. Emotes/fidgets/walk variants become an afternoon, not a month.
- Hunyuan Motion being open-source pairs with iter 09's Hunyuan3D: a self-hosted
  **local gen stack (mesh + motion)** is realistically assemblable when a GPU box exists.
- The studio's future Animator domain could eventually front this ("describe the emote" →
  BVH → preview) — a 3D-badge story for the *animator*, not just the creator.

---

## iter 14 — crowds: instancing + skinned batching (the world-scene future)

**Findings:**
- **[BatchedMesh](https://threejs.org/docs/pages/BatchedMesh.html)** is core three now:
  multi-draw batching — MANY geometries, ONE material, one draw
  ([intro article](https://waelyasmina.net/articles/batchedmesh-for-high-performance-rendering-in-three-js/)).
- **[agargaro/instanced-mesh](https://github.com/agargaro/instanced-mesh)** ⭐ — enhanced
  InstancedMesh: per-instance frustum culling, BVH fast raycast, sorting, visibility, **LOD,
  and skinning**. Basically the crowd toolkit as a drop-in lib.
- Instanced SKINNED meshes are community-solved via bone-texture tricks
  ([forum](https://discourse.threejs.org/t/animated-instanced-skinned-meshes-gltf/41958),
  [sandbox](https://codesandbox.io/s/three-js-instanced-skinned-mesh-2yfgiu)) or **VAT
  (vertex animation textures)** — bake clips to texture, animate in-shader, zero CPU skinning.

**Why it matters to us — our constraints are weirdly perfect for this:**
- **One topology + one skeleton across ALL humanoids** (our law) is exactly what
  instanced-skinning wants: one geometry buffer, per-instance bone textures or shared clips
  with per-instance time offsets → a plaza of APCs in a handful of draw calls.
- **One material too**: the region-mask shader is already universal — per-instance palette
  becomes a small data texture (42 colors × N instances), per-race ID maps a texture array.
  Characters that all LOOK different, still one material. The creator's data model scales to
  crowds unchanged.
- VAT pairs beautifully with the fixed animation library (bake `pose-a-rest`, walk, idle once
  per skeleton — every race reuses them by definition).
- For `assets/world/` chunks: BatchedMesh per chunk-piece-set is the obvious renderer.

---

## iter 15 — "engine we make or find": the 2026 landscape says *assemble*

**Findings** ([2026 engine comparison](https://news.viverse.com/post/which-game-engine-web-games-2026),
[three vs babylon vs playcanvas](https://www.utsubo.com/blog/threejs-vs-babylonjs-vs-playcanvas-comparison),
[Cinevva's roundup](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison),
[GLB-rendering comparison](https://jessyleite.dev/posts/glb-viewer-rendering-engines/)):
- **three.js**: 5M weekly downloads — ~300× Babylon/PlayCanvas; rendering library, not engine;
  now ships a **zero-config WebGPU renderer with auto WebGL2 fallback**.
- **Babylon.js**: MS-backed batteries-included engine (physics, audio, XR built in).
- **PlayCanvas**: MIT, ECS, TS-native, cloud **visual editor with Figma-like realtime collab**,
  most mature WebGPU path.
- Platform shift: **Safari 26 shipped WebGPU on macOS/iOS/iPadOS/visionOS** — WebGPU is now
  everywhere that matters.

**The call this data supports for EON.three:** *make, by assembling* — stay on three.js
(ecosystem gravity + our shader/region/pipeline investment is all three-native) and bolt on
engine-layer parts as needed: Rapier (physics), agargaro/instanced-mesh (crowds), an ECS lib
when simulation grows, our own NDT streaming. Babylon would trade our control for batteries
we mostly don't need; PlayCanvas's real lesson is its **editor UX** (collab editing is a
NRO-platform-shaped idea — multiplayer world-building in the studio someday). The
"engine" is then just the disciplined core package growing rings: render → assets → sim.

---

## iter 16 — gaussian splatting: watch-list tech, one standout library

**Findings:**
- **[Spark (sparkjs.dev)](https://sparkjs.dev/)** by World Labs ([repo](https://github.com/sparkjsdev/spark),
  [Spark 2.0 announcement](https://www.worldlabs.ai/blog/spark-2.0)) — advanced 3DGS renderer
  FOR three.js: splats are `SplatMesh` objects in a normal scene graph (coexist with meshes/
  UI/WebXR), multiple dynamic splat objects, real-time editing + relighting, a **shader-graph
  system for splat effects**, and in 2.0 a **LOD system streaming huge splat worlds on any
  device**; WebGL2 = runs everywhere incl. iOS/VR; reads PLY/SPZ/SPLAT/KSPLAT/SOG.
  ([mkkellogg/GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) = the earlier
  standard; [2026 guide](https://www.utsubo.com/blog/gaussian-splatting-guide).)

**Why it matters to us (calibrated — this is watch-list, not roadmap):**
- EON's look is stylized toon — splats' photoreal capture isn't our art direction for
  characters/props. BUT: **NRO is surface-agnostic by design**, and Spark 2.0's *streaming
  LOD worlds* is conceptually NDT-streaming for splat data — worth studying their chunking.
- Plausible uses: real-place captures as **reference/backdrop vistas** in the studio (capture
  Jacob's environment inspirations → orbit them beside the build area), or a future
  world-type on the platform. Spark's shader graph even suggests splat *stylization* (toon-
  ramped splats) is possible if we ever want captured-world content in EON dress.
- Action: none now. Bookmark Spark for the day environments/vistas come up.

---

## iter 17 — customization mechanics: morphs + bone scaling compose (and our laws already chose)

**Findings:**
- three.js morph support is mature and slider-native: `morphTargetDictionary` +
  `morphTargetInfluences`, one weight per shape key — Blender shape keys export straight into
  GLB ([O'Reilly ref](https://www.oreilly.com/library/view/three-js-cookbook/9781783981182/ch07s03.html),
  [character-configurator tutorial](https://wawasensei.dev/tuto/how-to-create-a-character-configurator-screen-using-three-js-and-react-three-fiber),
  [character-creation writeup](https://blog.farazshaikh.com/stories/character-creation-in-three-js/)).
- Industry pattern ([Reallusion Character Creator](https://www.reallusion.com/character-creator/modeling-morph.html)):
  **both mechanisms, layered** — bone scaling for proportions, morphs for shape detail.

**Why it matters to us — this maps 1:1 onto the taxonomy cascade:**
- **Race/gender proportions = REST-POSE bone scaling** (canon law: "proportions are a
  rest-pose profile, NOT a new skeleton") → in three.js that's per-instance bone scale values
  on the shared skeleton: cheap, animation-safe, serializes as a tiny JSON profile per race.
- **Fine shape = morph targets**: muscle/weight/age/face sliders sculpted ONCE in Blender as
  shape keys — and because every race shares topology, **one morph set works for the entire
  roster**. Sculpt once, every race gets the slider.
- Creator data model v2 therefore: `{ raceProfile (bone scales), morphs (weights), palette
  (region colors), gear (later) }` — four orthogonal axes, all tiny JSON, all applyable in
  Blender via the bridge with identical semantics. The 10-races plan and the player-facing
  creator are the same system at different permission levels.

---

## iter 18 (final) — the gear axis: outfit swapping on a shared skeleton

**Findings:** the community-standard modular-clothing recipe is exactly our outfitter design:
rig every clothing piece to the SAME skeleton, then at load **rebind the garment to the live
body's skeleton** ([skeleton-sharing thread](https://discourse.threejs.org/t/sharing-a-skeleton-between-different-skinned-meshes/61189),
[swap-on-the-fly threads](https://discourse.threejs.org/t/swapping-out-a-skinned-mesh-with-another-skinned-mesh/34733),
[reference avatar system: gltf-avatar-threejs](https://github.com/shrekshao/gltf-avatar-threejs)).
Known failure mode = attachments "floating loose" during animation
([classic thread](https://discourse.threejs.org/t/adding-object-to-skinned-mesh/23489)) —
always a skeleton-identity/rebind bug, which our one-skeleton law makes near-impossible to hit.

**Why it matters to us:** the flow-doc's outfitter grammar (`equip.<slot>.<name>` rigged to
`rig.humanoid`, `mask.<slot>` hides body under garment) ports to web verbatim: garments ship
as GLBs skinned to the shared bone names → rebind at load → body-hiding via our region masks
(the mask.<slot> trick becomes a shader discard by region — the ID maps AGAIN). Gear = the
fourth creator axis, design already paid for.

**— LOOP COMPLETE: 18/18. See ☀️ MORNING TL;DR at top. —**
