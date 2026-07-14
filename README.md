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

## Art and audio

The committed sprite atlas was created from the supplied visual references as a cohesive, logo-free pixel-art production asset. Runtime blue tinting creates frightened pet states. All music and effects are synthesized in the browser and do not copy Pac-Man media.
