-- Auto-match every @tender-test.local user with the target real user, and
-- seed a short simulated chat history per match so the UI feels alive.
--
-- USAGE
-- 1. Replace TARGET_EMAIL below with the email you signed up to Tender with.
-- 2. Make sure you've already run supabase-seed-test-users.sql so the test
--    users exist.
-- 3. Run this script in the SQL editor.
--
-- Re-running is safe — it skips test users that already have a match with you
-- and never duplicates messages (it only inserts messages on a fresh match).
--
-- To remove just these matches/messages without deleting the test users:
--   delete from public.matches m
--    using auth.users a, auth.users b
--    where (m.user1_id = a.id and m.user2_id = b.id and a.email like '%@tender-test.local' and b.email = 'TARGET_EMAIL')
--       or (m.user2_id = a.id and m.user1_id = b.id and a.email like '%@tender-test.local' and b.email = 'TARGET_EMAIL');

do $$
declare
  target_email constant text := 'TARGET_EMAIL';  -- <-- change this

  target_user_id uuid;
  test_user record;
  match_id uuid;
  msg_count int;
  base_time timestamp with time zone;
  greetings text[] := array['Hey! 👋','Hi there!','Ahoy 👋','Hey, nice to match!','Hello!','Hey there 🙂'];
  closers   text[] := array['Catch up soon 🚢','Fair winds!','Speak soon ⚓','Anyway, hope the season is treating you well!','Have a good one!'];
  pings     text[] := array[
    'Where are you based at the moment?',
    'You doing private or charter?',
    'Permanent or rotation?',
    'Mediterranean or Caribbean season this year?',
    'Any chance our paths cross in Antibes?',
    'What size boat are you on currently?',
    'Long season ahead?'
  ];
  follows   text[] := array[
    'Would be great to grab a coffee if our schedules line up ☕',
    'Drop me a line if you''re ever looking — I''m a strong team player.',
    'Happy to share my CV if you''re recruiting.',
    'Always good to know more crew. Let''s stay in touch!',
    'Let me know if anything opens up on your boat.'
  ];
  role_intro text;
begin
  select id into target_user_id from auth.users where email = target_email;
  if target_user_id is null then
    raise exception 'No user found for email %. Update target_email at the top of the script.', target_email;
  end if;

  for test_user in
    select id, raw_user_meta_data->>'name' as name, raw_user_meta_data->>'role' as role
    from auth.users
    where email like '%@tender-test.local'
    order by random()
  loop
    -- Skip if already paired
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

    -- Each match gets between 1 and 5 messages, spread over the last 3 days.
    msg_count := 1 + (random() * 4)::int;
    base_time := now() - (random() * interval '3 days');

    insert into public.messages (match_id, sender_id, content, created_at)
    values (match_id, test_user.id, greetings[1 + (random() * (array_length(greetings,1)-1))::int], base_time);

    if msg_count >= 2 then
      base_time := base_time + interval '4 minutes';
      role_intro := case test_user.role
        when 'Captain' then 'Building a crew for the Med season. What boats have you been on?'
        when 'First Officer' then 'OOW here working towards Master. Done many sea miles lately?'
        when 'Chief Engineer' then 'Y2 chief on a 60m. What''s your engine room background?'
        when '2nd Engineer' then 'Y3 looking to step up. How''s your current program?'
        when '3rd Engineer' then 'Y4 working on my watchkeeper hours. You currently rotating?'
        when 'Chief Stewardess' then 'Running a 14-strong interior right now. How''s your season?'
        when '2nd Stewardess' then 'Hey, what''s your interior team like?'
        when '3rd Stewardess' then 'Junior stew here. What boats have you been on?'
        when 'Stewardess' then 'What''s your charter program like?'
        when 'Chef' then 'Galley boss here. What''s your kitchen setup?'
        when 'Sous Chef' then 'Sous looking for a strong chef to learn from. What''s your style?'
        when 'Bosun' then 'Bosun here. What size deck team are you running?'
        when 'Deckhand' then 'Junior deckie. You been on many big boats?'
        else 'How''s the season treating you?'
      end;
      insert into public.messages (match_id, sender_id, content, created_at)
      values (match_id, test_user.id, role_intro, base_time);
    end if;

    if msg_count >= 3 then
      base_time := base_time + interval '11 minutes';
      insert into public.messages (match_id, sender_id, content, created_at)
      values (match_id, test_user.id, pings[1 + (random() * (array_length(pings,1)-1))::int], base_time);
    end if;

    if msg_count >= 4 then
      base_time := base_time + interval '23 minutes';
      insert into public.messages (match_id, sender_id, content, created_at)
      values (match_id, test_user.id, follows[1 + (random() * (array_length(follows,1)-1))::int], base_time);
    end if;

    if msg_count >= 5 then
      base_time := base_time + interval '38 minutes';
      insert into public.messages (match_id, sender_id, content, created_at)
      values (match_id, test_user.id, closers[1 + (random() * (array_length(closers,1)-1))::int], base_time);
    end if;
  end loop;

  raise notice 'Paired test users with %', target_email;
end $$;
