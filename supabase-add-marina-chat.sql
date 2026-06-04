-- Adds per-marina open chat rooms — the community-network feature that
-- repositions Tender from "dating app" to "yacht crew network with matching".
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.marina_messages (
  id         uuid primary key default gen_random_uuid(),
  marina     text not null,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null check (length(trim(content)) > 0 and length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_marina_messages_marina_created
  on public.marina_messages (marina, created_at desc);

alter table public.marina_messages enable row level security;

-- Any signed-in user can read marina chat (it's a public room per marina).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='marina_messages' and policyname='Marina messages are readable by authenticated users') then
    create policy "Marina messages are readable by authenticated users"
      on public.marina_messages for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='marina_messages' and policyname='Users can post their own marina messages') then
    create policy "Users can post their own marina messages"
      on public.marina_messages for insert
      with check (auth.uid() = sender_id);
  end if;
end $$;

-- Enable Realtime so the chat updates live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname='public' and tablename='marina_messages'
  ) then
    alter publication supabase_realtime add table public.marina_messages;
  end if;
end $$;
