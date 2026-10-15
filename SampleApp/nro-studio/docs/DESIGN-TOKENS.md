# Design Tokens — theme × vibe

Two independent axes on `<html>` (both persisted in `themeStore`, surfaced in Settings→Global):
- **THEME** (`.dark` class) owns **color values**.
- **VIBE** (`data-vibe`) owns **treatment** — `soft` (default) | `toon`
  (ink outlines + hard stepped shadows).

## Surfaces & ink
| token | role |
|---|---|
| `surface-sunken` | the pit (app bg; pure black in dark — never use for controls) |
| `surface` | islands |
| `surface-raised` | cards / panels |
| `control` | button fills, pager chips |
| `track` | segmented/toggle TRACKS — dark enough that the raised active chip pops; use for any Cell\|Full-style switch |
| `ink` / `ink-muted` | text |
| `edge` / `edge-strong` | borders / outline ink (edge-strong flips LIGHT in dark mode) |

## Color roles — 3-tone toon triplets (`shadow` / base / `high`)
`primary` = emerald (brand/status) · `secondary` = orange (the chrome accent) ·
`tertiary` = violet. Usage: base for fills, `-shadow` for hover-darken, `-high` for tints.

## Dimension color law (2026-07-26)
**2D = green (emerald) · 3D = orange (Blender heritage).** Single source:
`components/ui/BadgeDim.tsx` (`BadgeDim` pill + `DIM_TEXT` inline classes). Used by the
breadcrumb, dashboard badges + section labels, Vault mode tabs, ModalImageDetails —
and every future 2D/3D marker. template2d/template3d themes match their dimension.

## Action color language
**Green = export/save goodies** (Download, send-to-Vault) · **red = destroy/dismiss**
(Trash-clear, remove, modal close X). Recipe (2026-07-26): **icon carries its tone AT
REST**; hover = tinted wash + label takes the tone + icon SHADE-SHIFTS + hover-lift
(`group-hover:-translate-y-0.5`). Footer keycaps use the shared `KeycapAction` leaf —
never hand-roll the pair again. Also lives in Vault rows, favorites trash, ModalBase
close, ModalImageDetails download.

## Vibe-driven utilities & shadows
- `vibe-card` — rounded, `--outline-w` border, `--shadow-vibe`; `vibe-btn` — press =
  translate-into-shadow. Both morph automatically when the vibe changes.
- `shadow-vibe` / `-sm` / `-lg` — layered soft (contact + ambient; deepened set in dark) or
  stepped ink offsets in toon.

## Ambient background
`.ambient-bg` (on the Shell root): radial drift (26s) + linear sweep (37s) in
`--ambient-a/b` tints (orange/violet ~5–7% alpha). Pure transform keyframes; honors
`prefers-reduced-motion`. Islands run at `/85` opacity so it breathes through.

## Rules
- Never hardcode zinc/gray in new code — tokens only (legacy chrome migrates as touched).
- New color = add the triplet in `:root`/`.dark` + `@theme inline` mapping, done.
