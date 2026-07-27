-- The horizontal profile poster (the 16:9 "backdrop" header) is replaced by a
-- circular avatar built from the poster of a title the user picks in search.
-- Both are storage-free: only the TMDB image path and the title are stored.
alter table profiles
  add column if not exists profile_avatar_path text,
  add column if not exists profile_avatar_title text;

comment on column profiles.profile_avatar_path is
  'TMDB poster path of the title the user picked as their circular profile avatar.';

comment on column profiles.profile_avatar_title is
  'Title the avatar poster belongs to, used for the avatar accessible name.';

alter table profiles
  drop column if exists profile_backdrop_path,
  drop column if exists profile_backdrop_title;
