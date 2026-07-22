export const SET_OWN_MOVIE_LIBRARY_STATUS_QUERY = `
  insert into user_media (
    user_id,
    tmdb_id,
    media_type,
    watch_status,
    last_watched_at,
    privacy_setting
  )
  values ($1, $2, 'movie', $3, $4, 'private')
  on conflict (user_id, tmdb_id, media_type) do update set
    watch_status = excluded.watch_status,
    last_watched_at = excluded.last_watched_at,
    updated_at = now()
  returning *
`;

export const REMOVE_OWN_LIBRARY_ITEM_QUERY = `
  with removed_media as (
    delete from user_media
    where user_id = $1
      and tmdb_id = $2
      and media_type = $3
    returning id
  ),
  removed_watchlist as (
    delete from watchlist_items
    where user_id = $1
      and tmdb_id = $2
      and media_type = $3
    returning id
  )
  select
    (select count(*) from removed_media)::int
    + (select count(*) from removed_watchlist)::int as removed_count
`;

export const ADD_OWN_LIBRARY_ITEM_QUERY = `
  with saved_watchlist as (
    insert into watchlist_items (user_id, tmdb_id, media_type, note)
    values ($1, $2, $3, $4)
    on conflict (user_id, tmdb_id, media_type) do update set
      note = excluded.note,
      updated_at = now()
    returning id
  )
  insert into user_media (
    user_id,
    tmdb_id,
    media_type,
    watch_status,
    privacy_setting
  )
  values ($1, $2, $3, 'planned', 'private')
  on conflict (user_id, tmdb_id, media_type) do nothing
  returning *
`;
