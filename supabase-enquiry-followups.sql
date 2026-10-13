-- Private booking progress for viewing and trip enquiries.
-- Reuses the existing active-admin permission used by Property Care.
create table public.enquiry_followups (
  enquiry_id uuid primary key references public.enquiries(id) on delete cascade,
  stage text not null default 'new' check (stage in ('new','contacted','quote_sent','booked','completed')),
  quoted_price numeric(10,2) check (quoted_price is null or quoted_price >= 0),
  follow_up_date date,
  notes text not null default '' check (char_length(notes) <= 5000),
  updated_at timestamptz not null default now()
);
alter table public.enquiry_followups enable row level security;
revoke all on public.enquiry_followups from public, anon;
grant select, insert, update, delete on public.enquiry_followups to authenticated;
create policy enquiry_followups_admin_select on public.enquiry_followups
for select to authenticated using ((select private.is_care_admin()));
create policy enquiry_followups_admin_insert on public.enquiry_followups
for insert to authenticated with check ((select private.is_care_admin()));
create policy enquiry_followups_admin_update on public.enquiry_followups
for update to authenticated using ((select private.is_care_admin())) with check ((select private.is_care_admin()));
create policy enquiry_followups_admin_delete on public.enquiry_followups
for delete to authenticated using ((select private.is_care_admin()));
create index enquiry_followups_due_idx on public.enquiry_followups(follow_up_date) where stage <> 'completed';
notify pgrst, 'reload schema';
