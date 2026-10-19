-- One optional video per listing. Existing property access policies are unchanged.
alter table public.properties add column if not exists video_url text
  check (video_url is null or (length(video_url) <= 2048 and video_url ~ '^https://'));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('property-videos','property-videos',true,52428800,array['video/mp4','video/webm'])
on conflict (id) do nothing;
create policy property_videos_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='property-videos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.is_care_admin()));
create policy property_videos_admin_select on storage.objects for select to authenticated
using (bucket_id='property-videos' and (select private.is_care_admin()));
create policy property_videos_admin_delete on storage.objects for delete to authenticated
using (bucket_id='property-videos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.is_care_admin()));
notify pgrst, 'reload schema';
