-- Admin-curated lists: hand-picked collections of movies and TV shows built in
-- the /admin dashboard by searching TMDB and adding titles one at a time.
--
-- These are global editorial lists owned by the operator, not the per-user
-- personalized lists that were removed from the product; they never reference
-- `profiles` and are managed only from the credential-gated dashboard.
create table if not exists admin_curated_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_curated_lists_name_check
    check (length(btrim(name)) between 1 and 80),
  constraint admin_curated_lists_description_check
    check (length(description) <= 280)
);

-- One list name overall, compared case-insensitively, so "Staff Picks" and
-- "staff picks" cannot both exist.
create unique index if not exists admin_curated_lists_name_unique
  on admin_curated_lists (lower(btrim(name)));

create index if not exists admin_curated_lists_created_at_idx
  on admin_curated_lists (created_at desc);

create table if not exists admin_curated_list_items (
  list_id uuid not null references admin_curated_lists(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  title text not null default '',
  poster_path text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (list_id, tmdb_id, media_type),
  constraint admin_curated_list_items_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint admin_curated_list_items_media_type_check
    check (media_type in ('movie', 'tv')),
  constraint admin_curated_list_items_position_check
    check (position >= 0)
);

-- A list is always read in its own display order.
create index if not exists admin_curated_list_items_list_position_idx
  on admin_curated_list_items (list_id, position, created_at);

comment on table admin_curated_lists is
  'Operator-curated collections built from /admin. Global, not per user; the removed custom_lists tables are unrelated and stay unused.';

comment on table admin_curated_list_items is
  'Titles saved to an admin-curated list. Duplicates are prevented by the (list_id, tmdb_id, media_type) primary key.';

comment on column admin_curated_list_items.title is
  'The TMDB title captured when the item was added, so the dashboard can list the entry without a TMDB call per row.';
