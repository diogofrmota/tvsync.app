-- Admin dashboard: account moderation, admin-managed discovery lists, and an
-- audit trail for every privileged action.

alter table profiles
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text not null default '';

-- Moderation reads ask "who is currently banned"; only banned rows are indexed.
create index if not exists profiles_banned_at_idx
  on profiles (banned_at desc)
  where banned_at is not null;

-- Signup counters on the dashboard are date-ordered scans over recent rows.
create index if not exists profiles_created_at_idx
  on profiles (created_at desc);

-- The "active in the last 30 days" figure reads a recent slice of library
-- activity rather than the whole table.
create index if not exists user_media_updated_at_idx
  on user_media (updated_at desc);

/**
 * One row per shared discovery list. Every visitor sees the same lists, so the
 * configuration is global rather than per user: which lists are active, where
 * they appear, in what order, how many titles the "See All" page carries, and
 * how long a cached fetch stays valid before TMDB is called again.
 *
 * `cache_epoch` is part of the Data Cache key for the list. Bumping it is the
 * manual "fetch now" control: the next read misses the cache and repopulates it
 * from TMDB, without needing an in-process cache handle or a redeploy.
 */
create table if not exists discovery_list_settings (
  list_key text primary key,
  active boolean not null default true,
  show_on_home boolean not null default true,
  show_on_explore boolean not null default true,
  position integer not null default 0,
  item_limit integer not null default 30,
  refresh_interval_hours integer not null default 24,
  cache_epoch integer not null default 0,
  refreshed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint discovery_list_settings_position_check
    check (position >= 0),
  constraint discovery_list_settings_item_limit_check
    check (item_limit between 5 and 100),
  constraint discovery_list_settings_refresh_interval_check
    check (refresh_interval_hours between 1 and 720),
  constraint discovery_list_settings_cache_epoch_check
    check (cache_epoch >= 0)
);

-- Seed the lists the app already shipped with, keeping their current order and
-- the Explore-only placement of the upcoming rail.
insert into discovery_list_settings (
  list_key,
  position,
  show_on_home,
  show_on_explore,
  item_limit,
  refresh_interval_hours
)
values
  ('trending_movies', 0, true, true, 30, 12),
  ('trending_tv_shows', 1, true, true, 30, 12),
  ('upcoming_movies', 2, false, true, 30, 24),
  ('popular_movies', 3, true, true, 30, 24),
  ('popular_tv_shows', 4, true, true, 30, 24),
  ('top_rated_movies', 5, true, true, 30, 168),
  ('top_rated_tv_shows', 6, true, true, 30, 168)
on conflict (list_key) do nothing;

/**
 * Every privileged action is recorded. The dashboard is credential-gated rather
 * than tied to a user account, so the trail is what makes an admin change
 * reviewable after the fact. Only the actor name from ADMIN_USER is stored, and
 * IP addresses are kept as a keyed digest instead of raw values.
 */
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target text not null default '',
  details text not null default '',
  ip_digest text not null default '',
  created_at timestamptz not null default now(),
  constraint admin_audit_log_action_not_blank_check
    check (length(trim(action)) > 0)
);

create index if not exists admin_audit_log_created_at_idx
  on admin_audit_log (created_at desc);

comment on table discovery_list_settings is
  'Global configuration for the shared Home/Explore discovery lists. Managed from /admin.';

comment on column discovery_list_settings.cache_epoch is
  'Part of the Data Cache key. Incrementing it forces the next read to refetch from TMDB.';

comment on table admin_audit_log is
  'Append-only trail of privileged /admin actions. IP values are stored only as an AUTH_SECRET-keyed digest.';

comment on column profiles.banned_at is
  'Set by admin moderation. A banned profile cannot sign in and its existing sessions are revoked by a session_version bump.';
