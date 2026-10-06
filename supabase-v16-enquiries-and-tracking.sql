-- Version 16: keep existing events and enquiry states while adding the buyer journey.
alter table public.website_events drop constraint website_events_event_name_check;
alter table public.website_events add constraint website_events_event_name_check check (event_name in ('page_view','property_view','property_enquiry_start','property_enquiry_submitted','buyer_request_submitted','renovation_compare'));
alter policy visitors_record_page_views on public.website_events with check (
  event_name in ('page_view','property_view','property_enquiry_start','property_enquiry_submitted','buyer_request_submitted','renovation_compare')
  and char_length(page_path) between 1 and 180
  and device_type in ('mobile','tablet','desktop')
);
alter table public.enquiries drop constraint enquiries_status_check;
alter table public.enquiries add constraint enquiries_status_check check (status in ('new','read','replied','contacted','closed','approved','rejected'));
