-- Account deletion ("delete account") cascade
--
-- Accounts are never hard-deleted: the gateway (DELETE /auth/account) and the admin
-- service (DELETE /api/admin/users/:id) ban the auth user and soft-delete
-- user_profiles. Until now nothing else followed, so a deleted driver/courier stayed
-- matchable, a deleted vendor's products and a deleted host's hotels stayed listed,
-- and the user's unpaid orders/bookings/ride requests stayed open.
--
-- 1. account_deletion_blockers(uuid) — open, paid or in-flight commitments that must
--    be finished first. The self-service endpoint refuses to delete while any exist;
--    the admin path may force through.
-- 2. A trigger on user_profiles that, when deleted_at goes NULL -> set:
--      * cancels unpaid work the user started (ride requests, orders, bookings)
--      * takes drivers/couriers offline and soft-deletes the role profiles
--      * soft-deletes + deactivates vendor products, host hotels and social posts
--      * pauses active ad campaigns, locks the wallet (funds are kept)
--    and, when deleted_at goes set -> NULL (admin restore), reverses everything it
--    did except the cancellations.
--
-- Every row the cascade touches is tagged via deletion_reason (or lock_reason) so a
-- restore only undoes the cascade's own changes, never an earlier, unrelated deletion:
--   'account_deleted'           row was active; the cascade deactivated it
--   'account_deleted:inactive'  row was already inactive; restore leaves it inactive

create or replace function public.account_deletion_blockers(p_user_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array_remove(array[
    case when exists (
      select 1 from rides
      where (passenger_id = p_user_id or driver_id = p_user_id)
        and status in ('accepted', 'arrived', 'picked_up', 'in_progress')
    ) then 'active_ride' end,

    case when exists (
      select 1 from ecommerce_orders
      where user_id = p_user_id
        and deleted_at is null
        and payment_status = 'paid'
        and status in ('confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery')
    ) then 'open_paid_order' end,

    case when exists (
      select 1 from hotel_bookings
      where user_id = p_user_id
        and deleted_at is null
        and check_out_date >= current_date
        and (
          booking_status in ('confirmed', 'checked_in')
          or (booking_status = 'pending' and payment_status in ('paid', 'partially_paid'))
        )
    ) then 'upcoming_booking' end,

    -- vendor: paid orders containing this vendor's items that aren't fulfilled yet
    case when exists (
      select 1
      from ecommerce_order_items oi
      join ecommerce_vendors v on v.id = oi.vendor_id
      join ecommerce_orders o on o.id = oi.order_id
      where v.user_id = p_user_id
        and o.deleted_at is null
        and o.payment_status = 'paid'
        and o.status in ('confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery')
    ) then 'vendor_open_orders' end,

    -- host: guests with upcoming confirmed stays
    case when exists (
      select 1
      from hotel_bookings b
      join hotels h on h.id = b.hotel_id
      join host_profiles hp on hp.id = h.host_id
      where hp.user_id = p_user_id
        and b.deleted_at is null
        and b.check_out_date >= current_date
        and b.booking_status in ('confirmed', 'checked_in')
    ) then 'host_upcoming_bookings' end,

    case when exists (
      select 1
      from delivery_assignments da
      join courier_profiles cp on cp.id = da.courier_id
      where cp.user_id = p_user_id
        and da.deleted_at is null
        and da.status in ('assigned', 'picked_up', 'in_transit', 'out_for_delivery')
    ) then 'active_delivery' end
  ], null);
$$;

revoke all on function public.account_deletion_blockers(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_blockers(uuid) to service_role;


create or replace function public.handle_user_profile_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(NEW.deleted_by, NEW.id);
begin
  -- ---------------------------------------------------------------- deletion
  if OLD.deleted_at is null and NEW.deleted_at is not null then

    -- Unpaid work the user started: cancel it (these are NOT undone on restore).
    update rides
      set status = 'cancelled',
          cancelled_by = NEW.id,
          cancelled_at = now(),
          cancellation_reason = 'account_deleted'
      where passenger_id = NEW.id
        and status = 'requested';

    update ecommerce_orders
      set status = 'cancelled',
          cancellation_reason = 'account_deleted'
      where user_id = NEW.id
        and deleted_at is null
        and status in ('pending', 'pending_payment')
        and payment_status in ('pending', 'failed');

    -- trigger_adjust_room_availability releases the held inventory.
    update hotel_bookings
      set booking_status = 'cancelled',
          cancelled_by = NEW.id,
          cancelled_at = now(),
          cancellation_reason = 'account_deleted'
      where user_id = NEW.id
        and deleted_at is null
        and booking_status = 'pending'
        and payment_status in ('pending', 'failed');

    -- Driver: offline + soft-deleted so matching skips them.
    update driver_profiles
      set is_online = false,
          deleted_at = NEW.deleted_at,
          deleted_by = v_actor,
          deletion_reason = 'account_deleted'
      where user_id = NEW.id
        and deleted_at is null;

    -- Courier
    update courier_profiles
      set is_online = false,
          availability_status = 'offline',
          deletion_reason = case when is_active then 'account_deleted' else 'account_deleted:inactive' end,
          is_active = false,
          deleted_at = NEW.deleted_at,
          deleted_by = v_actor
      where user_id = NEW.id
        and deleted_at is null;

    -- Vendor + their products. Products first: they're found via the vendor row.
    update ecommerce_products p
      set deletion_reason = case when p.is_active then 'account_deleted' else 'account_deleted:inactive' end,
          is_active = false,
          deleted_at = NEW.deleted_at,
          deleted_by = v_actor
      from ecommerce_vendors v
      where p.vendor_id = v.id
        and v.user_id = NEW.id
        and p.deleted_at is null;

    update ecommerce_vendors
      set deletion_reason = case when is_active then 'account_deleted' else 'account_deleted:inactive' end,
          is_active = false,
          deleted_at = NEW.deleted_at,
          deleted_by = v_actor
      where user_id = NEW.id
        and deleted_at is null;

    -- Host + their hotels
    update hotels h
      set deletion_reason = case when h.is_active then 'account_deleted' else 'account_deleted:inactive' end,
          is_active = false,
          deleted_at = NEW.deleted_at,
          deleted_by = v_actor
      from host_profiles hp
      where h.host_id = hp.id
        and hp.user_id = NEW.id
        and h.deleted_at is null;

    update host_profiles
      set deleted_at = NEW.deleted_at,
          deleted_by = v_actor,
          deletion_reason = 'account_deleted'
      where user_id = NEW.id
        and deleted_at is null;

    -- Advertiser: stop spend on live campaigns.
    update ad_campaigns c
      set status = 'paused',
          deletion_reason = 'account_deleted'
      from advertiser_profiles ap
      where c.advertiser_id = ap.id
        and ap.user_id = NEW.id
        and c.status = 'active'
        and c.deleted_at is null;

    -- Social: hide the user's posts.
    update social_posts
      set deletion_reason = case when is_active then 'account_deleted' else 'account_deleted:inactive' end,
          is_active = false,
          deleted_at = NEW.deleted_at,
          deleted_by = v_actor
      where user_id = NEW.id
        and deleted_at is null;

    -- Wallet: keep the balance, block movement.
    update user_wallets
      set is_locked = true,
          lock_reason = 'account_deleted'
      where user_id = NEW.id
        and is_locked is not true;

  -- ----------------------------------------------------------------- restore
  elsif OLD.deleted_at is not null and NEW.deleted_at is null then

    update driver_profiles
      set deleted_at = null, deleted_by = null, deletion_reason = null
      where user_id = NEW.id and deletion_reason = 'account_deleted';

    update courier_profiles
      set is_active = (deletion_reason = 'account_deleted'),
          deleted_at = null, deleted_by = null, deletion_reason = null
      where user_id = NEW.id and deletion_reason like 'account_deleted%';

    update ecommerce_vendors
      set is_active = (deletion_reason = 'account_deleted'),
          deleted_at = null, deleted_by = null, deletion_reason = null
      where user_id = NEW.id and deletion_reason like 'account_deleted%';

    update ecommerce_products p
      set is_active = (p.deletion_reason = 'account_deleted'),
          deleted_at = null, deleted_by = null, deletion_reason = null
      from ecommerce_vendors v
      where p.vendor_id = v.id
        and v.user_id = NEW.id
        and p.deletion_reason like 'account_deleted%';

    update host_profiles
      set deleted_at = null, deleted_by = null, deletion_reason = null
      where user_id = NEW.id and deletion_reason = 'account_deleted';

    update hotels h
      set is_active = (h.deletion_reason = 'account_deleted'),
          deleted_at = null, deleted_by = null, deletion_reason = null
      from host_profiles hp
      where h.host_id = hp.id
        and hp.user_id = NEW.id
        and h.deletion_reason like 'account_deleted%';

    update ad_campaigns c
      set status = 'active', deletion_reason = null
      from advertiser_profiles ap
      where c.advertiser_id = ap.id
        and ap.user_id = NEW.id
        and c.status = 'paused'
        and c.deletion_reason = 'account_deleted';

    update social_posts
      set is_active = (deletion_reason = 'account_deleted'),
          deleted_at = null, deleted_by = null, deletion_reason = null
      where user_id = NEW.id and deletion_reason like 'account_deleted%';

    update user_wallets
      set is_locked = false, lock_reason = null
      where user_id = NEW.id and lock_reason = 'account_deleted';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trigger_user_profile_deletion on public.user_profiles;
create trigger trigger_user_profile_deletion
  after update of deleted_at on public.user_profiles
  for each row
  when (OLD.deleted_at is distinct from NEW.deleted_at)
  execute function public.handle_user_profile_deletion();
