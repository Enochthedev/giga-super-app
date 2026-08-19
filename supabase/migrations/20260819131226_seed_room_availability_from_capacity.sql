-- H2: room_availability had no rows, so the H1 inventory trigger had nothing to enforce and the
-- booking handler's availability check was skipped. Seed a 365-day window from each room_type's
-- total_rooms (only where absent), then subtract nights already consumed by active bookings so
-- seeded availability isn't overstated. Applied 2026-08-19 via MCP: 2562 rows across 7 room types
-- through +365d, min available 5 (no over-decrement).
--
-- OPERATIONAL FOLLOW-UP: a scheduled job should extend this window nightly (insert the next day
-- from total_rooms on conflict do nothing); this backfill only covers ~1 year from the run date.
insert into public.room_availability (room_type_id, date, available_rooms, base_price)
select rt.id, d::date, rt.total_rooms, rt.base_price
from public.room_types rt
cross join generate_series(current_date, current_date + interval '365 days', interval '1 day') as d
where coalesce(rt.total_rooms, 0) > 0
on conflict (room_type_id, date) do nothing;

update public.room_availability ra
set available_rooms = greatest(0, ra.available_rooms - b.rooms),
    updated_at = now()
from (
  select hb.room_type_id, gs::date as date, sum(coalesce(hb.number_of_rooms, 1)) as rooms
  from public.hotel_bookings hb
  cross join generate_series(hb.check_in_date, hb.check_out_date - interval '1 day', interval '1 day') as gs
  where hb.booking_status in ('pending', 'confirmed', 'checked_in')
    and hb.check_out_date >= current_date
  group by hb.room_type_id, gs::date
) b
where ra.room_type_id = b.room_type_id and ra.date = b.date;
