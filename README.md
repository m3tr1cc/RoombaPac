# RoombaPac

RoombaPac is an endless, landscape arcade game built for the Codefair frame. Drive a determined robot vacuum through procedurally generated rooms, collect every crumb and lost household item, turn five animated pets blue, and chase a global high score.

## Controls

- Move: WASD, arrow keys, or the on-screen touch pad
- Pause/resume: Space or the pause button
- Reset: Reset button followed by confirmation
- Sound: Speaker button

Each run has three lives. Dots score 100, household items score 1,000, and frightened pets score 2,000. Speed increases with every cleared room.

## Local development

```bash
npm install
npm run dev
```

`npm run dev` runs the Vite frontend. Use `npm run dev:full` after linking the Vercel project to run the frontend and leaderboard Functions together.

Copy `.env.example` to `.env.local` for full-stack local development:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAYER_TOKEN_PEPPER`

Never expose these values through `VITE_` variables or commit them.

## Quality checks

```bash
npm run lint
npm run check
npm run test
npm run build
```

## Architecture

The React shell owns overlays, controls, score submission, and accessibility. A fixed-step Canvas 2D engine owns deterministic maze generation, actors, collision, scoring, animation, and level progression. Web Audio synthesizes the original music and effects.

Vercel Functions issue short-lived ranked-run seeds, validate completed run totals, and access an isolated Supabase database with a service role. RLS blocks all direct browser writes. Each browser has an opaque local player identity and one best leaderboard entry; the nickname can be changed after a run.

## Deployment

Vercel is connected directly to `m3tr1cc/RoombaPac`. Pull requests receive preview deployments, and merges to `main` deploy to production. The production URL can be submitted to Codefair as a sandboxed landscape project.

## Maze generation

Level one uses the supplied annotated landscape plan as a fixed, compact 27×15 furniture-obstacle blueprint. Later rooms use the same dimensions and are deterministic from the ranked run seed and level: an obstacle-first generator places an exact quota of large rectangles, I pieces, T junctions, hybrids, corners, and blocks, then adds a bounded set of mirrored multi-cell helpers to eliminate every open 2×2 floor area outside the pet cage. Helper locations, orientations, and furniture sprites vary deterministically without adding one-cell chairs. Every 150-crumb floor stays symmetric, connected, single-lane, and free of normal-path dead ends. Versioned run sessions keep older 31×17 runs valid while they remain active.

The procedural design is an independent TypeScript implementation inspired by the maze-design principles documented in [Alex313031/web-pacman](https://github.com/Alex313031/web-pacman). No source from its GPL-3.0 `mapgen.js` implementation is included in RoombaPac.

## Art and audio

The committed sprite atlases were created from the supplied visual references as cohesive, logo-free pixel-art production assets. Furniture uses authored down, left, up, and right frames on a consistent 96-pixel-per-cell grid; Canvas selects the correct frame and scales it uniformly instead of rotating or stretching a single view. A footprint-aware catalog deterministically fits chairs, sofas, tables, cabinets, appliances, shelving, corners, junctions, alcoves, and larger room pieces to the maze's exact collision cells without hallway spill. Transparent sprite space reveals the current world floor tile. Runtime blue tinting creates frightened pet states. All music and effects are synthesized in the browser and do not copy Pac-Man media.
