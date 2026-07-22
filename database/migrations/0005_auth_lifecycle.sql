alter table profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists session_version integer not null default 0;

-- Every profile predating credentials support was created through Google OAuth.
update profiles
set email_verified_at = coalesce(email_verified_at, created_at)
where email_verified_at is null;

create unique index if not exists profiles_email_normalized_unique
  on profiles (lower(btrim(email)));

create unique index if not exists profiles_username_normalized_unique
  on profiles (lower(btrim(username)));

create table if not exists auth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  password_hash text,
  password_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_accounts_provider_check
    check (provider in ('credentials', 'google')),
  constraint auth_accounts_password_shape_check
    check (
      (provider = 'credentials' and password_hash is not null)
      or (provider = 'google' and password_hash is null)
    ),
  constraint auth_accounts_provider_account_unique
    unique (provider, provider_account_id),
  constraint auth_accounts_user_provider_unique
    unique (user_id, provider)
);

create index if not exists auth_accounts_user_id_idx
  on auth_accounts (user_id);

-- Existing identities were keyed by the Google subject before provider mappings existed.
insert into auth_accounts (user_id, provider, provider_account_id)
select user_id, 'google', user_id
from profiles
on conflict (provider, provider_account_id) do nothing;

create table if not exists auth_email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  token_digest text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_email_verification_tokens_digest_check
    check (length(token_digest) = 64)
);

create index if not exists auth_email_verification_tokens_user_active_idx
  on auth_email_verification_tokens (user_id, expires_at desc)
  where consumed_at is null;

create table if not exists auth_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  token_digest text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_password_reset_tokens_digest_check
    check (length(token_digest) = 64)
);

create index if not exists auth_password_reset_tokens_user_active_idx
  on auth_password_reset_tokens (user_id, expires_at desc)
  where consumed_at is null;

create table if not exists auth_rate_limits (
  scope text not null,
  key_digest text not null,
  window_started_at timestamptz not null,
  attempt_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (scope, key_digest),
  constraint auth_rate_limits_attempt_count_positive_check
    check (attempt_count > 0),
  constraint auth_rate_limits_key_digest_check
    check (length(key_digest) = 64)
);

create index if not exists auth_rate_limits_updated_at_idx
  on auth_rate_limits (updated_at);

comment on table auth_accounts is
  'Durable provider mappings for a single internal profile identity. Password hashes exist only for credentials accounts.';

comment on table auth_email_verification_tokens is
  'Single-use email verification token digests. Raw tokens are delivered by email and never persisted.';

comment on table auth_password_reset_tokens is
  'Single-use 24-hour password reset token digests. Successful reset rotates profiles.session_version.';

comment on table auth_rate_limits is
  'Database-backed authentication throttles keyed by an AUTH_SECRET HMAC digest, never raw email or IP data.';
