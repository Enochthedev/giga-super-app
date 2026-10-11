-- Tag a user's region when their phone number arrives AFTER signup
--
-- handle_new_auth_user() stamps user_profiles.region_id at signup from the
-- phone's dialing code (20260619000100). The mobile app now signs up with email
-- only and saves the phone on a later screen (profile update), so the signup
-- trigger never sees a phone and region_id stays NULL — which leaves the user
-- invisible to region-scoped admins. 45 of 92 active users had a phone but no
-- region when this was written.
--
-- 1. BEFORE INSERT/UPDATE OF phone trigger: if region_id is still NULL and a
--    phone is present, resolve it with the same resolve_signup_region() rules.
--    An existing region is never overwritten.
-- 2. Backfill existing profiles. Numbers without a +country code (e.g. 080...)
--    stay untagged: their country can't be determined safely.

create or replace function public.tag_region_from_phone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.region_id is null and coalesce(NEW.phone, '') <> '' then
    NEW.region_id := resolve_signup_region(null, null, NEW.phone);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trigger_tag_region_from_phone on public.user_profiles;
create trigger trigger_tag_region_from_phone
  before insert or update of phone on public.user_profiles
  for each row
  execute function public.tag_region_from_phone();

update public.user_profiles
  set region_id = public.resolve_signup_region(null, null, phone)
  where region_id is null
    and coalesce(phone, '') <> ''
    and deleted_at is null
    and public.resolve_signup_region(null, null, phone) is not null;
