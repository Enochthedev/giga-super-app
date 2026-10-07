-- User-generated content moderation (App Store guideline 1.2)
--
-- Apps with user posts must let users (a) report objectionable content, with the
-- operator acting on reports, and (b) block abusive users. Until now the report
-- endpoint only wrote a log line and "block" existed only as a connection-request
-- status, so neither met the bar.
--
-- 1. user_blocks      — one row per (blocker, blocked). Blocking hides each user's
--                       posts, comments and stories from the other, both ways.
-- 2. content_reports  — reports on posts, comments and users, reviewed by admins
--                       (admin-service /api/admin/reports). One report per
--                       reporter per target.
--
-- Both are written by the Node services with the service role; RLS lets a user
-- read only their own blocks and nothing else.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users can read their own blocks" on public.user_blocks;
create policy "Users can read their own blocks"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));


create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id uuid not null,
  -- Author of the reported content (or the reported user), for "all reports
  -- against this person" views and repeat-offender checks.
  target_user_id uuid references auth.users (id) on delete set null,
  reason text not null check (reason in (
    'spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'false_information', 'other'
  )),
  description text check (char_length(description) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index if not exists content_reports_status_created_idx
  on public.content_reports (status, created_at desc);
create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);
create index if not exists content_reports_target_user_idx
  on public.content_reports (target_user_id);

-- No policies: only the service role (social-service, admin-service) touches reports.
alter table public.content_reports enable row level security;
