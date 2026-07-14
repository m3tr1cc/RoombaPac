# AGENTS.md

## Project identity

RoombaPac is a production, customer-facing Codefair game: an endless pixel-art maze chase in which a robot vacuum clears procedurally generated rooms while avoiding animated pets. Treat this repository as real application code, not a disposable prototype, visual mock, or marketing page.

## Core stack

Use this stack unless a task explicitly changes it:

- Vite
- React
- TypeScript
- Canvas 2D
- Web Audio API
- Plain CSS
- Vitest and Testing Library
- Vercel static deployment plus Vercel Functions
- Supabase Postgres, SQL migrations, and RLS

Do not migrate to Next.js, add a game engine, introduce a heavy UI framework, replace Web Audio with copyrighted samples, or expose Supabase service credentials to the browser. Use Phosphor Icons for standard controls and keep dependencies focused.

## Product invariants

This is a real playable game. Never ship fake controls, placeholder game states, decorative buttons that do nothing, impossible procedural maps, copied Pac-Man media, or leaderboard UI that does not persist real scores.

- The app fills a landscape Codefair frame and preserves a 16:9 play surface.
- WASD, arrow keys, space-to-pause, and coarse-pointer touch controls remain functional.
- Levels are deterministic from their seed, connected, completable, and rotate coherent room themes.
- Scoring remains 100 per dot, 1,000 per item, and 2,000 per frightened pet unless the task explicitly changes the rules.
- A run has three lives, carries score across levels, and ends after the third normal pet collision.
- The leaderboard stores one best endless run per browser player identity and never accepts direct browser database writes.
- Reset affects only the current run. It never deletes global leaderboard history.
- Audio must be original, synthesized, user-initiated, mutable, and safely suspended on pause.

## Supabase migrations

For every task, explicitly check whether the change requires a schema, RLS, seed, function, trigger, index, or policy migration.

If a migration is needed:

- create a real migration under `supabase/migrations`
- link to the dedicated RoombaPac Supabase project
- run database linting when available
- push the migration before finishing
- verify application code against the deployed schema, functions, and RLS
- report migration status in the final handoff

Do not leave required database work as TODOs, manual dashboard edits, or unapplied migration files. Tables remain RLS-enabled with no browser write policies; only server-side service-role code may mutate scores.

## Required checks

Before finishing every task, run:

```bash
npm run lint
npm run check
npm run test
npm run build
```

For user-facing changes, also verify affected behavior in a real browser at desktop and mobile sizes, inspect the console, test keyboard and touch paths, and respect `prefers-reduced-motion`.

## Pull request handoff

After bootstrap, every task must end in a pull request. Commit only intended files, push the task branch, open or update a PR, confirm required checks, and verify the Vercel preview. A task is not complete until the PR exists and its preview has been checked.
