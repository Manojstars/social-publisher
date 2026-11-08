-- Krishna Muse Publisher — Google Vault (v8)
-- Run ONCE in the Publisher Supabase project (uvbwhnkvbzjdilqmivsy):
-- Dashboard → SQL Editor → New query → paste → Run.
-- Stores Google refresh tokens server-side. RLS is ON with NO public
-- policies, so the app/anon key can never read this table — only the
-- google-vault Edge Function (service role, server-side) can touch it.

create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  drive_refresh text,
  yt_refresh text,
  updated_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;
-- Intentionally no policies: deny-all for anon/authenticated roles.
