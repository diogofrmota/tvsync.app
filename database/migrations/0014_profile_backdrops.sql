alter table profiles
  add column if not exists profile_backdrop_path text,
  add column if not exists profile_backdrop_title text;

comment on column profiles.profile_backdrop_path is
  'TMDB image path selected from a title in the user library for the horizontal profile header.';
