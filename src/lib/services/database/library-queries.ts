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

export const SET_OWN_TV_LIBRARY_STATE_QUERY = `
  with provided_progress as (
    select season_number, episode_number, watched
    from jsonb_to_recordset($4::jsonb) as episode(
      season_number integer,
      episode_number integer,
      watched boolean
    )
  ),
  saved_progress as (
    insert into episode_progress (
      user_id,
      tmdb_show_id,
      season_number,
      episode_number,
      watched,
      watched_at
    )
    select
      $1,
      $2,
      provided_progress.season_number,
      provided_progress.episode_number,
      provided_progress.watched,
      case when provided_progress.watched then now() else null end
    from provided_progress
    on conflict (user_id, tmdb_show_id, season_number, episode_number) do update set
      watched = excluded.watched,
      watched_at = case
        when excluded.watched and episode_progress.watched
          then episode_progress.watched_at
        when excluded.watched then now()
        else null
      end,
      updated_at = now()
    returning id
  )
  insert into user_media (
    user_id,
    tmdb_id,
    media_type,
    watch_status,
    last_watched_at,
    privacy_setting
  )
  values ($1, $2, 'tv', $3, $5, 'private')
  on conflict (user_id, tmdb_id, media_type) do update set
    watch_status = excluded.watch_status,
    last_watched_at = excluded.last_watched_at,
    updated_at = now()
  returning *
`;

export const SET_OWN_EPISODE_PROGRESS_BATCH_QUERY = `
  with provided_progress as (
    select season_number, episode_number, watched
    from jsonb_to_recordset($3::jsonb) as episode(
      season_number integer,
      episode_number integer,
      watched boolean
    )
  )
  insert into episode_progress (
    user_id,
    tmdb_show_id,
    season_number,
    episode_number,
    watched,
    watched_at
  )
  select
    $1,
    $2,
    provided_progress.season_number,
    provided_progress.episode_number,
    provided_progress.watched,
    case when provided_progress.watched then now() else null end
  from provided_progress
  on conflict (user_id, tmdb_show_id, season_number, episode_number) do update set
    watched = excluded.watched,
    watched_at = case
      when excluded.watched and episode_progress.watched
        then episode_progress.watched_at
      when excluded.watched then now()
      else null
    end,
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
  ),
  removed_tv_progress as (
    delete from episode_progress
    where user_id = $1
      and tmdb_show_id = $2
      and $3 = 'tv'
    returning id
  )
  select
    (select count(*) from removed_media)::int
    + (select count(*) from removed_watchlist)::int
    + (select count(*) from removed_tv_progress)::int as removed_count
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
