-- Booking confirmations inherit existing admin-only follow-up access.
alter table public.enquiry_followups
 add column booking_details jsonb not null default '{}'::jsonb
   check (jsonb_typeof(booking_details) = 'object' and octet_length(booking_details::text) <= 16000),
 add column booking_saved_at timestamptz,
 add column booking_confirmed_at timestamptz,
 add constraint enquiry_booking_confirmation_saved
   check (booking_confirmed_at is null or booking_saved_at is not null);
notify pgrst, 'reload schema';
