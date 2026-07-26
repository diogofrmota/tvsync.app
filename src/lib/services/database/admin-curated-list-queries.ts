/**
 * Parameterized admin-curated-list queries shared by the Neon service and the
 * PostgreSQL tests. Keep all admin-supplied values in the params array passed
 * to `query()`; identifiers are never interpolated.
 */

export const ADMIN_CREATE_CURATED_LIST_QUERY = `
  insert into admin_curated_lists (name, description)
  values ($1, $2)
  returning id, name, description, created_at
`;

export const ADMIN_DELETE_CURATED_LIST_QUERY = `
  delete from admin_curated_lists
  where id = $1
  returning id, name
`;

/**
 * One read for the whole panel: every list with its items aggregated into a
 * JSON array, so opening the dashboard costs a single round trip rather than
 * one query per list.
 */
export const ADMIN_SELECT_CURATED_LISTS_QUERY = `
  select
    l.id,
    l.name,
    l.description,
    l.active,
    l.show_on_home,
    l.show_on_explore,
    l.position,
    l.created_at,
    coalesce(
      (
        select json_agg(
          json_build_object(
            'tmdb_id', i.tmdb_id,
            'media_type', i.media_type,
            'title', i.title,
            'poster_path', i.poster_path
          )
          order by i.position asc, i.created_at asc
        )
        from admin_curated_list_items i
        where i.list_id = l.id
      ),
      '[]'::json
    ) as items
  from admin_curated_lists l
  order by l.position asc, l.created_at desc
  limit $1
`;

/**
 * The public read behind Home and Explore: only published lists, only the
 * columns a rail renders, and the titles in their stored order. Everything a
 * rail needs was captured when the admin added the entry, so showing a curated
 * list costs no TMDB request.
 */
export const SELECT_PUBLIC_CURATED_LISTS_QUERY = `
  select
    l.id,
    l.name,
    l.description,
    l.show_on_home,
    l.show_on_explore,
    l.position,
    coalesce(
      (
        select json_agg(
          json_build_object(
            'tmdb_id', i.tmdb_id,
            'media_type', i.media_type,
            'title', i.title,
            'poster_path', i.poster_path
          )
          order by i.position asc, i.created_at asc
        )
        from admin_curated_list_items i
        where i.list_id = l.id
      ),
      '[]'::json
    ) as items
  from admin_curated_lists l
  where l.active
  order by l.position asc, l.created_at desc
`;

/**
 * Placement is saved for the whole table at once so a reorder can never be
 * observed half-applied by Home or Explore.
 */
export const ADMIN_UPDATE_CURATED_LIST_PLACEMENT_QUERY = `
  update admin_curated_lists
  set
    active = $2,
    show_on_home = $3,
    show_on_explore = $4,
    position = $5,
    updated_at = now()
  where id = $1
`;

/**
 * Adding the same title twice is a no-op rather than an error: the dashboard
 * search can legitimately surface a title that is already on the list, and the
 * primary key is what makes that idempotent.
 */
export const ADMIN_ADD_CURATED_LIST_ITEM_QUERY = `
  insert into admin_curated_list_items (
    list_id,
    tmdb_id,
    media_type,
    title,
    poster_path,
    position
  )
  select
    $1::uuid,
    $2::integer,
    $3::text,
    $4::text,
    $5::text,
    coalesce(
      (
        select max(position) + 1
        from admin_curated_list_items
        where list_id = $1::uuid
      ),
      0
    )
  on conflict (list_id, tmdb_id, media_type) do nothing
  returning list_id
`;

export const ADMIN_REMOVE_CURATED_LIST_ITEM_QUERY = `
  delete from admin_curated_list_items
  where list_id = $1 and tmdb_id = $2 and media_type = $3
  returning list_id
`;

export const ADMIN_TOUCH_CURATED_LIST_QUERY = `
  update admin_curated_lists
  set updated_at = now()
  where id = $1
  returning id, name
`;
