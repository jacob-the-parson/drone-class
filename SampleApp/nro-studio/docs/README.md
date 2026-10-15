# NRO Studio — System Docs

Quick-scan index. Each doc is short and current; update the doc **in the same change** that
alters its system (the docs-first culture).

## TOC

| doc | system | open when |
|---|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | the Shell: layout units, tiers, drawers, registry flow | touching chrome, adding layout behavior |
| [DOMAINS.md](./DOMAINS.md) | domain contract: manifests, slots, template family, how to add an app | creating/cloning any domain |
| [DESIGN-TOKENS.md](./DESIGN-TOKENS.md) | theme × vibe token system, surfaces, triplets, utilities | styling anything, adding colors |
| [PRIMITIVES.md](./PRIMITIVES.md) | `components/ui/` inventory + links to sibling `.md` specs | building UI, before inventing a new pattern |
| [STORES.md](./STORES.md) | state taxonomy, zero-prop law, persistence choices | adding/changing state |
| [ANIMATOR-PLAN.md](./ANIMATOR-PLAN.md) | the animator build plan — SOLE design record (data model, QSprite manifest, feature specs) | building out the animator domain |
| [ROADMAP.md](./ROADMAP.md) | THE single board: all open items + decisions + watch list + the NDT Forge & char-staging plans (appendices) — plan shelf consolidated 2026-07-29 | picking the next build |
| [THREE-NOTES.md](./THREE-NOTES.md) | the 18-iteration three.js/AI research log (reference; synthesis absorbed into ROADMAP) | digging into a watch-list/research item |

## The laws (short form)
1. **Zero-prop slots** — slot components self-connect to stores; props only for true composition.
2. **Kind-prefix names** — `Modal*`, `Pop*`, `Drawer*`, `Shell*`, `Card*`, `Rail*`, `Nav*`, `Badge*`.
3. **Policy lives in store actions** — components render state, never decide layout rules.
4. **Routes own the workspace; the registry owns the chrome.**
5. **Every UI primitive ships with a sibling `.md`.**
6. **These docs are the blueprint** — the predecessor app is gone from the project;
   this system book + the primitive `.md` specs are the sole spec. Live-read code
   before changing it — assumptions are worse than honest mistakes.
7. **Color languages** — dimension: 2D = green, 3D = orange; actions: green = export/save,
   red = destroy/dismiss (see DESIGN-TOKENS.md).
8. **Staging law** — scaffolded domains render planned controls disabled w/ "pending"
   tooltips + a dashed explainer (see DOMAINS.md; StagedShell primitives).
