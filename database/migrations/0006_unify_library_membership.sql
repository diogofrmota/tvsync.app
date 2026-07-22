insert into user_media (
  user_id,
  tmdb_id,
  media_type,
  watch_status,
  date_added,
  privacy_setting,
  created_at,
  updated_at
)
select
  watchlist_items.user_id,
  watchlist_items.tmdb_id,
  watchlist_items.media_type,
  'planned',
  watchlist_items.date_added,
  'private',
  watchlist_items.created_at,
  watchlist_items.updated_at
from watchlist_items
on conflict (user_id, tmdb_id, media_type) do nothing;

comment on table user_media is
  'Canonical per-user library membership and status. Legacy watchlist rows are retained for compatibility while callers migrate to this aggregate.';
