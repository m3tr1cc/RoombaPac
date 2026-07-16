# Design QA: modular furniture obstacles

- Source visual truth: `docs/references/user-feedback-obstacle-placement.jpg`, `docs/references/annotated-pacman-map.png`, and `docs/references/furniture-obstacle-categories.png`
- Implementation evidence: `docs/qa/desktop-building-blocks.png` and `docs/qa/mobile-building-blocks.png`
- Viewports: 1440×810 desktop, 600×337 mobile landscape, and 390×844 mobile portrait
- State: compact 27×15 fixed level-one board during active play

**Full-view comparison evidence**

- The revised implementation preserves the landscape composition, symmetry, strict single-lane routes, central cage, obstacle islands, outer boundary, and side tunnels.
- The active world uses 27×15 cells and 150 level-one crumbs, down from 31×17 cells and 277 crumbs. The board remains nearly flush with the 16:9 frame while actors, collectibles, and furniture render about 15% larger.
- Fixed and procedural rooms retain the exact 18-piece quota: three large rectangles, five I pieces, four T pieces, two hybrids, two corners, and two blocks. Up to 12 two-cell helpers close remaining open 2×2 floor areas without introducing additional one-cell furniture.
- Helper locations and orientations vary with the seed, while deterministic sprite selection spreads them across sofas, cabinets, tables, and appliances instead of repeating one asset.
- Unlike the feedback capture, each collision component is assembled from exact one-, two-, and three-cell furniture modules. Sofas and bookcases remain proportionate instead of being stretched across arbitrary component bounds.
- The brown collision-cell underlay has been removed. Transparent sprite space now reveals the same world floor tile used in the hallways.

**Focused-region comparison evidence**

- The supplied feedback capture and revised desktop frame were compared together at full resolution. Beige and colored one-cell chairs are complete and centered, three-cell sofas occupy their entire collision run, and T/corner shapes are visibly composed from perpendicular furniture pieces.
- A separate focused crop was unnecessary because the 1440×810 implementation frame resolves individual cell boundaries and sprite edges clearly.

**Required fidelity surfaces**

- Fonts and typography: the existing RoombaPac HUD typography and hierarchy are unchanged and remain legible at both checked viewports.
- Spacing and layout rhythm: exact module footprints align furniture centers to the cell grid, preserve one-cell hallways, and keep the cage centered.
- Colors and visual tokens: the warm floor tile remains continuous beneath transparent furniture; no extra brown underlay changes the world palette.
- Image quality and asset fidelity: all 75 catalog entries expose four authored atlas frames on a consistent 96-pixel-per-cell grid. Length-specific sofa, dresser, appliance, corner, alcove, and room masters preserve full footprints in every direction; component-based extraction keeps complete sprites together even when source art crosses a board quadrant. Canvas uses uniform nearest-neighbor scaling with no furniture rotation or footprint stretching.
- Copy and content: no user-facing copy changed; scoring, lives, and level labels remain correct.
- Icons and interactions: existing Phosphor controls remain aligned and functional; run start and a touch direction were exercised.
- Accessibility and responsiveness: semantic labels remain present, mobile touch targets remain usable, and no new motion is introduced.

**Comparison history**

1. P1 — The initial 390×844 capture clipped the idle card and primary actions outside the 16:9 frame.
   - Fix: added a compact portrait overlay treatment and exposed touch controls at mobile width.
   - Post-fix evidence: `docs/qa/mobile-portrait-idle.png` shows the complete card, both actions, and all four touch controls inside the play surface.
2. P1 — In the embedded browser, a suspended `AudioContext.resume()` could hold the start action before the engine began.
   - Fix: audio activation remains user-initiated but no longer blocks run creation or engine start.
   - Post-fix evidence: `docs/qa/desktop-running.png` and `docs/qa/mobile-landscape-running.png` show active scoring and gameplay after the start action.
3. P1 — The feedback capture showed stretched category art, half-cropped chairs/couches, and empty portions of collision obstacles.
   - Fix: replaced component-wide stretching with a deterministic exact-cover layout of one-, two-, and three-cell furniture modules; corrected atlas crop rectangles from the sprites' real alpha bounds.
   - Post-fix evidence: `docs/qa/desktop-building-blocks.png` shows centered complete chairs, full three-cell sofas, and perpendicular furniture composing T and corner obstacles.
4. P1 — A brown fallback rectangle was painted beneath every collision wall, creating a second floor color around transparent furniture.
   - Fix: removed the collision-cell fill so the normal themed world tile is the only floor beneath furniture.
   - Post-fix evidence: both revised screenshots show continuous floor tiles through every transparent furniture gap.
5. P1 — The 31×17 rooms contained roughly 285 crumbs and took too long to clear.
   - Fix: reduced fixed and procedural rooms to 27×15 cells, introduced deterministic obstacle quotas, and added strict single-lane helpers that settle rooms at 150 crumbs.
   - Post-fix evidence: the refreshed desktop and mobile landscape captures show the denser Pac-Man-like composition, larger game art, working HUD controls, and exposed touch pad.
6. P1 — The compact corridor-first generator fragmented walls into roughly 46 obstacles, 72.8% of which were isolated blocks.
   - Fix: replaced compact generation with a mirrored obstacle-first quota and exact multi-cell atlas masks; only two of 18 pieces are now one-block obstacles.
   - Post-fix evidence: the refreshed captures show coherent rooms, sofas, T junctions, hybrids, and corners without the previous field of chairs.
7. P1 — Quota-only placement left broad open floor regions that did not read as Pac-Man-style lanes.
   - Fix: added a deterministic constrained helper pass that breaks every open 2×2 area while preserving symmetry, connectivity, tunnel wrapping, and no-dead-end routes. Helper artwork is diversified independently from its collision geometry.
   - Post-fix evidence: the refreshed desktop and mobile captures show continuous single-cell routes and varied two-cell furniture helpers.
8. P1 — The first directional-atlas pass was based before the collectible-contrast merge, retained literal rotation fallbacks for several families, and split oversized source art at 2×2 board boundaries.
   - Fix: rebased onto the outlined-pellet implementation, removed the bitmap-rotation path, replaced every remaining family with authored views, and extracts complete opaque components before fitting them to fixed world-space frames.
   - Post-fix evidence: `docs/qa/furniture-v2-contact-sheet.png`, `docs/qa/furniture-v2-desktop-paused.png`, and the refreshed mobile captures show full-length views, stable padding, outlined pellets, and no clipped furniture.

**Findings**

- No actionable P0/P1/P2 differences remain.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Match the landscape maze composition and central cage.
- [x] Represent furniture categories 1–9 with production sprites.
- [x] Tile every non-boundary collision cell exactly once with a centered furniture module.
- [x] Preserve the themed world floor beneath transparent furniture.
- [x] Preserve connected, no-dead-end routes and real wrap tunnels.
- [x] Verify active desktop play and mobile touch controls.
- [x] Verify the compact board fills the 16:9 surface without clipping at desktop and mobile landscape sizes.
- [x] Verify every production furniture crop in `docs/qa/furniture-v2-contact-sheet.png` and exercise desktop keyboard, mobile touch, pause, and reset states without console errors.
- [x] Check console warnings and errors at desktop and mobile viewports.

**Follow-up Polish**

- P3: later art passes could add more two-cell sofa and shelving variants without changing collision geometry.

final result: passed
