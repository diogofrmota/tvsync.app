-- Personalized lists: user-created collections of movies and TV shows shown on
-- the profile alongside the library and favourite rails.
create table if not exists custom_lists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_lists_name_check
    check (length(btrim(name)) between 1 and 60),
  constraint custom_lists_description_check
    check (length(description) <= 280)
);

-- One list name per owner, compared case-insensitively so "Comfort Shows" and
-- "comfort shows" cannot both exist for the same user.
create unique index if not exists custom_lists_user_name_unique
  on custom_lists (user_id, lower(btrim(name)));

create index if not exists custom_lists_user_created_idx
  on custom_lists (user_id, created_at desc);

create table if not exists custom_list_items (
  list_id uuid not null references custom_lists(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  created_at timestamptz not null default now(),
  primary key (list_id, tmdb_id, media_type),
  constraint custom_list_items_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint custom_list_items_media_type_check
    check (media_type in ('movie', 'tv'))
);

create index if not exists custom_list_items_list_created_idx
  on custom_list_items (list_id, created_at desc);

comment on table custom_lists is
  'User-created personalized lists. Rows are owner-scoped; every read and mutation filters on user_id.';

comment on table custom_list_items is
  'Movies and TV shows saved to a personalized list. Duplicate titles are prevented by the (list_id, tmdb_id, media_type) primary key.';
