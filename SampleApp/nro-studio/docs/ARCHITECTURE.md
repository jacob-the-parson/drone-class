# Architecture — the Shell

## Layout anatomy (desktop / `wide` + `medium` tiers)
```
┌ pit (surface-sunken + ambient-bg gradients) ─────────────────────┐
│ ┌LEFT UNIT────┐  ┌HEADER ISLAND──────────────────────────┐      │
│ │ hdr chunk   │  │ (crumb rides the WORKSPACE center line)│      │
│ │ DrawerNav   │  └───────────────────────────────────────┘      │
│ │ per-domain  │  ┌WORKSPACE ISLAND──────────┐ ┌RIGHT DRAWER─┐   │
│ │ VaultDock   │  │  <routed page>           │ │ DrawerShell │   │
│ │ FooterUser  │  └──────────────────────────┘ └─────────────┘   │
│ └─────────────┘                                                  │
└┌FOOTER TRAY (full width, z-50): 5 keycap tabs┐──────────────────┘
```
- **Left unit** = full-height island, SEGMENTED (see DOMAINS.md): header chunk · domain
  pager · favorites (always present, capped+scroll, trash always visible w/ red hover,
  drag-to-reorder w/ accent drop-line preview + `setDragImage` row snapshot) ·
  `drawerLeftBottom` per-domain area (non-pageable) · VaultDock · FooterUser.
  Collapsed ≠ gone: springs to `RailLeft` (64px icon toolbar: NX(toggle) · divider ·
  active-domain icon over its chevrons (w-7, gutter so hovers don't kiss the edge) ·
  ★ + fav icons · storage · avatar+status · theme). Widths: 256 expanded / 64 rail /
  right 288 (fixed — frames animate, content never resizes; no vw clamps, they caused
  bleed). Animated asides are `box-content` so the 1px border doesn't clip content
  (the "right edge closer than left" bug).
- **Header crumb** = House pill (highlighted + filled on /dashboard, quick-click home;
  label hides below `sm`) + `>` domain crumb + BadgeDim. Lives IN the header island
  (tracks the left unit's spring for free) and springs left by half the right drawer's
  footprint when it opens — always centered on the workspace island, never the screen.
- **Islands**: `rounded-xl border-edge bg-*/85 shadow-vibe`, 12px rhythm. Layering:
  pit → island (`surface`) → card (`surface-raised`) → control fills (`control`).
- **Footer** = full-width rounded tray, 5 tab keycaps (gap divots, edge-strong/30 borders,
  hover lights fill+text). Future mobile toolbar; drawers can never cover it.

## Tiers (policy lives in `shellStore` ACTIONS, never components)
- `wide` ≥1280 — both drawers may open.
- `medium` ≥768 — one at a time (opening one closes the other).
- `compact` <768 — no rail; drawers overlay as islands (8px edge inset) over a backdrop;
  header shows NX (=open) since the left unit is hidden.

## Motion
Spring `{ bounce: 0.2, duration: 0.5 }` for all drawer open/close (width in-flow, translate
overlay) + rail⇄drawer content crossfade + the header crumb's workspace-center shift +
VaultDock expand. Backdrop fades 0.2s. Ambient bg = pure-CSS transform keyframes
(radial drift 26s + linear sweep 37s), reduced-motion safe.

## Scrollbars
Hidden app-wide (globals.css `*` rule) — scrolling works everywhere, no gutters carved
out of islands. **Opt-in `.scrollbars` utility** (thin, edge-tinted) exists for wide
CANVAS VIEWPORTS where the affordance matters (slicer grid, stitcher panes) — chrome
lists/drawers stay bare.

## Registry flow
`usePathname()` segment → `appByRoute()` → active `AppDefinition` → Shell renders its chrome
(drawers/footer/theme/badge); the routed `page.tsx` IS the workspace. Adding a domain never
touches Shell (see DOMAINS.md).
