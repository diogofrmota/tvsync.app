/**
 * Parameterized personalized-list queries shared by Neon services and
 * PostgreSQL tests. Every statement takes the owner id as `$1` so a list can
 * only ever be read or mutated by the user who created it, independent of the
 * authorization already enforced in the service layer.
 * User-controlled values must only be supplied through the params array.
 */

export const LIST_OWN_CUSTOM_LISTS_QUERY = `
  select
    lists.id,
    lists.user_id,
    lists.name,
    lists.description,
    lists.created_at,
    lists.updated_at,
    (
      select count(*)::int
      from custom_list_items items
      where items.list_id = lists.id
    ) as item_count
  from custom_lists lists
  where lists.user_id = $1
  order by lists.created_at desc
  limit $2
`;

export const GET_OWN_CUSTOM_LIST_QUERY = `
  select
    lists.id,
    lists.user_id,
    lists.name,
    lists.description,
    lists.created_at,
    lists.updated_at,
    (
      select count(*)::int
      from custom_list_items items
      where items.list_id = lists.id
    ) as item_count
  from custom_lists lists
  where lists.user_id = $1
    and lists.id = $2
  limit 1
`;

export const LIST_OWN_CUSTOM_LIST_ITEMS_QUERY = `
  select
    items.list_id,
    items.tmdb_id,
    items.media_type,
    items.created_at
  from custom_list_items items
  inner join custom_lists lists on lists.id = items.list_id
  where lists.user_id = $1
    and items.list_id = any($2::uuid[])
  order by items.created_at desc
`;

export const INSERT_OWN_CUSTOM_LIST_QUERY = `
  insert into custom_lists (user_id, name, description)
  select $1, $2, $3
  where (
    select count(*) from custom_lists where user_id = $1
  ) < $4
  on conflict (user_id, lower(btrim(name))) do nothing
  returning id, user_id, name, description, created_at, updated_at
`;

export const UPDATE_OWN_CUSTOM_LIST_QUERY = `
  update custom_lists
  set name = $3, description = $4, updated_at = now()
  where user_id = $1
    and id = $2
  returning id, user_id, name, description, created_at, updated_at
`;

export const DELETE_OWN_CUSTOM_LIST_QUERY = `
  delete from custom_lists
  where user_id = $1
    and id = $2
  returning id
`;

export const ADD_OWN_CUSTOM_LIST_ITEM_QUERY = `
  insert into custom_list_items (list_id, tmdb_id, media_type)
  select lists.id, $3, $4
  from custom_lists lists
  where lists.user_id = $1
    and lists.id = $2
    and (
      select count(*) from custom_list_items items where items.list_id = lists.id
    ) < $5
  on conflict (list_id, tmdb_id, media_type) do nothing
  returning list_id, tmdb_id, media_type, created_at
`;

export const REMOVE_OWN_CUSTOM_LIST_ITEM_QUERY = `
  delete from custom_list_items items
  using custom_lists lists
  where lists.id = items.list_id
    and lists.user_id = $1
    and items.list_id = $2
    and items.tmdb_id = $3
    and items.media_type = $4
  returning items.list_id, items.tmdb_id, items.media_type
`;
