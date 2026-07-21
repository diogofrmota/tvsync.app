create extension if not exists pgcrypto;

create table if not exists profiles (
  user_id text primary key,
  name text not null,
  username text not null,
  display_name text not null,
  email text not null,
  bio text not null default '',
  privacy_setting text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_privacy_setting_check
    check (privacy_setting in ('private', 'friends', 'public')),
  constraint profiles_username_not_blank_check
    check (length(trim(username)) > 0),
  constraint profiles_email_not_blank_check
    check (length(trim(email)) > 0)
);

create unique index if not exists profiles_username_lower_unique
  on profiles (lower(username));

create unique index if not exists profiles_email_lower_unique
  on profiles (lower(email));

create index if not exists profiles_privacy_setting_idx
  on profiles (privacy_setting);

create table if not exists user_media (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  watch_status text not null,
  date_added timestamptz not null default now(),
  last_watched_at timestamptz,
  privacy_setting text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_media_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint user_media_media_type_check
    check (media_type in ('movie', 'tv')),
  constraint user_media_watch_status_check
    check (
      (media_type = 'movie' and watch_status in ('planned', 'watched'))
      or
      (media_type = 'tv' and watch_status in ('planned', 'watching', 'completed', 'dropped', 'paused'))
    ),
  constraint user_media_privacy_setting_check
    check (privacy_setting in ('private', 'friends', 'public')),
  constraint user_media_user_tmdb_media_unique
    unique (user_id, tmdb_id, media_type)
);

create index if not exists user_media_user_id_idx
  on user_media (user_id);

create index if not exists user_media_tmdb_lookup_idx
  on user_media (tmdb_id, media_type);

create index if not exists user_media_user_status_idx
  on user_media (user_id, watch_status);

create index if not exists user_media_user_date_added_idx
  on user_media (user_id, date_added desc);

create table if not exists episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  watched boolean not null default false,
  watched_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint episode_progress_tmdb_show_id_positive_check
    check (tmdb_show_id > 0),
  constraint episode_progress_season_number_non_negative_check
    check (season_number >= 0),
  constraint episode_progress_episode_number_positive_check
    check (episode_number > 0),
  constraint episode_progress_user_episode_unique
    unique (user_id, tmdb_show_id, season_number, episode_number)
);

create index if not exists episode_progress_user_id_idx
  on episode_progress (user_id);

create index if not exists episode_progress_show_lookup_idx
  on episode_progress (tmdb_show_id, season_number, episode_number);

create index if not exists episode_progress_user_show_idx
  on episode_progress (user_id, tmdb_show_id);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  rating integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ratings_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint ratings_media_type_check
    check (media_type in ('movie', 'tv')),
  constraint ratings_rating_range_check
    check (rating between 0 and 10),
  constraint ratings_user_tmdb_media_unique
    unique (user_id, tmdb_id, media_type)
);

create index if not exists ratings_user_id_idx
  on ratings (user_id);

create index if not exists ratings_media_lookup_idx
  on ratings (tmdb_id, media_type);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  title text not null default '',
  body text not null,
  privacy_setting text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint reviews_media_type_check
    check (media_type in ('movie', 'tv')),
  constraint reviews_privacy_setting_check
    check (privacy_setting in ('private', 'friends', 'public')),
  constraint reviews_body_not_blank_check
    check (length(trim(body)) > 0),
  constraint reviews_user_tmdb_media_unique
    unique (user_id, tmdb_id, media_type)
);

create index if not exists reviews_user_id_idx
  on reviews (user_id);

create index if not exists reviews_media_lookup_idx
  on reviews (tmdb_id, media_type);

create index if not exists reviews_public_lookup_idx
  on reviews (tmdb_id, media_type, created_at desc)
  where privacy_setting = 'public';

create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  date_added timestamptz not null default now(),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watchlist_items_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint watchlist_items_media_type_check
    check (media_type in ('movie', 'tv')),
  constraint watchlist_items_user_tmdb_media_unique
    unique (user_id, tmdb_id, media_type)
);

create index if not exists watchlist_items_user_id_idx
  on watchlist_items (user_id);

create index if not exists watchlist_items_media_lookup_idx
  on watchlist_items (tmdb_id, media_type);

create index if not exists watchlist_items_user_date_added_idx
  on watchlist_items (user_id, date_added desc);
