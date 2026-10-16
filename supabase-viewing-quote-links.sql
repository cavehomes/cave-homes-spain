-- Private customer quote links. Public access goes through the token-checking Edge Function.
alter table public.enquiry_followups drop constraint enquiry_followups_stage_check;
alter table public.enquiry_followups add constraint enquiry_followups_stage_check
 check (stage in ('new','contacted','quote_sent','quote_accepted','booked','completed'));

create table public.viewing_quote_offers (
 enquiry_id uuid primary key references public.enquiry_followups(enquiry_id) on delete cascade,
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 snapshot jsonb not null check (jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<16000),
 quote_saved_at timestamptz not null,
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '14 days',
 revoked_at timestamptz,
 accepted_at timestamptz,
 accepted_name text check (accepted_name is null or char_length(accepted_name) between 1 and 120)
);
alter table public.viewing_quote_offers enable row level security;
revoke all on public.viewing_quote_offers from public,anon,authenticated;
grant select,insert,update on public.viewing_quote_offers to authenticated;
grant all on public.viewing_quote_offers to service_role;
create policy viewing_quote_admin_select on public.viewing_quote_offers for select to authenticated
 using ((select private.is_care_admin()));
create policy viewing_quote_admin_insert on public.viewing_quote_offers for insert to authenticated
 with check ((select private.is_care_admin()));
create policy viewing_quote_admin_update on public.viewing_quote_offers for update to authenticated
 using ((select private.is_care_admin())) with check ((select private.is_care_admin()));

create function public.issue_viewing_quote(p_enquiry_id uuid,p_token_hash text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare f public.enquiry_followups; o public.viewing_quote_offers; area text;
begin
 if not coalesce(private.is_care_admin(),false) then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid link'; end if;
 select * into f from public.enquiry_followups where enquiry_id=p_enquiry_id for update;
 if not found or f.updated_at is distinct from p_expected_updated_at then raise exception 'Quote changed; reopen it' using errcode='40001'; end if;
 if f.stage in ('quote_accepted','booked','completed') then raise exception 'Already accepted or booked; review the booking instead'; end if;
 if f.quote_saved_at is null or coalesce(btrim(f.quote_service),'')='' or coalesce(btrim(f.quote_scope),'')='' or f.quoted_price is null then raise exception 'Save a complete quote first'; end if;
 select * into o from public.viewing_quote_offers where enquiry_id=p_enquiry_id for update;
 if o.accepted_at is not null then raise exception 'This quote was already accepted'; end if;
 select property_title into area from public.enquiries where id=p_enquiry_id;
 insert into public.viewing_quote_offers(enquiry_id,token_hash,snapshot,quote_saved_at)
 values(p_enquiry_id,p_token_hash,jsonb_build_object('service',f.quote_service,'scope',f.quote_scope,'price',f.quoted_price,'dates',f.quote_dates,'access',f.quote_access,'location',coalesce(area,''),'currency','EUR','acceptance_terms','I agree to the service scope and total price shown. I understand that the visit is confirmed only after Cave Homes Spain confirms access and final arrangements.'),f.quote_saved_at)
 on conflict(enquiry_id) do update set token_hash=excluded.token_hash,snapshot=excluded.snapshot,quote_saved_at=excluded.quote_saved_at,issued_at=now(),expires_at=now()+interval '14 days',revoked_at=null,accepted_at=null,accepted_name=null
 returning * into o;
 update public.enquiry_followups set follow_up_date=coalesce(follow_up_date,(now() at time zone 'Europe/Madrid')::date+3),updated_at=clock_timestamp() where enquiry_id=p_enquiry_id;
 return jsonb_build_object('expires_at',o.expires_at,'issued_at',o.issued_at);
end $$;
revoke all on function public.issue_viewing_quote(uuid,text,timestamptz) from public,anon;
grant execute on function public.issue_viewing_quote(uuid,text,timestamptz) to authenticated;

-- Service-role-only RPCs: invoker security; never callable by website clients directly.
create function public.read_viewing_quote(p_token_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.viewing_quote_offers; f public.enquiry_followups;
begin
 select * into o from public.viewing_quote_offers where token_hash=p_token_hash;
 if not found or o.revoked_at is not null then return jsonb_build_object('error','unavailable'); end if;
 if o.accepted_at is not null then return jsonb_build_object('quote',o.snapshot,'status','accepted','accepted_at',o.accepted_at); end if;
 if o.expires_at<=now() then return jsonb_build_object('error','expired'); end if;
 select * into f from public.enquiry_followups where enquiry_id=o.enquiry_id;
 if f.stage in ('quote_accepted','booked','completed') or f.quote_saved_at is distinct from o.quote_saved_at or f.quoted_price is distinct from (o.snapshot->>'price')::numeric or (o.snapshot->>'service') is distinct from f.quote_service or (o.snapshot->>'scope') is distinct from f.quote_scope or (o.snapshot->>'dates') is distinct from f.quote_dates or (o.snapshot->>'access') is distinct from f.quote_access then return jsonb_build_object('error','changed'); end if;
 return jsonb_build_object('quote',o.snapshot,'status','open','expires_at',o.expires_at);
end $$;
revoke all on function public.read_viewing_quote(text) from public,anon,authenticated;
grant execute on function public.read_viewing_quote(text) to service_role;

create function public.accept_viewing_quote(p_token_hash text,p_name text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.viewing_quote_offers; f public.enquiry_followups; eid uuid; stamp timestamptz:=clock_timestamp();
begin
 if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then return jsonb_build_object('error','name'); end if;
 select enquiry_id into eid from public.viewing_quote_offers where token_hash=p_token_hash;
 if not found then return jsonb_build_object('error','unavailable'); end if;
 -- Same lock order as issuance; replacement/revocation cannot race an acceptance.
 select * into f from public.enquiry_followups where enquiry_id=eid for update;
 select * into o from public.viewing_quote_offers where enquiry_id=eid for update;
 if o.token_hash is distinct from p_token_hash or o.revoked_at is not null then return jsonb_build_object('error','unavailable'); end if;
 if o.accepted_at is not null then return jsonb_build_object('status','accepted','accepted_at',o.accepted_at); end if;
 if o.expires_at<=now() then return jsonb_build_object('error','expired'); end if;
 if f.stage in ('quote_accepted','booked','completed') or f.quote_saved_at is distinct from o.quote_saved_at or f.quoted_price is distinct from (o.snapshot->>'price')::numeric or (o.snapshot->>'service') is distinct from f.quote_service or (o.snapshot->>'scope') is distinct from f.quote_scope or (o.snapshot->>'dates') is distinct from f.quote_dates or (o.snapshot->>'access') is distinct from f.quote_access then return jsonb_build_object('error','changed'); end if;
 update public.viewing_quote_offers set accepted_at=stamp,accepted_name=btrim(p_name) where enquiry_id=eid;
 update public.enquiry_followups set stage='quote_accepted',follow_up_date=(stamp at time zone 'Europe/Madrid')::date,updated_at=stamp where enquiry_id=eid;
 return jsonb_build_object('status','accepted','accepted_at',stamp);
end $$;
revoke all on function public.accept_viewing_quote(text,text) from public,anon,authenticated;
grant execute on function public.accept_viewing_quote(text,text) to service_role;
notify pgrst,'reload schema';
