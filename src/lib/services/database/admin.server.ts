import 'server-only';

import {
  DISCOVERY_LIST_ITEM_LIMIT,
  DISCOVERY_LIST_REFRESH_HOURS,
  type DiscoveryListSetting,
  type DiscoveryRailKey,
  discoveryListCacheTag,
  isDiscoveryRailKey,
} from 'lib/pages/media/discovery-rails';
import { MediaType, type TrackableMediaType } from 'lib/types';
import { revalidateTag, unstable_cache } from 'next/cache';

import {
  ADMIN_ADD_CURATED_LIST_ITEM_QUERY,
  ADMIN_CREATE_CURATED_LIST_QUERY,
  ADMIN_DELETE_CURATED_LIST_QUERY,
  ADMIN_REMOVE_CURATED_LIST_ITEM_QUERY,
  ADMIN_SELECT_CURATED_LISTS_QUERY,
  ADMIN_TOUCH_CURATED_LIST_QUERY,
  ADMIN_UPDATE_CURATED_LIST_PLACEMENT_QUERY,
} from './admin-curated-list-queries';
import {
  ADMIN_ACCOUNT_STATS_QUERY,
  ADMIN_ACTIVE_USERS_QUERY,
  ADMIN_BAN_USER_QUERY,
  ADMIN_FIND_USER_QUERY,
  ADMIN_INSERT_AUDIT_LOG_QUERY,
  ADMIN_PURGE_AUDIT_LOG_QUERY,
  ADMIN_RECENT_AUDIT_LOG_QUERY,
  ADMIN_RECENT_BANS_QUERY,
  ADMIN_UNBAN_USER_QUERY,
} from './admin-queries';
import { revalidateSessionVersion } from './auth.server';
import { getDatabaseAvailabilityIssue, getDatabaseSql } from './core.server';
import { revalidateCuratedLists } from './curated-lists.server';
import {
  BUMP_ALL_DISCOVERY_LIST_CACHE_EPOCHS_QUERY,
  BUMP_DISCOVERY_LIST_CACHE_EPOCH_QUERY,
  UPSERT_DISCOVERY_LIST_SETTING_QUERY,
} from './discovery-list-queries';
import { revalidateDiscoveryListSettings } from './discovery-lists.server';
import { countAnalyticsOptOuts } from './privacy.server';

export type AdminOverviewStats = {
  activeUsersLast30Days: number;
  activeUsersPrevious30Days: number;
  bannedUsers: number;
  signupsLastMonth: number;
  signupsPrevious30Days: number;
  totalUsers: number;
};

export type AdminUserRecord = {
  banReason: string;
  bannedAt: string | null;
  createdAt: string | null;
  email: string;
  emailVerifiedAt: string | null;
  episodesWatched: number;
  libraryItems: number;
  privacySetting: string;
  providers: string;
  ratings: number;
  userId: string;
  username: string;
};

export type AdminBanRecord = {
  banReason: string;
  bannedAt: string | null;
  email: string;
  userId: string;
  username: string;
};

export type AdminAuditEntry = {
  action: string;
  actor: string;
  createdAt: string | null;
  details: string;
  id: string;
  target: string;
};

export type AdminLoadResult<Data> = {
  data: Data | null;
  error: string | null;
};

export type DiscoveryListSettingInput = Pick<
  DiscoveryListSetting,
  | 'active'
  | 'itemLimit'
  | 'key'
  | 'position'
  | 'refreshIntervalHours'
  | 'showOnExplore'
  | 'showOnHome'
>;

const ADMIN_OVERVIEW_STATS_TAG = 'admin-overview-stats';

/**
 * The dashboard counts accounts exactly, which on a large `profiles` table is
 * the most expensive read on the page. One shared cached result keeps repeated
 * loads and refreshes from re-running it, and the dashboard has an explicit
 * refresh control for when a live number is wanted.
 */
const ADMIN_OVERVIEW_STATS_REVALIDATE_SECONDS = 60;

const toCount = (value: unknown) => {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

const toIsoString = (value: unknown) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toText = (value: unknown) => (typeof value === 'string' ? value : '');

const describeError = (error: unknown) => {
  const issue = getDatabaseAvailabilityIssue(error);

  if (issue) {
    return `${issue.title}. ${issue.description}`;
  }

  return error instanceof Error
    ? error.message
    : 'The database request could not be completed.';
};

const loadAdminData = async <Data>(
  load: () => Promise<Data>
): Promise<AdminLoadResult<Data>> => {
  try {
    return { data: await load(), error: null };
  } catch (error) {
    console.error('Admin dashboard query failed:', error);

    return { data: null, error: describeError(error) };
  }
};

const readOverviewStats = async (): Promise<AdminOverviewStats> => {
  const sql = getDatabaseSql();
  const [accounts, active] = await Promise.all([
    sql.query(ADMIN_ACCOUNT_STATS_QUERY),
    sql.query(ADMIN_ACTIVE_USERS_QUERY),
  ]);
  const accountRow = (accounts as Array<Record<string, unknown>>).at(0) ?? {};
  const activeRow = (active as Array<Record<string, unknown>>).at(0) ?? {};

  return {
    activeUsersLast30Days: toCount(activeRow.active_users),
    activeUsersPrevious30Days: toCount(activeRow.previous_active_users),
    bannedUsers: toCount(accountRow.banned_users),
    signupsLastMonth: toCount(accountRow.signups_last_month),
    signupsPrevious30Days: toCount(accountRow.signups_previous_month),
    totalUsers: toCount(accountRow.total_users),
  };
};

const cachedOverviewStats = unstable_cache(
  readOverviewStats,
  ['admin-overview-stats'],
  {
    revalidate: ADMIN_OVERVIEW_STATS_REVALIDATE_SECONDS,
    tags: [ADMIN_OVERVIEW_STATS_TAG],
  }
);

export const loadAdminOverviewStats = () => loadAdminData(cachedOverviewStats);

export const revalidateAdminOverviewStats = () => {
  revalidateTag(ADMIN_OVERVIEW_STATS_TAG, 'max');
};

const mapUserRow = (row: Record<string, unknown>): AdminUserRecord => ({
  banReason: toText(row.ban_reason),
  bannedAt: toIsoString(row.banned_at),
  createdAt: toIsoString(row.created_at),
  email: toText(row.email),
  emailVerifiedAt: toIsoString(row.email_verified_at),
  episodesWatched: toCount(row.episodes_watched),
  libraryItems: toCount(row.library_items),
  privacySetting: toText(row.privacy_setting),
  providers: toText(row.providers) || 'none',
  ratings: toCount(row.ratings),
  userId: toText(row.user_id),
  username: toText(row.username),
});

export const findAdminUser = (identifier: string) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_FIND_USER_QUERY, [
      identifier,
    ])) as Array<Record<string, unknown>>;
    const row = rows.at(0);

    return row ? mapUserRow(row) : null;
  });

/**
 * Bans block future sign-ins and revoke live sessions in one step: the query
 * rotates `session_version`, and busting the cached version makes every issued
 * token fail its next check instead of lingering for the cache window.
 */
export const banAdminUser = (input: { identifier: string; reason: string }) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_BAN_USER_QUERY, [
      input.identifier,
      input.reason,
    ])) as Array<Record<string, unknown>>;
    const row = rows.at(0);

    if (!row) {
      return null;
    }

    revalidateSessionVersion(toText(row.user_id));

    return {
      banReason: toText(row.ban_reason),
      bannedAt: toIsoString(row.banned_at),
      email: toText(row.email),
      userId: toText(row.user_id),
      username: toText(row.username),
    } satisfies AdminBanRecord;
  });

export const unbanAdminUser = (identifier: string) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_UNBAN_USER_QUERY, [
      identifier,
    ])) as Array<Record<string, unknown>>;
    const row = rows.at(0);

    if (!row) {
      return null;
    }

    revalidateSessionVersion(toText(row.user_id));

    return {
      email: toText(row.email),
      userId: toText(row.user_id),
      username: toText(row.username),
    };
  });

export const listRecentBans = (limit: number) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_RECENT_BANS_QUERY, [limit])) as Array<
      Record<string, unknown>
    >;

    return rows.map(
      (row): AdminBanRecord => ({
        banReason: toText(row.ban_reason),
        bannedAt: toIsoString(row.banned_at),
        email: toText(row.email),
        userId: toText(row.user_id),
        username: toText(row.username),
      })
    );
  });

const clampSetting = (value: number, bounds: { max: number; min: number }) =>
  Math.min(bounds.max, Math.max(bounds.min, Math.trunc(value) || bounds.min));

/**
 * Saves the whole list configuration in one transaction so Home and Explore can
 * never observe half of a reordering, then busts the shared settings cache.
 */
export const saveDiscoveryListSettings = (
  settings: ReadonlyArray<DiscoveryListSettingInput>
) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();

    await sql.transaction((tx) =>
      settings.map((setting, index) =>
        tx.query(UPSERT_DISCOVERY_LIST_SETTING_QUERY, [
          setting.key,
          setting.active,
          setting.showOnHome,
          setting.showOnExplore,
          Math.max(0, Math.trunc(setting.position) || index),
          clampSetting(setting.itemLimit, DISCOVERY_LIST_ITEM_LIMIT),
          clampSetting(
            setting.refreshIntervalHours,
            DISCOVERY_LIST_REFRESH_HOURS
          ),
        ])
      )
    );

    revalidateDiscoveryListSettings();

    return settings.length;
  });

/**
 * Forces the next read of a list to come from TMDB. The stored cache epoch and
 * the purged tag do the same job at two layers, which keeps the refresh honest
 * whether the cached copy lives in the Data Cache or in the fetch cache.
 */
export const refreshDiscoveryList = (key: DiscoveryRailKey) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    await sql.query(BUMP_DISCOVERY_LIST_CACHE_EPOCH_QUERY, [key]);

    revalidateTag(discoveryListCacheTag(key), 'max');
    revalidateDiscoveryListSettings();

    return key;
  });

export const refreshAllDiscoveryLists = () =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(
      BUMP_ALL_DISCOVERY_LIST_CACHE_EPOCHS_QUERY
    )) as Array<{ list_key: string }>;

    for (const row of rows) {
      if (isDiscoveryRailKey(row.list_key)) {
        revalidateTag(discoveryListCacheTag(row.list_key), 'max');
      }
    }

    revalidateDiscoveryListSettings();

    return rows.length;
  });

export type AdminCuratedListItem = {
  mediaType: TrackableMediaType;
  posterPath: string | null;
  title: string;
  tmdbId: number;
};

export type AdminCuratedList = {
  active: boolean;
  createdAt: string | null;
  description: string;
  id: string;
  items: Array<AdminCuratedListItem>;
  name: string;
  position: number;
  showOnExplore: boolean;
  showOnHome: boolean;
};

/** The placement fields the dashboard saves for the whole table at once. */
export type AdminCuratedListPlacementInput = Pick<
  AdminCuratedList,
  'active' | 'id' | 'position' | 'showOnExplore' | 'showOnHome'
>;

export type AdminCuratedListItemInput = AdminCuratedListItem & {
  listId: string;
};

const toCuratedItem = (value: unknown): Array<AdminCuratedListItem> => {
  const rows = Array.isArray(value) ? value : [];

  return rows.flatMap((row) => {
    if (!(row && typeof row === 'object')) {
      return [];
    }

    const item = row as Record<string, unknown>;
    const mediaType = toText(item.media_type);

    if (!(mediaType === MediaType.Movie || mediaType === MediaType.Tv)) {
      return [];
    }

    return [
      {
        mediaType,
        posterPath: toText(item.poster_path) || null,
        title: toText(item.title),
        tmdbId: toCount(item.tmdb_id),
      },
    ];
  });
};

export const listAdminCuratedLists = (limit: number) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_SELECT_CURATED_LISTS_QUERY, [
      limit,
    ])) as Array<Record<string, unknown>>;

    return rows.map(
      (row): AdminCuratedList => ({
        active: row.active === true,
        createdAt: toIsoString(row.created_at),
        description: toText(row.description),
        id: toText(row.id),
        items: toCuratedItem(row.items),
        name: toText(row.name),
        position: toCount(row.position),
        showOnExplore: row.show_on_explore === true,
        showOnHome: row.show_on_home === true,
      })
    );
  });

/**
 * Saves every list's placement in one transaction so a reorder can never be
 * observed half-applied by Home or Explore, then busts the shared public cache.
 */
export const saveAdminCuratedListPlacement = (
  placements: ReadonlyArray<AdminCuratedListPlacementInput>
) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();

    await sql.transaction((tx) =>
      placements.map((placement, index) =>
        tx.query(ADMIN_UPDATE_CURATED_LIST_PLACEMENT_QUERY, [
          placement.id,
          placement.active,
          placement.showOnHome,
          placement.showOnExplore,
          Math.max(0, Math.trunc(placement.position) || index),
        ])
      )
    );

    revalidateCuratedLists();

    return placements.length;
  });

export const createAdminCuratedList = (input: {
  description: string;
  name: string;
}) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_CREATE_CURATED_LIST_QUERY, [
      input.name,
      input.description,
    ])) as Array<Record<string, unknown>>;
    const row = rows.at(0);

    return row ? { id: toText(row.id), name: toText(row.name) } : null;
  });

export const deleteAdminCuratedList = (listId: string) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_DELETE_CURATED_LIST_QUERY, [
      listId,
    ])) as Array<Record<string, unknown>>;
    const row = rows.at(0);

    if (row) {
      revalidateCuratedLists();
    }

    return row ? { id: toText(row.id), name: toText(row.name) } : null;
  });

/**
 * Adding a title already on the list is a no-op, so the caller reports the
 * outcome from whether a row came back rather than from an error.
 */
export const addAdminCuratedListItem = (input: AdminCuratedListItemInput) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const listRows = (await sql.query(ADMIN_TOUCH_CURATED_LIST_QUERY, [
      input.listId,
    ])) as Array<Record<string, unknown>>;
    const list = listRows.at(0);

    if (!list) {
      return null;
    }

    const rows = (await sql.query(ADMIN_ADD_CURATED_LIST_ITEM_QUERY, [
      input.listId,
      input.tmdbId,
      input.mediaType,
      input.title.slice(0, 200),
      input.posterPath ?? '',
    ])) as Array<unknown>;

    if (rows.length > 0) {
      revalidateCuratedLists();
    }

    return { added: rows.length > 0, listName: toText(list.name) };
  });

export const removeAdminCuratedListItem = (input: {
  listId: string;
  mediaType: TrackableMediaType;
  tmdbId: number;
}) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_REMOVE_CURATED_LIST_ITEM_QUERY, [
      input.listId,
      input.tmdbId,
      input.mediaType,
    ])) as Array<unknown>;

    if (rows.length > 0) {
      revalidateCuratedLists();
    }

    return rows.length > 0;
  });

/**
 * Audit writes must never fail an admin action that already succeeded, so a
 * logging error is reported to the server log and swallowed.
 */
export const recordAdminAudit = async (input: {
  action: string;
  actor: string;
  details?: string;
  ipDigest?: string;
  target?: string;
}) => {
  try {
    const sql = getDatabaseSql();
    await sql.query(ADMIN_INSERT_AUDIT_LOG_QUERY, [
      input.actor.slice(0, 120),
      input.action.slice(0, 60),
      (input.target ?? '').slice(0, 200),
      (input.details ?? '').slice(0, 500),
      input.ipDigest ?? '',
    ]);
  } catch (error) {
    console.error('Failed to record an admin audit entry:', error);
  }
};

export const listAdminAuditLog = (limit: number) =>
  loadAdminData(async () => {
    const sql = getDatabaseSql();
    const rows = (await sql.query(ADMIN_RECENT_AUDIT_LOG_QUERY, [
      limit,
    ])) as Array<Record<string, unknown>>;

    return rows.map(
      (row): AdminAuditEntry => ({
        action: toText(row.action),
        actor: toText(row.actor),
        createdAt: toIsoString(row.created_at),
        details: toText(row.details),
        id: toText(row.id),
        target: toText(row.target),
      })
    );
  });

/**
 * How long the audit trail is kept before the nightly cleanup cron drops it.
 * The dashboard states the number so a data-retention question can be answered
 * from the product rather than from the migration file.
 */
export const ADMIN_AUDIT_LOG_RETENTION_DAYS = 90;

export type AdminPrivacySummary = {
  analyticsOptOuts: number;
  auditLogRetentionDays: number;
};

/**
 * The compliance counters behind the dashboard's privacy panel: how many
 * accounts have exercised their objection/opt-out right, and how long the one
 * log of personal-data-adjacent activity is kept.
 */
export const loadAdminPrivacySummary = () =>
  loadAdminData(
    async (): Promise<AdminPrivacySummary> => ({
      analyticsOptOuts: await countAnalyticsOptOuts(),
      auditLogRetentionDays: ADMIN_AUDIT_LOG_RETENTION_DAYS,
    })
  );

export const purgeExpiredAdminAuditEntries = async () => {
  const sql = getDatabaseSql();
  const rows = (await sql.query(ADMIN_PURGE_AUDIT_LOG_QUERY)) as Array<unknown>;

  return rows.length;
};
