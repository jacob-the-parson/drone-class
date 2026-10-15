# Animator — build plan & migrated knowledge

The complete animator design record — data model, manifest shape, feature specs —
distilled 2026-07-28. **This doc is the SOLE source**: the predecessor notes and the
original standalone animator app are no longer in the project; everything needed was
captured below.

## The intended flow (the finished vision)
1. Asset arrives **from the Vault** (never a domain-owned upload — Studio decision):
   send-row `accepts` hook and/or an in-domain "choose source asset" picker.
2. Set the sheet matrix (cols × rows) — default **8×12 for 576×384 RMMZ MZ sheets**
   (48px band).
3. Create sequences: quick Standard Library buttons or `New` custom (modal w/ optional
   **multi-directional mode**: 4-dir/8-dir segmented + direction checkboxes →
   "Deploy N Channels").
4. **Click grid cells on the ANIM_GRID canvas to toggle frames** into the selected
   sequence (overlays: grid lines, selected-frame highlights, index numbers).
5. Preview + manage in the right panel; compile/export.

## Data model (from the standalone, recorded verbatim)
- `Asset { id, name, imageUrl, rows, cols }` — 8×12 default for MZ sheets, else 4×8.
- `AnimationSequence { id, name, fps, loop, pattern: frameIndex[], speed?, adjust?, assetId? }`
- `QSpriteConfig { configName, rows?, cols?, anchorX: 0.5, anchorY: 1 }` ← feet-anchored.
- Standard Library animations: Idle Walk Run Attack Hurt Die Jump Fall Push Pull Lift Carry.
- Directions — 4: Down Left Right Up · 8: + the diagonals (Down Left, Up Left, Up Right, Down Right).

## Export manifest (QSprite-style, RMMZ plugin format — shape is law)
```json
{ "<configName>": {
    "cols": "<max animation length>", "rows": "<animation count>",
    "anchorX": 0.5, "anchorY": 1,
    "poses": { "<animationName>": { "pattern": [1,2,3], "speed": 8, "adjust": false } } } }
```
Vault export = compiled PNG master sheet + this JSON map attached (metadata-kind
`anim.manifest` when Vault metadata kinds land — see ROADMAP Appendix B's data-bus law).
Open question below on separate downloadable export.

## Feature specs (designed, not yet built)
- **ANIM_CHASSIS** (left area → our `drawerLeftBottom`, partially = AnimatorCellsPanel):
  Set Cols / Set Rows (disabled until an asset is active) + **Rotary Auto-Mapper**:
  chevrons cycle Standard Library names, "DEPLOY SEQUENCE MAP" batch-creates 4
  directional sequences (each ROW = a direction, each COLUMN = a frame).
  NON-PORT: the standalone `Export ID` field — the Vault owns asset naming.
- **ANIM_BUILDER** (workspace bottom strip — scaffolded): quick buttons select existing
  sequences or open the add-sequence modal for missing ones; `New` = custom modal.
- **ANIM_Sequencer** (right panel, below viewer): sequence cards (name, frame count,
  tick value) w/ select / duplicate / delete; empty "Sequence Slot" placeholder keeps
  the real estate. Selecting a sequence also activates its asset.
- **ANIM_VIEWER playback**: frame-stepping + play/pause on the preview well
  (our TransportPill), `NO SEQUENCE` / `NO FRAMES` states; Ticks(ms) + Adjust bound to
  the selected sequence.
- **COMPILE TO STORAGE** (→ Vault) and **EXPORT MANIFEST** (download PNG+JSON);
  both disabled until ≥1 asset and ≥1 sequence with frames.

## Where nro-studio already is (2026-07-28)
- ✅ Workspace ANIM_GRID canvas (checker + amber grid + border), clip tray staged,
  Grid/Index footer toggles LIVE, `animatorStore`
  (matrix + presets incl. RPG 3x4 / Directional Rowset 8x4), CardSettings dimension
  cards (≈ Set Cols/Rows), TransportPill (disabled), Viewer page + timing fields staged.
- ⬜ Remaining slices, in the notes' recommended shape: ① asset assignment
  (`accepts: ['2d']` → animator source asset + in-domain picker) · ② render the
  assigned sheet on the canvas + click-to-toggle frames · ③ sequence store model +
  ANIM_BUILDER wiring + add-sequence modal (multi-dir deploy) · ④ Sequencer list +
  viewer playback · ⑤ Rotary Auto-Mapper · ⑥ compile/export (PNG + QSprite JSON).

## Explicit non-ports (standing decisions)
SignalEngine / hex-bus reducers / `nexus_state_v1` persistence · tester domains ·
standalone shell, storage, identity, theme controls · the Export ID field.

## Open questions (Jacob)
1. Slice order: visible chassis controls first, or the sequence state model?
2. Exact Vault→Animator assignment: send-row only, or + an in-domain source picker?
3. Downloadable manifest export: separate action, or unified with Vault export?
4. The 2D↔3D bridge (ROADMAP): directional rowsets generated FROM 3D renders will
   feed this domain — sequence auto-mapping should anticipate that input.
