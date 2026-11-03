-- Krishna Muse Publisher — login + multi-device sync setup
-- Run ONCE in your EXISTING Supabase project (the same one as your CRM):
-- Supabase Dashboard → SQL Editor → New query → paste all → Run.
-- Safe to re-run.

create table if not exists public.publisher_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.publisher_state enable row level security;

-- Each logged-in user can only read/write their OWN publisher settings row.
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

-- Verify (should list the table):
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename = 'publisher_state';
