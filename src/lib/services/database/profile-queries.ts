/**
 * Parameterized profile/account queries shared by Neon services and PostgreSQL tests.
 * User-controlled values must only be supplied through the params array.
 */

export const UPDATE_OWN_PROFILE_DETAILS_QUERY = `
  update profiles
  set
    display_name = $2,
    username = $3,
    bio = $4,
    privacy_setting = $5,
    updated_at = now()
  where user_id = $1
  returning user_id, name, username, display_name, email, bio,
    privacy_setting, created_at, updated_at
`;

export const GET_OWN_AUTH_METHODS_QUERY = `
  select
    exists (
      select 1 from auth_accounts
      where user_id = $1 and provider = 'credentials'
    ) as has_credentials,
    exists (
      select 1 from auth_accounts
      where user_id = $1 and provider = 'google'
    ) as has_google,
    (
      select password_hash from auth_accounts
      where user_id = $1 and provider = 'credentials'
      limit 1
    ) as password_hash
`;

export const INVALIDATE_EMAIL_CHANGE_TOKENS_QUERY = `
  update auth_email_change_tokens
  set consumed_at = coalesce(consumed_at, now())
  where user_id = $1 and consumed_at is null
`;

export const INSERT_EMAIL_CHANGE_TOKEN_QUERY = `
  insert into auth_email_change_tokens (
    user_id,
    new_email,
    token_digest,
    expires_at
  )
  values ($1, $2, $3, $4)
`;

export const CONSUME_EMAIL_CHANGE_TOKEN_QUERY = `
  with eligible as (
    select token.id, token.user_id, token.new_email,
      profile.email as current_email
    from auth_email_change_tokens token
    inner join profiles profile on profile.user_id = token.user_id
    where
      token.token_digest = $1
      and token.consumed_at is null
      and token.expires_at > now()
      and not exists (
        select 1
        from profiles other_profile
        where lower(btrim(other_profile.email)) = lower(btrim(token.new_email))
          and other_profile.user_id <> token.user_id
      )
    for update
  ), consumed as (
    update auth_email_change_tokens token
    set consumed_at = now()
    from eligible
    where token.id = eligible.id
    returning eligible.user_id, eligible.new_email, eligible.current_email
  ), updated as (
    update profiles profile
    set
      email = consumed.new_email,
      email_verified_at = now(),
      session_version = profile.session_version + 1,
      updated_at = now()
    from consumed
    where profile.user_id = consumed.user_id
    returning profile.user_id, profile.email
  ), invalidated as (
    update auth_email_change_tokens token
    set consumed_at = coalesce(token.consumed_at, now())
    where token.user_id in (select user_id from updated)
    returning token.id
  )
  select updated.user_id, updated.email, consumed.current_email as previous_email
  from updated
  inner join consumed on consumed.user_id = updated.user_id
`;

export const SET_OWN_PASSWORD_QUERY = `
  with password_saved as (
    insert into auth_accounts (
      user_id,
      provider,
      provider_account_id,
      password_hash,
      password_updated_at
    )
    values ($1, 'credentials', $1, $2, now())
    on conflict (user_id, provider) do update set
      password_hash = excluded.password_hash,
      password_updated_at = now(),
      updated_at = now()
    returning user_id
  ), session_rotated as (
    update profiles
    set session_version = session_version + 1, updated_at = now()
    where user_id in (select user_id from password_saved)
    returning user_id
  )
  select user_id from session_rotated
`;

export const DELETE_OWN_ACCOUNT_QUERY = `
  delete from profiles
  where user_id = $1
  returning user_id
`;

export const UPSERT_OWN_FAVORITE_QUERY = `
  insert into favorite_media (user_id, tmdb_id, media_type)
  values ($1, $2, $3)
  on conflict (user_id, tmdb_id, media_type) do update set
    updated_at = now()
  returning user_id, tmdb_id, media_type, created_at, updated_at
`;

export const DELETE_OWN_FAVORITE_QUERY = `
  delete from favorite_media
  where user_id = $1 and tmdb_id = $2 and media_type = $3
  returning user_id, tmdb_id, media_type
`;

export const LIST_OWN_FAVORITES_QUERY = `
  select user_id, tmdb_id, media_type, created_at, updated_at
  from favorite_media
  where user_id = $1
  order by created_at desc
`;

export const LIST_PUBLIC_FAVORITES_QUERY = `
  select favorites.user_id, favorites.tmdb_id, favorites.media_type,
    favorites.created_at, favorites.updated_at
  from favorite_media favorites
  inner join profiles on profiles.user_id = favorites.user_id
  where lower(btrim(profiles.username)) = $1
    and profiles.privacy_setting = 'public'
  order by favorites.created_at desc
`;
