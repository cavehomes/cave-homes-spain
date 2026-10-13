-- Saved service quote details inherit the existing admin-only follow-up policies.
alter table public.enquiry_followups
 add column quote_service text not null default '' check (char_length(quote_service) <= 250),
 add column quote_scope text not null default '' check (char_length(quote_scope) <= 5000),
 add column quote_dates text not null default '' check (char_length(quote_dates) <= 250),
 add column quote_access text not null default '' check (char_length(quote_access) <= 2500),
 add column quote_saved_at timestamptz;
notify pgrst, 'reload schema';
