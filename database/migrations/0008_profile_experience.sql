create table if not exists favorite_media (
  user_id text not null references profiles(user_id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type),
  constraint favorite_media_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint favorite_media_media_type_check
    check (media_type in ('movie', 'tv'))
);

create index if not exists favorite_media_user_type_created_idx
  on favorite_media (user_id, media_type, created_at desc);

create table if not exists auth_email_change_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  new_email text not null,
  token_digest text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_email_change_tokens_email_check
    check (length(btrim(new_email)) > 0),
  constraint auth_email_change_tokens_digest_check
    check (length(token_digest) = 64)
);

create unique index if not exists auth_email_change_tokens_active_user_idx
  on auth_email_change_tokens (user_id)
  where consumed_at is null;

create index if not exists auth_email_change_tokens_expires_idx
  on auth_email_change_tokens (expires_at)
  where consumed_at is null;

comment on table favorite_media is
  'Favorite movie and TV selections. Public profile reads inherit the owner profile privacy setting.';

comment on table auth_email_change_tokens is
  'Digest-only, single-use verification requests for canonical account email changes. Consuming a token rotates the session version.';
