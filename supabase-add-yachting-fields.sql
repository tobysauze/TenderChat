-- Adds the yacht-crew-specific profile fields that make Tender a vertical
-- dating app for the yachting community (marina + season matching, availability,
-- prompts, verified crew). Run once in the Supabase SQL editor. Safe to re-run.

alter table public.profiles
  add column if not exists home_port    text,                       -- current marina / port
  add column if not exists season       text,                       -- current cruising season
  add column if not exists availability text,                       -- schedule status
  add column if not exists prompts      jsonb   not null default '[]'::jsonb,  -- [{prompt, answer}]
  add column if not exists verified     boolean not null default false;        -- verified crew badge

-- Optional: index the fields the deck filters on, for when the user base grows.
create index if not exists idx_profiles_home_port on public.profiles (home_port);
create index if not exists idx_profiles_season    on public.profiles (season);
