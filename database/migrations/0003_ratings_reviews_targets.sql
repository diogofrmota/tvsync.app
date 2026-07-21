alter table ratings
  drop constraint if exists ratings_user_tmdb_media_unique,
  drop constraint if exists ratings_media_type_check,
  drop constraint if exists ratings_rating_range_check;

alter table ratings
  add column if not exists season_number integer,
  add column if not exists episode_number integer;

update ratings
set
  season_number = coalesce(season_number, -1),
  episode_number = coalesce(episode_number, -1);

alter table ratings
  alter column rating type numeric(3, 1) using rating::numeric(3, 1),
  alter column season_number set default -1,
  alter column season_number set not null,
  alter column episode_number set default -1,
  alter column episode_number set not null;

alter table ratings
  add constraint ratings_media_type_check
    check (media_type in ('movie', 'tv', 'tv_season', 'tv_episode')),
  add constraint ratings_rating_range_check
    check (rating between 1 and 10 and rating * 2 = floor(rating * 2)),
  add constraint ratings_target_shape_check
    check (
      (media_type in ('movie', 'tv') and season_number = -1 and episode_number = -1)
      or
      (media_type = 'tv_season' and season_number >= 0 and episode_number = -1)
      or
      (media_type = 'tv_episode' and season_number >= 0 and episode_number > 0)
    );

drop index if exists ratings_media_lookup_idx;

create index if not exists ratings_media_lookup_idx
  on ratings (tmdb_id, media_type, season_number, episode_number);

alter table ratings
  add constraint ratings_user_target_unique
    unique (user_id, tmdb_id, media_type, season_number, episode_number);
