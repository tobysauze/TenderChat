-- Seed 20 fake yacht crew members for testing.
-- Run this in the Supabase SQL editor.
-- All test users have emails ending in @tender-test.local so you can clean them up later
-- with: delete from auth.users where email like '%@tender-test.local';
-- (Cascade deletes will wipe their profiles, photos, likes, matches, messages.)

-- Fix the new-user trigger first. It still inserts into experience/availability,
-- columns dropped by the dating refocus, so it errors on EVERY new auth user —
-- including real app signups. Redefine it to match the current profiles schema.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, role, age)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', ''),
    25
  );
  return new;
end;
$$ language plpgsql security definer;

-- Make this script safely re-runnable: remove any existing test accounts first.
-- Only touches @tender-test.local users (test data that can't log in) — never real users.
delete from auth.users where email like '%@tender-test.local';

do $$
declare
  crew jsonb := $crew$
  [
    {"email":"alex.morgan@tender-test.local","name":"Alex Morgan","role":"Captain","experience":"22 years","age":48,"nationality":"British","languages":["English","French"],"certifications":["MCA Master <3000GT","OOW Unlimited","GMDSS","STCW Advanced"],"interests":["Sailing","Diving","Photography"],"bio":"Career yacht master, 22 seasons in the Med and Caribbean. Calm under pressure, big on safety culture, love a good charter program.","availability":"Available from June, looking for permanent rotation","photos":["alex-morgan-1","alex-morgan-2"]},
    {"email":"sophie.laurent@tender-test.local","name":"Sophie Laurent","role":"Chief Stewardess","experience":"9 years","age":32,"nationality":"French","languages":["French","English","Italian"],"certifications":["STCW","ENG1","Silver Service","WSET Level 2","Floristry"],"interests":["Wine","Yoga","Interior design"],"bio":"Detail-obsessed chief stew. Built three interior teams from scratch on 50m+ vessels. Happy crew, happy guests.","availability":"Available immediately","photos":["sophie-laurent-1","sophie-laurent-2","sophie-laurent-3"]},
    {"email":"marco.bianchi@tender-test.local","name":"Marco Bianchi","role":"Chef","experience":"14 years","age":37,"nationality":"Italian","languages":["Italian","English","French"],"certifications":["Le Cordon Bleu","Ship''s Cook","Food Safety Level 3","HACCP"],"interests":["Italian regional cuisine","Foraging","Sailing"],"bio":"From a Liguria fishing village to chef on 70m+ private. I cook seasonal Mediterranean with a clean modern twist.","availability":"Available end of May","photos":["marco-bianchi-1","marco-bianchi-2"]},
    {"email":"liam.oconnor@tender-test.local","name":"Liam O''Connor","role":"Chief Engineer","experience":"15 years","age":39,"nationality":"Irish","languages":["English"],"certifications":["MCA Y2","AEC","MEOL(Y)","STCW Advanced"],"interests":["Triathlon","Engines","Whisky"],"bio":"Engine room is my happy place. Hybrid systems, stabs, planned maintenance — I run a tight, predictable program.","availability":"Available August","photos":["liam-oconnor-1"]},
    {"email":"chloe.dubois@tender-test.local","name":"Chloé Dubois","role":"2nd Stewardess","experience":"4 years","age":26,"nationality":"French","languages":["French","English","Spanish"],"certifications":["STCW","ENG1","Silver Service","Cocktail Mixology"],"interests":["Cocktails","Travel","Surfing"],"bio":"Service is theatre. I love a busy charter and a happy interior team.","availability":"Available immediately","photos":["chloe-dubois-1","chloe-dubois-2"]},
    {"email":"jack.thompson@tender-test.local","name":"Jack Thompson","role":"Bosun","experience":"7 years","age":29,"nationality":"Australian","languages":["English"],"certifications":["STCW","ENG1","RYA Yachtmaster Offshore","RYA Powerboat L2","PWC","Tender Operator"],"interests":["Surfing","Free diving","Watersports"],"bio":"Lead deckhand on M/Y Andiamo for 3 seasons, just stepped up to bosun. Toys, tenders, watch — give me a busy program.","availability":"Available July","photos":["jack-thompson-1","jack-thompson-2"]},
    {"email":"emma.wilson@tender-test.local","name":"Emma Wilson","role":"Chief Stewardess","experience":"11 years","age":34,"nationality":"British","languages":["English","Spanish"],"certifications":["STCW","ENG1","WSET Level 3","Sommelier","Yoga Instructor"],"interests":["Wine","Yoga","Hosting"],"bio":"Big on calm, beautifully run interiors. Sommelier-level wine knowledge. Done both private and busy charter.","availability":"Available from September","photos":["emma-wilson-1","emma-wilson-2","emma-wilson-3"]},
    {"email":"daniel.smit@tender-test.local","name":"Daniel Smit","role":"2nd Engineer","experience":"6 years","age":28,"nationality":"South African","languages":["English","Afrikaans"],"certifications":["MCA Y3","AEC","STCW Advanced"],"interests":["Climbing","Engines","Photography"],"bio":"Y3 working towards Y2. Love hands-on work and quietly running a clean engine room.","availability":"Available immediately","photos":["daniel-smit-1"]},
    {"email":"isabella.rossi@tender-test.local","name":"Isabella Rossi","role":"Sous Chef","experience":"5 years","age":27,"nationality":"Italian","languages":["Italian","English"],"certifications":["ALMA Italian Cuisine","Food Safety L2","HACCP","Pastry Diploma"],"interests":["Pastry","Cycling","Wine"],"bio":"Pastry-trained sous, strong on Italian and Mediterranean. Galley = home.","availability":"Available June","photos":["isabella-rossi-1","isabella-rossi-2"]},
    {"email":"oliver.bennett@tender-test.local","name":"Oliver Bennett","role":"First Officer","experience":"10 years","age":35,"nationality":"British","languages":["English","French"],"certifications":["MCA OOW <3000GT","NAEST(O)","GMDSS","STCW Advanced"],"interests":["Navigation","Surfing","Coffee"],"bio":"OOW with 10 years on 50–80m. Working on Master <3000GT next.","availability":"Available August","photos":["oliver-bennett-1"]},
    {"email":"maria.santos@tender-test.local","name":"Maria Santos","role":"Stewardess","experience":"3 years","age":25,"nationality":"Portuguese","languages":["Portuguese","English","Spanish"],"certifications":["STCW","ENG1","Silver Service","Beauty Therapy L2"],"interests":["Travel","Beauty","Languages"],"bio":"3rd-year stew looking to step up to 2nd. Strong on service and laundry.","availability":"Available immediately","photos":["maria-santos-1","maria-santos-2"]},
    {"email":"finn.larsen@tender-test.local","name":"Finn Larsen","role":"Deckhand","experience":"2 years","age":23,"nationality":"Danish","languages":["Danish","English"],"certifications":["STCW","ENG1","RYA Powerboat L2","PADI Open Water"],"interests":["Sailing","Diving","Skiing"],"bio":"Junior deckie with sailing background. Strong work ethic, learning fast.","availability":"Available immediately","photos":["finn-larsen-1"]},
    {"email":"camille.bernard@tender-test.local","name":"Camille Bernard","role":"3rd Stewardess","experience":"1 year","age":24,"nationality":"French","languages":["French","English"],"certifications":["STCW","ENG1","Bartending Level 2"],"interests":["Mixology","Hiking","Photography"],"bio":"Junior stew. Hospitality background on land, loving the yacht life so far.","availability":"Available immediately","photos":["camille-bernard-1","camille-bernard-2"]},
    {"email":"henrik.vos@tender-test.local","name":"Henrik Vos","role":"Captain","experience":"30 years","age":52,"nationality":"Dutch","languages":["Dutch","English","German"],"certifications":["MCA Master Unlimited","GMDSS","STCW Advanced","ISM"],"interests":["Sailing","Classic yachts","Cigars"],"bio":"Long-career captain on classic + modern motor yachts up to 90m. Owner-rep mindset.","availability":"Available October","photos":["henrik-vos-1"]},
    {"email":"ava.collins@tender-test.local","name":"Ava Collins","role":"Chef","experience":"12 years","age":36,"nationality":"American","languages":["English"],"certifications":["CIA Graduate","Food Safety L3","HACCP","Pastry Diploma"],"interests":["Sourcing","Surfing","Coffee"],"bio":"CIA-trained, 8 yacht seasons. Modern American + clean Mediterranean. Love a charter program.","availability":"Available May","photos":["ava-collins-1","ava-collins-2"]},
    {"email":"raul.fernandez@tender-test.local","name":"Raúl Fernández","role":"3rd Engineer","experience":"3 years","age":26,"nationality":"Spanish","languages":["Spanish","English"],"certifications":["MCA Y4","MEC","STCW"],"interests":["Football","Engines","Cooking"],"bio":"Y4 looking to settle on a 50–70m program for the season.","availability":"Available June","photos":["raul-fernandez-1"]},
    {"email":"natalia.popescu@tender-test.local","name":"Natalia Popescu","role":"2nd Stewardess","experience":"5 years","age":28,"nationality":"Romanian","languages":["Romanian","English","French"],"certifications":["STCW","ENG1","Silver Service","Floristry","Massage Therapy"],"interests":["Flowers","Wellness","Travel"],"bio":"Quietly competent 2nd stew. Strong on service, laundry, floral.","availability":"Available July","photos":["natalia-popescu-1","natalia-popescu-2"]},
    {"email":"connor.murphy@tender-test.local","name":"Connor Murphy","role":"Deckhand","experience":"3 years","age":24,"nationality":"Irish","languages":["English"],"certifications":["STCW","ENG1","RYA Yachtmaster Coastal","RYA Powerboat L2","Tender Driver"],"interests":["Sailing","Diving","Football"],"bio":"3rd-year deckie comfortable with watch and tender ops. Working towards bosun.","availability":"Available immediately","photos":["connor-murphy-1"]},
    {"email":"juliette.moreau@tender-test.local","name":"Juliette Moreau","role":"Chief Stewardess","experience":"8 years","age":31,"nationality":"French","languages":["French","English","Italian","Spanish"],"certifications":["STCW","ENG1","WSET L2","Silver Service","Yoga","Hostess Course"],"interests":["Wellness","Wine","Languages"],"bio":"Multilingual chief stew, charter-strong, calm leader.","availability":"Available June","photos":["juliette-moreau-1","juliette-moreau-2"]},
    {"email":"theo.van.der.berg@tender-test.local","name":"Theo van der Berg","role":"Chief Engineer","experience":"20 years","age":45,"nationality":"South African","languages":["English","Afrikaans"],"certifications":["MCA Y1","AEC","ETO","MEOL(Y)","STCW Advanced"],"interests":["Engines","Cycling","Whisky"],"bio":"Y1 chief on 60–90m programs. Methodical, planned-maintenance obsessive, calm in a casualty.","availability":"Available September","photos":["theo-van-der-berg-1"]}
  ]
  $crew$::jsonb;

  member jsonb;
  new_user_id uuid;
  new_profile_id uuid;
  photo_seed text;
  photo_index int;
begin
  for member in select * from jsonb_array_elements(crew) loop
    new_user_id := gen_random_uuid();

    -- Create the auth user. Trigger handle_new_user() will auto-insert a stub profile row.
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated', 'authenticated',
      member->>'email',
      null, -- no password; these accounts can't sign in
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', member->>'name', 'role', member->>'role'),
      now(), now(),
      '', '', '', ''
    );

    -- Fill out the profile that the trigger created.
    update public.profiles
       set name = member->>'name',
           role = member->>'role',
           age = (member->>'age')::int,
           nationality = member->>'nationality',
           languages = array(select jsonb_array_elements_text(member->'languages')),
           interests = array(select jsonb_array_elements_text(member->'interests')),
           bio = member->>'bio',
           last_seen = now() - (random() * interval '3 days')
     where user_id = new_user_id
     returning id into new_profile_id;

    -- Photos via pravatar (deterministic random face per seed).
    photo_index := 0;
    for photo_seed in select jsonb_array_elements_text(member->'photos') loop
      insert into public.photos (profile_id, url, "order")
      values (
        new_profile_id,
        'https://i.pravatar.cc/600?u=' || photo_seed,
        photo_index
      );
      photo_index := photo_index + 1;
    end loop;
  end loop;
end $$;

-- How to clean up later:
--   delete from auth.users where email like '%@tender-test.local';
