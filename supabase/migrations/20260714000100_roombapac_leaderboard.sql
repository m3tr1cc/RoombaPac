create extension if not exists pgcrypto;

create table if not exists public.roombapac_players (
  id uuid primary key default gen_random_uuid(),
  player_hash text not null unique check (char_length(player_hash) = 64),
  nickname text not null check (nickname ~ '^[A-Za-z0-9 _-]{3,20}$'),
  best_score bigint not null default 0 check (best_score >= 0),
  best_level integer not null default 1 check (best_level >= 1),
  best_run_id uuid,
  best_achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roombapac_run_sessions (
  id uuid primary key,
  player_hash text not null check (char_length(player_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  seed bigint not null check (seed > 0),
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.roombapac_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.roombapac_run_sessions(id) on delete restrict,
  player_id uuid not null references public.roombapac_players(id) on delete cascade,
  nickname text not null check (nickname ~ '^[A-Za-z0-9 _-]{3,20}$'),
  score bigint not null check (score >= 0),
  level integer not null check (level >= 1),
  dots integer not null check (dots >= 0),
  items integer not null check (items >= 0),
  pets integer not null check (pets >= 0),
  duration_ms bigint not null check (duration_ms >= 0),
  created_at timestamptz not null default now(),
  constraint roombapac_score_math check (score = dots * 100 + items * 1000 + pets * 2000)
);

alter table public.roombapac_players add constraint roombapac_players_best_run_fk foreign key (best_run_id) references public.roombapac_runs(id) on delete set null;
create index if not exists roombapac_players_rank_idx on public.roombapac_players (best_score desc, best_level desc, best_achieved_at asc);
create index if not exists roombapac_sessions_ip_created_idx on public.roombapac_run_sessions (ip_hash, created_at desc);
create index if not exists roombapac_runs_player_created_idx on public.roombapac_runs (player_id, created_at desc);

alter table public.roombapac_players enable row level security;
alter table public.roombapac_run_sessions enable row level security;
alter table public.roombapac_runs enable row level security;
revoke all on public.roombapac_players, public.roombapac_run_sessions, public.roombapac_runs from public, anon, authenticated;
grant all on public.roombapac_players, public.roombapac_run_sessions, public.roombapac_runs to service_role;

create or replace function public.submit_roombapac_run(
  p_session_id uuid, p_player_hash text, p_nickname text, p_score bigint, p_level integer,
  p_dots integer, p_items integer, p_pets integer, p_duration_ms bigint
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player public.roombapac_players;
  v_run public.roombapac_runs;
  v_rank bigint;
begin
  update public.roombapac_run_sessions set completed_at = now()
    where id = p_session_id and player_hash = p_player_hash and completed_at is null and expires_at > now();
  if not found then raise exception 'invalid or completed session'; end if;

  insert into public.roombapac_players (player_hash, nickname)
  values (p_player_hash, p_nickname)
  on conflict (player_hash) do update set nickname = excluded.nickname, updated_at = now()
  returning * into v_player;

  insert into public.roombapac_runs (session_id, player_id, nickname, score, level, dots, items, pets, duration_ms)
  values (p_session_id, v_player.id, p_nickname, p_score, p_level, p_dots, p_items, p_pets, p_duration_ms)
  returning * into v_run;

  update public.roombapac_players set
    best_score = p_score, best_level = p_level, best_run_id = v_run.id,
    best_achieved_at = v_run.created_at, nickname = p_nickname, updated_at = now()
  where id = v_player.id and (p_score > best_score or (p_score = best_score and p_level > best_level));

  select count(*) + 1 into v_rank from public.roombapac_players p
    where p.best_score > greatest(v_player.best_score, p_score)
       or (p.best_score = greatest(v_player.best_score, p_score) and p.best_level > greatest(v_player.best_level, p_level));
  return jsonb_build_object('rank', v_rank, 'bestScore', greatest(v_player.best_score, p_score));
end;
$$;

revoke all on function public.submit_roombapac_run(uuid,text,text,bigint,integer,integer,integer,integer,bigint) from public, anon, authenticated;
grant execute on function public.submit_roombapac_run(uuid,text,text,bigint,integer,integer,integer,integer,bigint) to service_role;
