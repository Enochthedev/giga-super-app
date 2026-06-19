-- Consolidate duplicate avatar columns on user_profiles.
-- `avatar_url` is canonical: it is read by every service (social, taxi, delivery,
-- admin, search, hotels) and is indexed (idx_user_profiles_avatar_url). The legacy
-- `avatar` column was only written by upload-profile-picture / update-user-profile,
-- so uploaded pictures never surfaced anywhere that reads avatar_url.
--
-- Backfill any value that still lives only in the legacy column, then drop it.
UPDATE public.user_profiles
SET avatar_url = avatar
WHERE avatar_url IS NULL
  AND avatar IS NOT NULL;

-- The active_user_profiles view selects the legacy column, so it must be
-- dropped and recreated (a mid-list column cannot be removed via CREATE OR REPLACE).
DROP VIEW IF EXISTS public.active_user_profiles;

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS avatar;

CREATE VIEW public.active_user_profiles AS
  SELECT id, email, phone, first_name, last_name, date_of_birth, gender,
         marital_status, body_weight, height, age_group, areas_of_interest,
         is_phone_verified, is_active, last_login_at, created_at, updated_at,
         avatar_url, deleted_at, deleted_by, deletion_reason
  FROM public.user_profiles
  WHERE deleted_at IS NULL;

ALTER VIEW public.active_user_profiles OWNER TO postgres;
GRANT ALL ON public.active_user_profiles TO anon, authenticated, service_role;
