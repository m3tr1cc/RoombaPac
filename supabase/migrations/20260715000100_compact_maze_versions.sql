alter table public.roombapac_run_sessions
  add column if not exists maze_version smallint not null default 1;

alter table public.roombapac_run_sessions
  drop constraint if exists roombapac_run_sessions_maze_version_check;

alter table public.roombapac_run_sessions
  add constraint roombapac_run_sessions_maze_version_check
  check (maze_version in (1, 2));
