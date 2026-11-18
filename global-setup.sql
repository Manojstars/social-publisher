-- Krishna Muse Publisher — GLOBAL EDITION setup (v11)
-- Run ONCE in the platform's Supabase project (Publisher project):
-- Dashboard → SQL Editor → New query → paste all → Run.
-- Safe to re-run (idempotent).
--
-- IMPORTANT — also do this in the Dashboard (SQL cannot change it):
--   Authentication → Providers → Email → make sure sign-ups are allowed,
--   and Authentication → Settings → "Allow new users to sign up" = ON.
--   Public signup is how every new user gets an account; each account's
--   data is isolated by the row-level rules below + the vault table,
--   which has NO policies at all (service_role only, via the Edge Function).

-- ---------------------------------------------------------------------------
-- 1. Per-user app state (settings / queue / history) — own row only.
-- ---------------------------------------------------------------------------
create table if not exists public.publisher_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.publisher_state enable row level security;

drop policy if exists "publisher select own" on public.publisher_state;
create policy "publisher select own" on public.publisher_state
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "publisher insert own" on public.publisher_state;
create policy "publisher insert own" on public.publisher_state
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "publisher update own" on public.publisher_state;
create policy "publisher update own" on public.publisher_state
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "publisher delete own" on public.publisher_state;
create policy "publisher delete own" on public.publisher_state
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Legacy Google refresh tokens (v1 vault) — kept as-is for the owner's
--    backward-compatible fallback. RLS on, NO policies: service_role only.
-- ---------------------------------------------------------------------------
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  drive_refresh text,
  yt_refresh text,
  updated_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;
-- Intentionally no policies: deny-all for anon/authenticated roles.

-- ---------------------------------------------------------------------------
-- 3. NEW (v11): per-user credentials vault.
--    One row per (user, provider). Holds that user's OWN client IDs,
--    client secrets, access/refresh tokens and extras (page IDs, token
--    secrets, expiry) for: google_drive, google_youtube, meta, x, tiktok,
--    linkedin. RLS is ON with NO policies — the anon/authenticated keys can
--    never read or write this table. Only the google-vault Edge Function,
--    using the service_role key server-side after verifying the caller's
--    JWT, can touch it. Secrets are never returned to the browser (single
--    exception: the owner's own Meta access_token at publish time).
-- ---------------------------------------------------------------------------
create table if not exists public.user_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in
    ('google_drive','google_youtube','meta','x','tiktok','linkedin')),
  client_id text,
  client_secret text,
  access_token text,
  refresh_token text,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.user_credentials enable row level security;
-- Intentionally no policies: deny-all for anon/authenticated roles.
-- (service_role bypasses RLS, which is exactly how the Edge Function works.)

-- ---------------------------------------------------------------------------
-- Verify (should list all three tables, rowsecurity = true):
-- ---------------------------------------------------------------------------
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('publisher_state','google_tokens','user_credentials')
order by tablename;
