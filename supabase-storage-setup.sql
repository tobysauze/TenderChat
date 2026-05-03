-- Run this in the Supabase SQL editor to set up the profile-photos bucket and access policies.
-- Safe to re-run; creates resources only when missing.

-- Create the bucket (public read, since profile photos need to load anywhere).
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = excluded.public;

-- Anyone can view photos.
drop policy if exists "Public can view profile photos" on storage.objects;
create policy "Public can view profile photos"
on storage.objects for select
using (bucket_id = 'profile-photos');

-- Authenticated users can upload only into a folder named with their own user id.
-- Path convention: {auth.uid()}/{filename}
drop policy if exists "Users can upload to own folder" on storage.objects;
create policy "Users can upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can update their own files.
drop policy if exists "Users can update own photos" on storage.objects;
create policy "Users can update own photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete their own files.
drop policy if exists "Users can delete own photos" on storage.objects;
create policy "Users can delete own photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
