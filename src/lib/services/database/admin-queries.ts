/**
 * Parameterized admin queries shared by the Neon service and the PostgreSQL
 * tests. Keep all admin-supplied values in the params array passed to
 * `query()`; identifiers are never interpolated.
 */

/**
 * The four figures the dashboard shows, counted exactly — "registered users"
 * has to be a real number — with every predicate served by an index on
 * `profiles`. The previous 30-day window comes back alongside the current one
 * so the signup tile can state its change instead of a bare total.
 */
export const ADMIN_ACCOUNT_STATS_QUERY = `
  select
    count(*)::bigint as total_users,
    count(*) filter (where banned_at is not null)::bigint as banned_users,
    count(*) filter (where created_at >= now() - interval '30 days')::bigint as signups_last_month,
    count(*) filter (
      where created_at >= now() - interval '60 days'
        and created_at < now() - interval '30 days'
    )::bigint as signups_previous_month
  from profiles
`;

/**
 * Activity is "touched the library", read from the recent slice of
 * `user_media` its `updated_at` index covers. The previous 30 days are counted
 * in the same pass so the tile can show the change between the two windows.
 */
export const ADMIN_ACTIVE_USERS_QUERY = `
  select
    count(distinct user_id) filter (
      where updated_at >= now() - interval '30 days'
    )::bigint as active_users,
    count(distinct user_id) filter (
      where updated_at >= now() - interval '60 days'
        and updated_at < now() - interval '30 days'
    )::bigint as previous_active_users
  from user_media
  where updated_at >= now() - interval '60 days'
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
