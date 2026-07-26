/**
 * Parameterized discovery-list queries shared by the Neon service and the
 * PostgreSQL tests. Keep all admin-supplied values in the params array.
 */
export const SELECT_DISCOVERY_LIST_SETTINGS_QUERY = `
  select
    list_key,
    active,
    show_on_home,
    show_on_explore,
    position,
    item_limit,
    refresh_interval_hours,
    cache_epoch,
    refreshed_at
  from discovery_list_settings
  order by position asc, list_key asc
`;

export const UPSERT_DISCOVERY_LIST_SETTING_QUERY = `
  insert into discovery_list_settings (
    list_key,
    active,
    show_on_home,
    show_on_explore,
    position,
    item_limit,
    refresh_interval_hours
  )
  values ($1, $2, $3, $4, $5, $6, $7)
  on conflict (list_key) do update
  set
    active = excluded.active,
    show_on_home = excluded.show_on_home,
    show_on_explore = excluded.show_on_explore,
    position = excluded.position,
    item_limit = excluded.item_limit,
    refresh_interval_hours = excluded.refresh_interval_hours,
    updated_at = now()
`;

/**
 * The manual "fetch now": a new cache epoch changes the Data Cache key for the
 * list, so the next read misses and repopulates it from TMDB. No process-local
 * cache handle is involved, which is what makes it work across every serverless
 * instance at once.
 */
export const BUMP_DISCOVERY_LIST_CACHE_EPOCH_QUERY = `
  insert into discovery_list_settings (list_key, cache_epoch, refreshed_at)
  values ($1, 1, now())
  on conflict (list_key) do update
  set
    cache_epoch = discovery_list_settings.cache_epoch + 1,
    refreshed_at = now(),
    updated_at = now()
  returning list_key
`;

export const BUMP_ALL_DISCOVERY_LIST_CACHE_EPOCHS_QUERY = `
  update discovery_list_settings
  set
    cache_epoch = cache_epoch + 1,
    refreshed_at = now(),
    updated_at = now()
  returning list_key
`;
