-- Permanent erasure of deleted accounts after a 30-day grace period
--
-- Account deletion (20260922000000) bans the auth user and soft-deletes the
-- profile immediately, which an admin can undo. App Store guideline 5.1.1(v) and
-- the privacy policy (/privacy) require the data itself to go: 30 days after
-- deletion this job anonymises the account's personal information everywhere it
-- lives. Financial records (payments, wallet ledger, orders, bookings) are kept
-- for legal retention, but contact details on them are scrubbed.
--
-- After anonymisation the account cannot be restored (admin restore refuses
-- profiles with anonymized_at set).

alter table public.user_profiles add column if not exists anonymized_at timestamptz;

create or replace function public.anonymize_deleted_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_placeholder_email text := 'deleted-' || p_user_id || '@deleted.invalid';
begin
  -- Profile
  update user_profiles
    set email = v_placeholder_email,
        first_name = 'Deleted',
        last_name = 'user',
        phone = null,
        date_of_birth = null,
        gender = null,
        marital_status = null,
        body_weight = null,
        height = null,
        age_group = null,
        areas_of_interest = null,
        avatar_url = null,
        state = null,
        anonymized_at = now()
    where id = p_user_id;

  update customer_profiles set emergency_contact = null where user_id = p_user_id;

  -- Identity in Supabase Auth: remove every way to sign in or be recognised.
  update auth.users
    set email = v_placeholder_email,
        phone = null,
        raw_user_meta_data = '{}'::jsonb
    where id = p_user_id;
  delete from auth.identities where user_id = p_user_id;
  delete from auth.sessions where user_id = p_user_id;

  -- User content: scrubbed rather than deleted, so other users' reshares and
  -- reply threads keep their structure.
  update social_posts
    set content = '', media_urls = '{}', location = null, tagged_users = '{}'
    where user_id = p_user_id;
  update post_comments set content = '' where user_id = p_user_id;
  delete from stories where user_id = p_user_id;
  delete from user_blocks where blocker_id = p_user_id or blocked_id = p_user_id;
  delete from user_connections where user_id = p_user_id or connected_user_id = p_user_id;

  -- Addresses (orders/deliveries reference these with ON DELETE SET NULL)
  delete from user_addresses where user_id = p_user_id;
  delete from shipping_addresses where user_id = p_user_id;

  -- Provider profiles: licence/bank/emergency details
  update courier_profiles
    set bank_account_number = null, bank_name = null,
        emergency_contact_name = null, emergency_contact_phone = null,
        license_number = 'deleted-' || id, phone_number = ''
    where user_id = p_user_id;
  update driver_profiles set license_number = 'deleted-' || id where user_id = p_user_id;
  update taxi_drivers
    set date_of_birth = null, residential_address = null, plate_number = null,
        license_number = 'deleted-' || id, phone = ''
    where user_id = p_user_id;
  update role_applications set document_urls = '{}' where user_id = p_user_id;

  -- Contact details on retained records
  update hotel_bookings
    set guest_name = 'Deleted guest', guest_email = v_placeholder_email, guest_phone = ''
    where user_id = p_user_id;
  update notification_logs set recipient_email = null, recipient_phone = null where user_id = p_user_id;
  update notification_queue set recipient_email = null, recipient_phone = null where user_id = p_user_id;
end;
$$;

revoke all on function public.anonymize_deleted_account(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_deleted_account(uuid) to service_role;

-- Anonymise every account deleted more than 30 days ago. Returns how many.
create or replace function public.purge_deleted_accounts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from user_profiles
    where deleted_at < now() - interval '30 days'
      and anonymized_at is null
  loop
    -- One failing account must not block the rest; it is retried next run.
    begin
      perform anonymize_deleted_account(v_id);
      v_count := v_count + 1;
    exception when others then
      raise warning 'purge_deleted_accounts: % failed: %', v_id, sqlerrm;
    end;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.purge_deleted_accounts() from public, anon, authenticated;
grant execute on function public.purge_deleted_accounts() to service_role;

-- Run daily at 03:15 UTC.
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'purge-deleted-accounts';
select cron.schedule('purge-deleted-accounts', '15 3 * * *', 'select public.purge_deleted_accounts()');
