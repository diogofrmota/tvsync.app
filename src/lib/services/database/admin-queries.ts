/**
 * Parameterized admin queries shared by the Neon service and the PostgreSQL
 * tests. Keep all admin-supplied values in the params array passed to
 * `query()`; identifiers are never interpolated.
 */

/**
 * Account figures are counted exactly — "registered users" has to be a real
 * number — and every predicate here is served by an index on `profiles`.
 * The high-volume activity tables are sized separately from planner statistics
 * instead, so the dashboard never triggers a full scan of them.
 */
export const ADMIN_ACCOUNT_STATS_QUERY = `
  select
    count(*)::bigint as total_users,
    count(*) filter (where email_verified_at is not null)::bigint as verified_users,
    count(*) filter (where banned_at is not null)::bigint as banned_users,
    count(*) filter (where privacy_setting = 'public')::bigint as public_profiles,
    count(*) filter (where created_at >= now() - interval '1 day')::bigint as signups_last_day,
    count(*) filter (where created_at >= now() - interval '7 days')::bigint as signups_last_week,
    count(*) filter (where created_at >= now() - interval '30 days')::bigint as signups_last_month
  from profiles
`;

export const ADMIN_PROVIDER_STATS_QUERY = `
  select
    count(*) filter (where provider = 'credentials')::bigint as credential_accounts,
    count(*) filter (where provider = 'google')::bigint as google_accounts
  from auth_accounts
`;

export const ADMIN_ACTIVE_USERS_QUERY = `
  select count(distinct user_id)::bigint as active_users
  from user_media
  where updated_at >= now() - interval '30 days'
`;

/**
 * Row estimates from the planner's own statistics. `user_media`,
 * `episode_progress`, `ratings`, and `watchlist_items` grow with every action
 * every user takes, so counting them exactly would mean scanning the largest
 * tables in the database to render a dashboard tile. The estimate is accurate
 * to well within a percent after autovacuum and costs a single index lookup.
 */
export const ADMIN_TABLE_ESTIMATES_QUERY = `
  select
    c.relname as table_name,
    greatest(c.reltuples, 0)::bigint as row_estimate
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (
      'user_media',
      'episode_progress',
      'ratings',
      'watchlist_items'
    )
`;

export const ADMIN_FIND_USER_QUERY = `
  select
    p.user_id,
    p.username,
    p.display_name,
    p.email,
    p.privacy_setting,
    p.created_at,
    p.email_verified_at,
    p.banned_at,
    p.ban_reason,
    (
      select count(*)::bigint
      from user_media m
      where m.user_id = p.user_id
    ) as library_items,
    (
      select count(*)::bigint
      from ratings r
      where r.user_id = p.user_id
    ) as ratings,
    (
      select count(*)::bigint
      from episode_progress e
      where e.user_id = p.user_id and e.watched
    ) as episodes_watched,
    (
      select string_agg(a.provider, ', ' order by a.provider)
      from auth_accounts a
      where a.user_id = p.user_id
    ) as providers
  from profiles p
  where lower(btrim(p.email)) = $1 or lower(btrim(p.username)) = $1
  limit 1
`;

/**
 * A ban both blocks future sign-ins and rotates `session_version`, which is the
 * same mechanism a password reset uses to sign every existing device out. The
 * caller busts the cached session version so live sessions die on their next
 * request rather than at the end of the cache window.
 */
export const ADMIN_BAN_USER_QUERY = `
  update profiles
  set
    banned_at = coalesce(banned_at, now()),
    ban_reason = $2,
    session_version = session_version + 1,
    updated_at = now()
  where lower(btrim(email)) = $1 or lower(btrim(username)) = $1
  returning user_id, username, email, banned_at, ban_reason
`;

export const ADMIN_UNBAN_USER_QUERY = `
  update profiles
  set
    banned_at = null,
    ban_reason = '',
    updated_at = now()
  where (lower(btrim(email)) = $1 or lower(btrim(username)) = $1)
    and banned_at is not null
  returning user_id, username, email
`;

export const ADMIN_RECENT_BANS_QUERY = `
  select user_id, username, email, banned_at, ban_reason
  from profiles
  where banned_at is not null
  order by banned_at desc
  limit $1
`;

export const ADMIN_RECENT_SIGNUPS_QUERY = `
  select user_id, username, email, created_at, email_verified_at
  from profiles
  order by created_at desc
  limit $1
`;

export const ADMIN_INSERT_AUDIT_LOG_QUERY = `
  insert into admin_audit_log (actor, action, target, details, ip_digest)
  values ($1, $2, $3, $4, $5)
`;

export const ADMIN_RECENT_AUDIT_LOG_QUERY = `
  select id, actor, action, target, details, created_at
  from admin_audit_log
  order by created_at desc
  limit $1
`;

export const ADMIN_PURGE_AUDIT_LOG_QUERY = `
  delete from admin_audit_log
  where created_at < now() - interval '90 days'
  returning 1
`;
