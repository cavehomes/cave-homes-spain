-- Cave Homes Spain enquiries inbox
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  subject text not null default '',
  message text not null default '',
  property_title text not null default '',
  source text not null default 'buyer' check (source in ('buyer','seller')),
  status text not null default 'new' check (status in ('new','read'))
);

alter table public.enquiries enable row level security;

drop policy if exists "Public can submit enquiries" on public.enquiries;
create policy "Public can submit enquiries"
on public.enquiries for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated owner can view enquiries" on public.enquiries;
create policy "Authenticated owner can view enquiries"
on public.enquiries for select
to authenticated
using (true);

drop policy if exists "Authenticated owner can update enquiries" on public.enquiries;
create policy "Authenticated owner can update enquiries"
on public.enquiries for update
to authenticated
using (true) with check (true);

drop policy if exists "Authenticated owner can delete enquiries" on public.enquiries;
create policy "Authenticated owner can delete enquiries"
on public.enquiries for delete
to authenticated
using (true);

create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
notify pgrst, 'reload schema';
