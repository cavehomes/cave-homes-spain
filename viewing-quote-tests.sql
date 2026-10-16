-- Runs as project database owner; all fixtures and queued notifications roll back.
begin;
insert into public.enquiries(id,name,email,subject,message,property_title,status,source)
values('e3a076e0-11cd-4a0b-b804-4b88c4a265c1','CHS workflow test','workflow-test@example.invalid','Property Viewing & Local Support — test','Temporary rollback test','Test area','replied','buyer');
insert into public.enquiry_followups(enquiry_id,quote_service,quote_scope,quoted_price,quote_dates,quote_access,quote_saved_at)
values('e3a076e0-11cd-4a0b-b804-4b88c4a265c1','Test video tour','Exterior and area only',95,'To be agreed','Public places only',now());
do $$ begin perform set_config('request.jwt.claim.sub',(select user_id::text from public.care_staff where role='admin' and active limit 1),true); end $$;
set local role authenticated;
select public.issue_viewing_quote('e3a076e0-11cd-4a0b-b804-4b88c4a265c1',repeat('a',64),(select updated_at from public.enquiry_followups where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1'));
set local role service_role;
do $$
declare r jsonb; first_time text;
begin
 r:=public.read_viewing_quote(repeat('a',64));
 assert r->>'status'='open','Saved quote must be readable';
 assert r->'quote'->>'price'='95.00','Quote price comes from saved data';
 assert not (r->'quote' ? 'notes'),'Private notes must never be public';
 update public.enquiry_followups set quote_scope='Changed' where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1';
 assert public.read_viewing_quote(repeat('a',64))->>'error'='changed','Changed scope invalidates link';
 assert public.accept_viewing_quote(repeat('a',64),'Test')->>'error'='changed','Cannot accept old terms';
 update public.enquiry_followups set quote_scope='Exterior and area only' where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1';
 update public.viewing_quote_offers set expires_at=now()-interval '1 day' where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1';
 assert public.accept_viewing_quote(repeat('a',64),'Test')->>'error'='expired','Cannot accept expired quote';
 update public.viewing_quote_offers set expires_at=now()+interval '1 day',revoked_at=now() where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1';
 assert public.read_viewing_quote(repeat('a',64))->>'error'='unavailable','Revoked link hidden';
 update public.viewing_quote_offers set revoked_at=null where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1';
 assert public.accept_viewing_quote(repeat('a',64),'')->>'error'='name','Name required';
 r:=public.accept_viewing_quote(repeat('a',64),'Workflow Test'); first_time:=r->>'accepted_at';
 assert r->>'status'='accepted','Acceptance succeeds';
 assert (select stage='quote_accepted' from public.enquiry_followups where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1'),'Tracker updates atomically';
 r:=public.accept_viewing_quote(repeat('a',64),'Different Retry Name');
 assert r->>'accepted_at'=first_time,'Retries keep original acceptance';
 assert (select accepted_name='Workflow Test' from public.viewing_quote_offers where enquiry_id='e3a076e0-11cd-4a0b-b804-4b88c4a265c1'),'Retries preserve original name';
 assert public.read_viewing_quote(repeat('b',64))->>'error'='unavailable','Unknown token cannot read another quote';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.read_viewing_quote(text)','EXECUTE'),'Anonymous direct RPC blocked';
 assert not has_function_privilege('authenticated','public.accept_viewing_quote(text,text)','EXECUTE'),'Signed-in direct acceptance blocked';
 assert (select relrowsecurity from pg_class where oid='public.viewing_quote_offers'::regclass),'RLS required';
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
end $$;
set local role authenticated;
do $$ begin
 assert (select count(*)=0 from public.viewing_quote_offers),'Non-admin cannot read quote offers';
 begin
  perform public.issue_viewing_quote('e3a076e0-11cd-4a0b-b804-4b88c4a265c1',repeat('c',64),now());
  raise exception 'Non-admin issuance was not rejected';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'PASS: saved quote, price integrity, stale terms, expiry, withdrawal, acceptance, idempotency, tracker, token isolation, admin-only issuance and RLS' as verification;
rollback;
