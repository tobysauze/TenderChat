-- Top every @tender-test.local profile up to 6 photos.
-- Existing photos (the pravatar face shots from supabase-seed-test-users.sql)
-- are preserved; we only add new ones at the next free order index.
-- Extras use picsum.photos with a per-profile seed so each profile gets
-- consistent but varied "lifestyle" imagery (yacht-y enough as filler).
--
-- Idempotent: re-running won't duplicate. Only adds until each profile
-- has TARGET_PHOTO_COUNT photos.
--
-- Run in the Supabase SQL editor.

do $$
declare
  target_photo_count constant int := 6;

  rec record;
  current_count int;
  next_order int;
begin
  for rec in
    select au.id as user_id,
           p.id as profile_id,
           regexp_replace(au.email, '@tender-test\.local$', '') as slug
    from auth.users au
    join public.profiles p on p.user_id = au.id
    where au.email like '%@tender-test.local'
  loop
    select count(*) into current_count
      from public.photos
     where profile_id = rec.profile_id;

    next_order := current_count;

    while next_order < target_photo_count loop
      insert into public.photos (profile_id, url, "order")
      values (
        rec.profile_id,
        'https://picsum.photos/seed/' || rec.slug || '-extra-' || next_order || '/600/800',
        next_order
      );
      next_order := next_order + 1;
    end loop;
  end loop;

  raise notice 'Topped up test profiles to % photos each.', target_photo_count;
end $$;
