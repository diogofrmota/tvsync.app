/**
 * Parameterized auth queries shared by the Neon service and PostgreSQL tests.
 * Keep all user-controlled values in the params array passed to `query()`.
 */
export const FIND_CREDENTIAL_ACCOUNT_QUERY = `
  select
    p.user_id,
    p.name,
    p.username,
    p.email,
    p.email_verified_at,
    p.session_version,
    a.password_hash
  from profiles p
  join auth_accounts a
    on a.user_id = p.user_id
    and a.provider = 'credentials'
  where
    lower(btrim(p.email)) = $1
    or lower(btrim(p.username)) = $1
  limit 1
`;

export const FIND_GOOGLE_ACCOUNT_USER_ID_QUERY = `
  select user_id
  from auth_accounts
  where provider = 'google' and provider_account_id = $1
  limit 1
`;

export const FIND_PROFILE_USER_ID_BY_EMAIL_QUERY = `
  select user_id
  from profiles
  where lower(btrim(email)) = $1
  limit 1
`;

export const LINK_GOOGLE_ACCOUNT_QUERY = `
  insert into auth_accounts (user_id, provider, provider_account_id)
  values ($1, 'google', $2)
  on conflict (provider, provider_account_id) do nothing
`;

export const INVALIDATE_EMAIL_VERIFICATION_TOKENS_QUERY = `
  update auth_email_verification_tokens
  set consumed_at = coalesce(consumed_at, now())
  where user_id = $1 and consumed_at is null
`;

export const INSERT_EMAIL_VERIFICATION_TOKEN_QUERY = `
  insert into auth_email_verification_tokens (
    user_id,
    token_digest,
    expires_at
  )
  values ($1, $2, $3)
`;

export const CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY = `
  with consumed as (
    update auth_email_verification_tokens
    set consumed_at = now()
    where
      token_digest = $1
      and consumed_at is null
      and expires_at > now()
    returning user_id
  ), verified as (
    update profiles
    set email_verified_at = coalesce(email_verified_at, now()), updated_at = now()
    where user_id in (select user_id from consumed)
    returning user_id
  ), invalidated as (
    update auth_email_verification_tokens
    set consumed_at = coalesce(consumed_at, now())
    where user_id in (select user_id from verified)
    returning id
  )
  select user_id from verified
`;

export const INVALIDATE_PASSWORD_RESET_TOKENS_QUERY = `
  update auth_password_reset_tokens
  set consumed_at = coalesce(consumed_at, now())
  where user_id = $1 and consumed_at is null
`;

export const INSERT_PASSWORD_RESET_TOKEN_QUERY = `
  insert into auth_password_reset_tokens (
    user_id,
    token_digest,
    expires_at
  )
  values ($1, $2, $3)
`;

export const IS_PASSWORD_RESET_TOKEN_VALID_QUERY = `
  select t.id
  from auth_password_reset_tokens t
  join auth_accounts a
    on a.user_id = t.user_id and a.provider = 'credentials'
  where
    t.token_digest = $1
    and t.consumed_at is null
    and t.expires_at > now()
  limit 1
`;

export const RESET_PASSWORD_WITH_TOKEN_QUERY = `
  with consumed as (
    update auth_password_reset_tokens
    set consumed_at = now()
    where
      token_digest = $1
      and consumed_at is null
      and expires_at > now()
    returning user_id
  ), password_updated as (
    update auth_accounts
    set
      password_hash = $2,
      password_updated_at = now(),
      updated_at = now()
    where
      provider = 'credentials'
      and user_id in (select user_id from consumed)
    returning user_id
  ), session_rotated as (
    update profiles
    set session_version = session_version + 1, updated_at = now()
    where user_id in (select user_id from password_updated)
    returning user_id
  ), invalidated as (
    update auth_password_reset_tokens
    set consumed_at = coalesce(consumed_at, now())
    where user_id in (select user_id from session_rotated)
    returning id
  )
  select user_id from session_rotated
`;

export const GET_SESSION_VERSION_QUERY = `
  select session_version
  from profiles
  where user_id = $1
  limit 1
`;

export const CONSUME_AUTH_RATE_LIMIT_QUERY = `
  insert into auth_rate_limits (
    scope,
    key_digest,
    window_started_at,
    attempt_count
  )
  values ($1, $2, now(), 1)
  on conflict (scope, key_digest) do update set
    attempt_count = case
      when auth_rate_limits.window_started_at <= now() - make_interval(secs => $3)
        then 1
      else auth_rate_limits.attempt_count + 1
    end,
    window_started_at = case
      when auth_rate_limits.window_started_at <= now() - make_interval(secs => $3)
        then now()
      else auth_rate_limits.window_started_at
    end,
    updated_at = now()
  returning attempt_count
`;
