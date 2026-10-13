-- Private reports for booked viewing and trip enquiries.
create table public.viewing_reports (
 id uuid primary key default gen_random_uuid(),
 enquiry_id uuid not null unique references public.enquiries(id) on delete cascade,
 client_name text not null default '' check (char_length(client_name)<=120),
 property_label text not null default '' check (char_length(property_label)<=500),
 visit_date date,
 scope text not null default '' check (scope in ('','full','exterior','area')),
 coverage_notes text not null default '' check (char_length(coverage_notes)<=8000),
 property_notes text not null default '' check (char_length(property_notes)<=8000),
 access_notes text not null default '' check (char_length(access_notes)<=8000),
 area_notes text not null default '' check (char_length(area_notes)<=8000),
 questions text not null default '' check (char_length(questions)<=8000),
 summary text not null default '' check (char_length(summary)<=8000),
 video_url text not null default '' check (char_length(video_url)<=1500 and (video_url='' or video_url ~ '^https://[^[:space:]]+$')),
 status text not null default 'draft' check (status in ('draft','ready')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint viewing_report_ready_details check (status<>'ready' or (
  visit_date is not null and visit_date<=(now() at time zone 'Europe/Madrid')::date
  and char_length(btrim(property_label))>0 and scope<>''
  and char_length(btrim(coverage_notes))>0 and char_length(btrim(summary))>0))
);
create table public.viewing_report_photos (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.viewing_reports(id) on delete cascade,
 storage_path text not null unique,
 caption text not null default '' check (char_length(caption)<=250),
 sort_order integer not null check (sort_order between 0 and 19),
 created_at timestamptz not null default now(),
 unique(report_id,sort_order),
 constraint viewing_photo_path check (split_part(storage_path,'/',1)=report_id::text and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$')
);
alter table public.viewing_reports enable row level security;
alter table public.viewing_report_photos enable row level security;
revoke all on public.viewing_reports, public.viewing_report_photos from public,anon;
grant select,insert,update,delete on public.viewing_reports,public.viewing_report_photos to authenticated;
create policy viewing_reports_admin_read on public.viewing_reports for select to authenticated using ((select private.is_care_admin()));
create policy viewing_reports_booked_admin_insert on public.viewing_reports for insert to authenticated with check (
 (select private.is_care_admin()) and exists(select 1 from public.enquiry_followups f where f.enquiry_id=viewing_reports.enquiry_id and f.stage in ('booked','completed')));
create policy viewing_reports_admin_update on public.viewing_reports for update to authenticated using ((select private.is_care_admin())) with check ((select private.is_care_admin()));
create policy viewing_reports_admin_delete on public.viewing_reports for delete to authenticated using ((select private.is_care_admin()));
create policy viewing_report_photos_admin_read on public.viewing_report_photos for select to authenticated using ((select private.is_care_admin()));
create policy viewing_report_photos_admin_insert on public.viewing_report_photos for insert to authenticated with check ((select private.is_care_admin()));
create policy viewing_report_photos_admin_update on public.viewing_report_photos for update to authenticated using ((select private.is_care_admin())) with check ((select private.is_care_admin()));
create policy viewing_report_photos_admin_delete on public.viewing_report_photos for delete to authenticated using ((select private.is_care_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('viewing-reports','viewing-reports',false,8388608,array['image/jpeg','image/png','image/webp']);
create policy viewing_report_files_admin_read on storage.objects for select to authenticated using (bucket_id='viewing-reports' and (select private.is_care_admin()));
create policy viewing_report_files_admin_insert on storage.objects for insert to authenticated with check (
 bucket_id='viewing-reports' and (select private.is_care_admin())
 and exists(select 1 from public.viewing_reports r where r.id::text=split_part(name,'/',1)));
create policy viewing_report_files_admin_delete on storage.objects for delete to authenticated using (bucket_id='viewing-reports' and (select private.is_care_admin()));
notify pgrst,'reload schema';
