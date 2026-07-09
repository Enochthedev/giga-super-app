-- QA e2e audit fixes — add missing hotel_bookings columns
-- (see docs/QA_E2E_ERRORS_2026-07-07.md)
--
-- E3  : booking cancel handler writes refund_amount -> was 400 "Could not find the
--       'refund_amount' column of 'hotel_bookings'"
-- E23 : review submission marks the booking has_review = true
-- E24 : host booking-status update writes host_notes

alter table public.hotel_bookings
  add column if not exists refund_amount numeric(12, 2),
  add column if not exists has_review boolean not null default false,
  add column if not exists host_notes text;

comment on column public.hotel_bookings.refund_amount is 'Refund amount computed at cancellation (QA fix E3)';
comment on column public.hotel_bookings.has_review is 'True once the guest has submitted a review (QA fix E23)';
comment on column public.hotel_bookings.host_notes is 'Free-form host notes on the booking (QA fix E24)';
