/**
 * Parameterized privacy/data-rights queries shared by Neon services and
 * PostgreSQL tests. User-controlled values must only be supplied through the
 * params array.
 *
 * Every export query is scoped by `user_id` in its own where clause, so a
 * caller can never widen a data-access request past the one account it names.
 */

export const GET_PRIVACY_PREFERENCES_QUERY = `
  select user_id, analytics_opt_out, privacy_choices_updated_at
  from profiles
  where user_id = $1
  limit 1
`;

export const UPDATE_PRIVACY_PREFERENCES_QUERY = `
  update profiles
  set
    analytics_opt_out = $2,
    privacy_choices_updated_at = now(),
    updated_at = now()
  where user_id = $1
  returning user_id, analytics_opt_out, privacy_choices_updated_at
`;

export const EXPORT_ACCOUNT_QUERY = `
  select
    user_id, name, username, display_name, email, bio, privacy_setting,
    profile_avatar_path, profile_avatar_title,
    analytics_opt_out, privacy_choices_updated_at, email_verified_at,
    banned_at, ban_reason, created_at, updated_at
  from profiles
  where user_id = $1
  limit 1
`;

/** Provider links only — password hashes are never exported. */
export const EXPORT_SIGN_IN_METHODS_QUERY = `
  select provider, password_updated_at, created_at, updated_at
  from auth_accounts
  where user_id = $1
  order by provider
`;

export const EXPORT_LIBRARY_QUERY = `
  select tmdb_id, media_type, watch_status, date_added, last_watched_at,
    created_at, updated_at
  from user_media
  where user_id = $1
  order by media_type, tmdb_id
`;

export const EXPORT_EPISODE_PROGRESS_QUERY = `
  select tmdb_show_id, season_number, episode_number, watched, watched_at,
    note, created_at, updated_at
  from episode_progress
  where user_id = $1
  order by tmdb_show_id, season_number, episode_number
`;

export const EXPORT_RATINGS_QUERY = `
  select tmdb_id, media_type, season_number, episode_number, rating, review,
    created_at, updated_at
  from ratings
  where user_id = $1
  order by media_type, tmdb_id, season_number, episode_number
`;

export const EXPORT_FAVORITES_QUERY = `
  select tmdb_id, media_type, created_at, updated_at
  from favorite_media
  where user_id = $1
  order by media_type, tmdb_id
`;

export const EXPORT_WATCHLIST_QUERY = `
  select tmdb_id, media_type, date_added, note, created_at, updated_at
  from watchlist_items
  where user_id = $1
  order by media_type, tmdb_id
`;

/**
 * The follow graph is personal data on both sides, so an export carries the
 * accounts this user follows and the accounts following them — identified by
 * their public username rather than their internal id or email.
 */
export const EXPORT_FOLLOWING_QUERY = `
  select profiles.username, follows.created_at
  from follows
  join profiles on profiles.user_id = follows.following_user_id
  where follows.follower_user_id = $1
  order by follows.created_at desc
`;

export const EXPORT_FOLLOWERS_QUERY = `
  select profiles.username, follows.created_at
  from follows
  join profiles on profiles.user_id = follows.follower_user_id
  where follows.following_user_id = $1
  order by follows.created_at desc
`;

/** Resolves a username or email to the account an admin request names. */
export const FIND_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY = `
  select user_id, username, email
  from profiles
  where lower(btrim(username)) = lower(btrim($1))
     or lower(btrim(email)) = lower(btrim($1))
  limit 1
`;

/**
 * Erasure for an account that cannot use the in-product delete (GDPR Art. 17
 * requests that arrive by email). Every personal table cascades from
 * `profiles`, so the one delete removes the account and its activity.
 */
export const DELETE_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY = `
  delete from profiles
  where user_id = $1
  returning user_id, username, email
`;

export const COUNT_ANALYTICS_OPT_OUTS_QUERY = `
  select count(*)::bigint as opted_out
  from profiles
  where analytics_opt_out
`;
