-- Set up the App Store review test account end-to-end.
--
-- PREREQUISITE: first sign up yachtapps@proton.me IN THE APP, using the password
-- you'll give Apple. (Just tap through sign-up — even if it says "confirm your
-- email", the auth user + a stub profile get created. This script does the rest.)
-- You must also have already run supabase-seed-test-users.sql.
--
-- This script:
--   1. Confirms the email so the account can sign in (no confirmation email needed).
--   2. Fills out the reviewer's profile and gives it a photo.
--   3. Matches the account with every seeded test profile and seeds a short chat,
--      so the reviewer can open a conversation and reach Block / Report.
-- Safe to re-run.

-- 1. Confirm the email.
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email = 'yachtapps@proton.me';

-- 2. Complete the reviewer's own profile + photo.
do $$
declare
  rid uuid;
  pid uuid;
begin
  select id into rid from auth.users where email = 'yachtapps@proton.me';
  if rid is null then
    raise exception 'Sign up yachtapps@proton.me in the app first, then re-run this.';
  end if;

  update public.profiles
     set name = 'Sam',
         role = 'Deckhand',
         age = 30,
         nationality = 'British',
         bio = 'Demo account for app review.',
         languages = array['English'],
         interests = array['Sailing','Diving','Travel'],
         last_seen = now()
   where user_id = rid
   returning id into pid;

  if pid is not null and not exists (select 1 from public.photos where profile_id = pid) then
    insert into public.photos (profile_id, url, "order")
    values (pid, 'https://i.pravatar.cc/600?u=yachtapps-review', 0);
  end if;
end $$;

-- 3. Match with the seeded crew + seed chats (so Block/Report are reachable).
do $$
declare
  target_email constant text := 'yachtapps@proton.me';

  target_user_id uuid;
  test_user record;
  match_id uuid;
  msg_count int;
  base_time timestamp with time zone;
  greetings text[] := array['Hey! 👋','Hi there!','Ahoy 👋','Hey, nice to match!','Hello!','Hey there 🙂'];
  closers   text[] := array['Catch up soon 🚢','Fair winds!','Speak soon ⚓','Hope the season is treating you well!','Have a good one!'];
  pings     text[] := array[
    'Where are you based at the moment?',
    'You doing private or charter?',
    'Med or Caribbean season this year?',
    'Any chance our paths cross in Antibes?',
    'What size boat are you on currently?'
  ];
begin
  select id into target_user_id from auth.users where email = target_email;
  if target_user_id is null then
    raise exception 'No user found for %. Sign it up in the app first.', target_email;
  end if;

  for test_user in
    select id, raw_user_meta_data->>'name' as name, raw_user_meta_data->>'role' as role
      from auth.users
     where email like '%@tender-test.local'
     order by random()
  loop
    if exists (
      select 1 from public.matches
       where (user1_id = test_user.id and user2_id = target_user_id)
          or (user1_id = target_user_id and user2_id = test_user.id)
    ) then
      continue;
    end if;

    insert into public.matches (user1_id, user2_id)
    values (test_user.id, target_user_id)
    returning id into match_id;

    msg_count := 1 + (random() * 3)::int;
    base_time := now() - (random() * interval '2 days');

    insert into public.messages (match_id, sender_id, content, created_at)
    values (match_id, test_user.id, greetings[1 + (random() * (array_length(greetings,1)-1))::int], base_time);

    if msg_count >= 2 then
      base_time := base_time + interval '6 minutes';
      insert into public.messages (match_id, sender_id, content, created_at)
      values (match_id, test_user.id, pings[1 + (random() * (array_length(pings,1)-1))::int], base_time);
    end if;

    if msg_count >= 3 then
      base_time := base_time + interval '17 minutes';
      insert into public.messages (match_id, sender_id, content, created_at)
      values (match_id, test_user.id, closers[1 + (random() * (array_length(closers,1)-1))::int], base_time);
    end if;
  end loop;

  raise notice 'Reviewer account % is confirmed, profiled and matched with the test crew.', target_email;
end $$;
