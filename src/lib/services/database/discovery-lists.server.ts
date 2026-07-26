import 'server-only';

import {
  DEFAULT_DISCOVERY_LIST_SETTINGS,
  DISCOVERY_LIST_ITEM_LIMIT,
  DISCOVERY_LIST_REFRESH_HOURS,
  type DiscoveryListSetting,
  isDiscoveryRailKey,
} from 'lib/pages/media/discovery-rails';
import { revalidateTag, unstable_cache } from 'next/cache';

import { getDatabaseSql } from './core.server';
import { SELECT_DISCOVERY_LIST_SETTINGS_QUERY } from './discovery-list-queries';

type DiscoveryListSettingRow = {
  active: boolean;
  cache_epoch: number;
  item_limit: number;
  list_key: string;
  position: number;
  refresh_interval_hours: number;
  refreshed_at: Date | string | null;
  show_on_explore: boolean;
  show_on_home: boolean;
};

export const DISCOVERY_LIST_SETTINGS_TAG = 'discovery-list-settings';

/**
 * The whole audience shares one configuration, so this read is cached for the
 * whole app rather than per request. The window is short and every dashboard
 * save busts the tag, so a change is live within a second while a steady state
 * costs roughly one query per five minutes no matter how much traffic arrives.
 */
const DISCOVERY_LIST_SETTINGS_REVALIDATE_SECONDS = 300;

const clamp = (value: number, bounds: { max: number; min: number }) =>
  Math.min(bounds.max, Math.max(bounds.min, value));

const toIsoString = (value: Date | string | null) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mapSettingRow = (row: DiscoveryListSettingRow): DiscoveryListSetting => ({
  active: row.active,
  cacheEpoch: Math.max(0, Math.trunc(Number(row.cache_epoch) || 0)),
  itemLimit: clamp(
    Math.trunc(Number(row.item_limit) || 0),
    DISCOVERY_LIST_ITEM_LIMIT
  ),
  key: row.list_key as DiscoveryListSetting['key'],
  position: Math.max(0, Math.trunc(Number(row.position) || 0)),
  refreshIntervalHours: clamp(
    Math.trunc(Number(row.refresh_interval_hours) || 0),
    DISCOVERY_LIST_REFRESH_HOURS
  ),
  refreshedAt: toIsoString(row.refreshed_at),
  showOnExplore: row.show_on_explore,
  showOnHome: row.show_on_home,
});

const readDiscoveryListSettings = async (): Promise<
  Array<DiscoveryListSetting>
> => {
  const sql = getDatabaseSql();
  const rows = (await sql.query(
    SELECT_DISCOVERY_LIST_SETTINGS_QUERY
  )) as Array<DiscoveryListSettingRow>;

  return rows
    .filter((row) => isDiscoveryRailKey(row.list_key))
    .map(mapSettingRow);
};

const cachedDiscoveryListSettings = unstable_cache(
  readDiscoveryListSettings,
  ['discovery-list-settings'],
  {
    revalidate: DISCOVERY_LIST_SETTINGS_REVALIDATE_SECONDS,
    tags: [DISCOVERY_LIST_SETTINGS_TAG],
  }
);

/**
 * Every known list, with the stored configuration applied over the shipped
 * defaults. A list that has no row yet — or a database that cannot be reached —
 * falls back to its default instead of disappearing from Home and Explore, so
 * discovery survives a Neon outage. Failures are deliberately not cached.
 */
export const loadDiscoveryListSettings = async (): Promise<
  Array<DiscoveryListSetting>
> => {
  const stored = await cachedDiscoveryListSettings().catch((error) => {
    console.error('Failed to load discovery list settings:', error);
    return [] as Array<DiscoveryListSetting>;
  });
  const storedByKey = new Map(stored.map((setting) => [setting.key, setting]));

  return DEFAULT_DISCOVERY_LIST_SETTINGS.map(
    (fallback) => storedByKey.get(fallback.key) ?? { ...fallback }
  );
};

export const revalidateDiscoveryListSettings = () => {
  revalidateTag(DISCOVERY_LIST_SETTINGS_TAG, 'max');
};
