# Design QA: Pac-Man-style furniture maze

- Source visual truth: `docs/references/annotated-pacman-map.png` and `docs/references/furniture-obstacle-categories.png`
- Implementation evidence: `docs/qa/desktop-running.png`, `docs/qa/mobile-portrait-idle.png`, and `docs/qa/mobile-landscape-running.png`
- Viewports: 1440×810 desktop, 390×844 mobile portrait, 844×390 mobile landscape
- State: fixed level-one board, idle and active play

**Full-view comparison evidence**

- The implementation preserves the source's landscape composition, horizontal symmetry, single-lane loop network, central cage, repeated internal obstacle islands, outer wall boundary, and side-tunnel breaks.
- The numbered schematic is intentionally translated into furnished pixel art rather than copied as neon arcade media. All categories 1–9 are represented by runtime furniture metadata and production sprites.
- The generated atlas retains the supplied furniture silhouettes, palette, pixel density, and horizontal/vertical wall families without labels, beige background, chroma spill, or transparency halos.

**Focused-region comparison evidence**

- A separate crop was not required because the maze source is a 480×270 topology schematic rather than a pixel-accurate UI mock. The full 16:9 comparison resolves every source obstacle and the cage clearly.
- Furniture fidelity was checked separately at original resolution by comparing the complete supplied category sheet with the transparent 1536×1024 runtime atlas.

**Required fidelity surfaces**

- Fonts and typography: existing RoombaPac HUD, overlay typography, weights, and hierarchy are unchanged and remain legible at desktop and mobile sizes; the schematic contains no typography to reproduce.
- Spacing and layout rhythm: the board stays within the 16:9 frame, obstacle spacing consistently produces one-cell lanes, the cage remains centered, and portrait/mobile-landscape layouts no longer clip controls.
- Colors and visual tokens: existing warm floor themes remain intact; furniture preserves the supplied wood, green, red, blue, and kitchen families with sufficient pellet and actor contrast.
- Image quality and asset fidelity: nearest-neighbor Canvas rendering stays crisp, sprites use a real alpha atlas, category shapes are sourced from the supplied artwork, and no CSS/div/SVG stand-ins replace furniture.
- Copy and content: no app copy changed beyond documentation; scoring, lives, and level labels remain correct.
- Icons and interactions: existing Phosphor controls remain aligned and functional; keyboard pause, directional input, touch directions, and run start were exercised.
- Accessibility and responsiveness: semantic button labels remain present, portrait controls fit within the frame, touch targets are visible at mobile width, and no new motion is introduced.

**Comparison history**

1. P1 — The initial 390×844 capture clipped the idle card and primary actions outside the 16:9 frame.
   - Fix: added a compact portrait overlay treatment and exposed touch controls at mobile width.
   - Post-fix evidence: `docs/qa/mobile-portrait-idle.png` shows the complete card, both actions, and all four touch controls inside the play surface.
2. P1 — In the embedded browser, a suspended `AudioContext.resume()` could hold the start action before the engine began.
   - Fix: audio activation remains user-initiated but no longer blocks run creation or engine start.
   - Post-fix evidence: `docs/qa/desktop-running.png` and `docs/qa/mobile-landscape-running.png` show active scoring and gameplay after the start action.

**Findings**

- No actionable P0/P1/P2 differences remain.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Match landscape maze composition and central cage.
- [x] Represent furniture categories 1–9 with production sprites.
- [x] Preserve single-lane connectivity and real wrap tunnels.
- [x] Verify desktop keyboard/pause and mobile touch controls.
- [x] Check console errors at desktop and mobile viewports.
- [x] Resolve portrait clipping and embedded-audio start blocking.

**Follow-up Polish**

- P3: later art passes could add more theme-specific variants for every category without changing collision geometry.

final result: passed
