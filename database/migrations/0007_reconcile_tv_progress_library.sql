insert into user_media (
  user_id,
  tmdb_id,
  media_type,
  watch_status,
  date_added,
  last_watched_at,
  privacy_setting,
  created_at,
  updated_at
)
select
  episode_progress.user_id,
  episode_progress.tmdb_show_id,
  'tv',
  case
    when bool_or(episode_progress.watched) then 'watching'
    else 'planned'
  end,
  min(episode_progress.created_at),
  max(episode_progress.watched_at),
  'private',
  min(episode_progress.created_at),
  max(episode_progress.updated_at)
from episode_progress
where episode_progress.season_number > 0
group by episode_progress.user_id, episode_progress.tmdb_show_id
on conflict (user_id, tmdb_id, media_type) do nothing;

comment on table episode_progress is
  'Owner-scoped episode tracking. Season zero/specials are trackable but excluded from overall TV library progress and status derivation.';
