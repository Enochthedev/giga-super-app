-- H1: bookings never decremented room_availability, so the same room could be booked without
-- limit and concurrent bookings both passed the app's advisory check. Enforce inventory in the DB
-- where it is race-safe: decrement available_rooms per night when an active booking is created,
-- block the insert if a tracked night would go negative, and release the rooms on cancellation.
-- Nights with no room_availability row cannot be enforced (H2 — needs capacity seeding) and are
-- skipped. Verified live: booking 1 room of 2 -> 1 remaining; overbooking 2 more -> blocked;
-- cancel -> restored to 2. Applied 2026-08-19 via MCP.
create or replace function public.adjust_room_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
begin
  if TG_OP = 'INSERT' then
    if NEW.booking_status in ('pending', 'confirmed', 'checked_in') then
      d := NEW.check_in_date;
      while d < NEW.check_out_date loop
        update room_availability
          set available_rooms = available_rooms - coalesce(NEW.number_of_rooms, 1),
              updated_at = now()
          where room_type_id = NEW.room_type_id and date = d;
        if exists (
          select 1 from room_availability
          where room_type_id = NEW.room_type_id and date = d and available_rooms < 0
        ) then
          raise exception 'Insufficient room availability for % on %', NEW.room_type_id, d
            using errcode = 'check_violation';
        end if;
        d := d + 1;
      end loop;
    end if;
  elsif TG_OP = 'UPDATE' then
    if OLD.booking_status in ('pending', 'confirmed', 'checked_in')
       and NEW.booking_status in ('cancelled', 'no_show') then
      d := OLD.check_in_date;
      while d < OLD.check_out_date loop
        update room_availability
          set available_rooms = available_rooms + coalesce(OLD.number_of_rooms, 1),
              updated_at = now()
          where room_type_id = OLD.room_type_id and date = d;
        d := d + 1;
      end loop;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trigger_adjust_room_availability on public.hotel_bookings;
create trigger trigger_adjust_room_availability
  after insert or update of booking_status on public.hotel_bookings
  for each row
  execute function public.adjust_room_availability();
