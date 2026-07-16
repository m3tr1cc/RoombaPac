# Design QA: modular furniture obstacles

- Source visual truth: `docs/references/user-feedback-obstacle-placement.jpg`, `docs/references/annotated-pacman-map.png`, and `docs/references/furniture-obstacle-categories.png`
- Implementation evidence: `docs/qa/desktop-building-blocks.png` and `docs/qa/mobile-building-blocks.png`
- Viewports: 1440×810 desktop, 600×337 mobile landscape, and 390×844 mobile portrait
- State: compact 27×15 fixed level-one board during active play

**Full-view comparison evidence**

- The revised implementation preserves the landscape composition, symmetry, single-lane loop network, central cage, obstacle islands, outer boundary, and side tunnels.
- The active world now uses 27×15 cells and 210 level-one crumbs, down from 31×17 cells and 277 crumbs. The board remains nearly flush with the 16:9 frame while actors, collectibles, and furniture render about 15% larger.
- Unlike the feedback capture, each collision component is assembled from exact one-, two-, and three-cell furniture modules. Sofas and bookcases remain proportionate instead of being stretched across arbitrary component bounds.
- The brown collision-cell underlay has been removed. Transparent sprite space now reveals the same world floor tile used in the hallways.

**Focused-region comparison evidence**

- The supplied feedback capture and revised desktop frame were compared together at full resolution. Beige and colored one-cell chairs are complete and centered, three-cell sofas occupy their entire collision run, and T/corner shapes are visibly composed from perpendicular furniture pieces.
- A separate focused crop was unnecessary because the 1440×810 implementation frame resolves individual cell boundaries and sprite edges clearly.

**Required fidelity surfaces**

- Fonts and typography: the existing RoombaPac HUD typography and hierarchy are unchanged and remain legible at both checked viewports.
- Spacing and layout rhythm: exact module footprints align furniture centers to the cell grid, preserve one-cell hallways, and keep the cage centered.
- Colors and visual tokens: the warm floor tile remains continuous beneath transparent furniture; no extra brown underlay changes the world palette.
- Image quality and asset fidelity: corrected source rectangles capture complete chairs, sofas, and cabinets; nearest-neighbor Canvas rendering stays crisp, and all pieces come from the supplied alpha atlas.
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
   - Fix: reduced fixed and procedural rooms to 27×15 cells, with deterministic generation constrained to 200–225 crumbs.
   - Post-fix evidence: the refreshed desktop and mobile landscape captures show the denser Pac-Man-like composition, larger game art, working HUD controls, and exposed touch pad.

**Findings**

- No actionable P0/P1/P2 differences remain.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Match the landscape maze composition and central cage.
- [x] Represent furniture categories 1–9 with production sprites.
- [x] Tile every non-boundary collision cell exactly once with a centered furniture module.
- [x] Preserve the themed world floor beneath transparent furniture.
- [x] Preserve single-lane connectivity and real wrap tunnels.
- [x] Verify active desktop play and mobile touch controls.
- [x] Verify the compact board fills the 16:9 surface without clipping at desktop and mobile landscape sizes.
- [x] Check console warnings and errors at desktop and mobile viewports.

**Follow-up Polish**

- P3: later art passes could add more two-cell sofa and shelving variants without changing collision geometry.

final result: passed
