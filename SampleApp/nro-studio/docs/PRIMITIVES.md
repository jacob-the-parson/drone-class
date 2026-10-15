# UI Primitives — `components/ui/` inventory

Every primitive ships with a sibling `.md` spec (the deep doc); this page is the index.
Before inventing a pattern, check here first.

| primitive | job | spec | living demo |
|---|---|---|---|
| `ModalBase` | the one modal: portal, backdrop, Esc, scroll-lock, capped height + internal scroll, ReactNode `title`, `headerActions` slot, `maxWidth`; close X = red-hover | (spec inline in file) | ModalProfile · ModalImageDetails |
| `PopMenu` | trigger + floating panel, click-outside, up/down | (spec inline in file) | FooterUser avatar menu |
| `DrawerSection` (+`DrawerField`/`DrawerListRow`/`DrawerStat`) | the right-drawer section anatomy | [DrawerSection.md](../components/ui/DrawerSection.md) | Template Inspector |
| `CardSettings` | tri-part card: inline + preset popout + deep modal | [CardSettings.md](../components/ui/CardSettings.md) | Template Inspector → Accent Presets |
| `StagedWorkspace`/`StagedAction`/`StagedSettings` | staging-law scaffolds: disabled shells + pending tooltips + explainer card | (spec inline in StagedShell.tsx) | domain settings placeholders · animator's staged Clear/Vault keycaps (all five domains are PORTED now — StagedWorkspace currently unused, kept for future scaffolds) |
| `ModalImageDetails` (`components/shared/`) | Vault item details: checkered well, click-to-edit name, header download, AI prompt-chain copy-cards (blue/orange/purple) | (spec inline in file) | Vault → item hover → Eye |
| `.checker-bg` (globals.css) | THE transparency checkerboard, theme-aware | — | ModalImageDetails preview well |
| `BadgeDim` + `DIM_TEXT` | the dimension color law: 2D = green · 3D = orange (Blender heritage) — use wherever 2D/3D appears | (spec inline in file) | breadcrumb, dashboard cards + section labels, Vault tabs, ModalImageDetails |
| `DrawerLayerList` | the semi-universal layers pattern (slicer/stitcher/flow convergence): Eye/name/Trash rows (+ optional row icons), accent active, dashed add-row | [DrawerLayerList.md](../components/ui/DrawerLayerList.md) | Template 2D → Layers page · Template 3D → Scene Outliner · Slicer → Grid page |
| `PopContext` | right-click context menu: portal @ cursor, viewport-clamped, click/Esc dismiss, danger rows | [PopContext.md](../components/ui/PopContext.md) | Slicer → Asset Inventory rows |
| `KeycapAction` | shared footer keycap: tone-colored icon at rest, hover = wash + label tone + icon shade-shift + lift (red/green tones) | (spec inline in file) | every domain's Reset/Clear + Vault keycaps |
| `TransportPill` | rounded-full 5-btn media transport, round accent play center | [TransportPill.md](../components/ui/TransportPill.md) | Animator → Viewer page |

## Shell-family components (not generic, documented in ARCHITECTURE.md)
`Shell` · `ShellHeader` · `ShellFooter` · `DrawerShell` · `DrawerLeft` · `DrawerNav` ·
`RailLeft` · `FooterUser` · `ModalProfile` · `AuthGate` · `ThemeSync` · `VaultDock` (globals).

## Naming law
Kind prefix, always: `Modal*`, `Pop*`, `Hud*` (planned: HUDPanel for canvas overlays —
non-blocking draggable glassmorphism w/ sections API; spec = its ROADMAP row),
`Drawer*`, `Card*`, `Shell*`, `Rail*`, `Nav*`.

## Primitive roadmap (harvested from the domain recon, 2026-07-26)
| candidate | source pattern | seen in |
|---|---|---|
| ~~DrawerLayerList~~ | ✅ BUILT 2026-07-26 (see table above; expand+children = future upgrade) | stitcher, slicer, flow |
| ~~PopContext~~ | ✅ BUILT 2026-07-26 (see table above) | slicer inventory |
| ~~TransportPill~~ | ✅ BUILT 2026-07-26 (see table above) | animator viewer |
| `ToggleTiny` + `Stepper` | inline pill toggle (sr-only checkbox) · [◀ add/sub flip ▶] emerald/red action | slicer sidebar |
| ~~ModalImageDetails~~ | ✅ BUILT 2026-07-26 (see table above) | Vault item details |
| ~~.checker-bg~~ | ✅ BUILT 2026-07-26 (globals.css) | stitcher, flow, animator |
| CardSettings upgrades | accent(tinted) variant + click-toggleable title (enable/disable card) | stitcher cards, animator DimensionCard |
