-- QA e2e audit fix E15 — "failure to deactivate staff"
-- (see docs/QA_E2E_ERRORS_2026-07-07.md)
--
-- Deactivating / soft-deleting a postal_staff row (is_active=false or deleted_at set)
-- previously left the member's granted role + admin permissions intact, so they stayed
-- functionally active. The only trigger on postal_staff fires on approval_status, not on
-- deactivation. This adds a matching revoke path.

create or replace function public.handle_postal_staff_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.user_id is not null
     and (
       (OLD.is_active is distinct from NEW.is_active and NEW.is_active = false)
       or (OLD.deleted_at is null and NEW.deleted_at is not null)
     )
  then
    -- revoke the role(s) granted at approval (see handle_postal_staff_approval)
    delete from public.user_roles
      where user_id = NEW.user_id
        and role_name in ('PMG', 'REGIONAL_MANAGER', 'MODULE_ADMIN');

    -- deactivate any NIPOST admin permissions for this user
    update public.nipost_user_permissions
      set is_active = false
      where user_id = NEW.user_id
        and is_active = true;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trigger_postal_staff_deactivation on public.postal_staff;
create trigger trigger_postal_staff_deactivation
  after update of is_active, deleted_at on public.postal_staff
  for each row
  execute function public.handle_postal_staff_deactivation();
