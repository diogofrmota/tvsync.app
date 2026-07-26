import 'server-only';

import { cache } from 'react';

import { revalidateSessionVersion } from './auth.server';
import { getDatabaseSql } from './core.server';
import {
  COUNT_ANALYTICS_OPT_OUTS_QUERY,
  DELETE_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY,
  EXPORT_ACCOUNT_QUERY,
  EXPORT_EPISODE_PROGRESS_QUERY,
  EXPORT_FAVORITES_QUERY,
  EXPORT_FOLLOWERS_QUERY,
  EXPORT_FOLLOWING_QUERY,
  EXPORT_LIBRARY_QUERY,
  EXPORT_RATINGS_QUERY,
  EXPORT_SIGN_IN_METHODS_QUERY,
  EXPORT_WATCHLIST_QUERY,
  FIND_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY,
  GET_PRIVACY_PREFERENCES_QUERY,
  UPDATE_PRIVACY_PREFERENCES_QUERY,
} from './privacy-queries';
import { getAuthenticatedUserId } from './tracking.server';

/** The account-level privacy choices a user can make about their own data. */
export type PrivacyPreferences = {
  analyticsOptOut: boolean;
  updatedAt: string | null;
};

/**
 * Everything TvSync stores about one account, in the machine-readable shape a
 * GDPR Art. 15/20 access-and-portability request is answered with. Password
 * hashes, one-time token digests, and rate-limit counters are deliberately
 * absent: they are security records, not data the subject supplied.
 */
export type PersonalDataExport = {
  account: Record<string, unknown> | null;
  episodeProgress: Array<Record<string, unknown>>;
  exportedAt: string;
  favourites: Array<Record<string, unknown>>;
  followers: Array<Record<string, unknown>>;
  following: Array<Record<string, unknown>>;
  format: string;
  library: Array<Record<string, unknown>>;
  ratings: Array<Record<string, unknown>>;
  signInMethods: Array<Record<string, unknown>>;
  watchlist: Array<Record<string, unknown>>;
};

export type PrivacyRequestAccount = {
  email: string;
  userId: string;
  username: string;
};

const EXPORT_FORMAT = 'tvsync.personal-data-export.v1';

const toRows = (value: unknown) =>
  Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

const toBoolean = (value: unknown) => value === true || value === 'true';

const toIsoString = (value: unknown) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const readPrivacyPreferences = async (
  userId: string
): Promise<PrivacyPreferences> => {
  const sql = getDatabaseSql();
  const rows = toRows(await sql.query(GET_PRIVACY_PREFERENCES_QUERY, [userId]));
  const row = rows.at(0);

  return {
    analyticsOptOut: toBoolean(row?.analytics_opt_out),
    updatedAt: toIsoString(row?.privacy_choices_updated_at),
  };
};

/**
 * Memoized per request: the root layout reads this on every signed-in render to
 * decide whether the analytics script may load, and Edit Profile reads it again
 * to fill the form. One request should cost one query.
 */
export const getOwnPrivacyPreferences = cache(async () =>
  readPrivacyPreferences(await getAuthenticatedUserId())
);

export const updateOwnPrivacyPreferences = async (input: {
  analyticsOptOut: boolean;
}): Promise<PrivacyPreferences> => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = toRows(
    await sql.query(UPDATE_PRIVACY_PREFERENCES_QUERY, [
      userId,
      input.analyticsOptOut,
    ])
  );
  const row = rows.at(0);

  return {
    analyticsOptOut: toBoolean(row?.analytics_opt_out),
    updatedAt: toIsoString(row?.privacy_choices_updated_at),
  };
};

/**
 * Reads every personal row belonging to one account. The caller is responsible
 * for authorization: `exportOwnPersonalData` derives the id from the session,
 * and the admin path derives it from a verified admin session plus the account
 * the request names.
 */
const buildPersonalDataExport = async (
  userId: string
): Promise<PersonalDataExport> => {
  const sql = getDatabaseSql();
  const [
    account,
    signInMethods,
    library,
    episodeProgress,
    ratings,
    favourites,
    watchlist,
    following,
    followers,
  ] = await Promise.all([
    sql.query(EXPORT_ACCOUNT_QUERY, [userId]),
    sql.query(EXPORT_SIGN_IN_METHODS_QUERY, [userId]),
    sql.query(EXPORT_LIBRARY_QUERY, [userId]),
    sql.query(EXPORT_EPISODE_PROGRESS_QUERY, [userId]),
    sql.query(EXPORT_RATINGS_QUERY, [userId]),
    sql.query(EXPORT_FAVORITES_QUERY, [userId]),
    sql.query(EXPORT_WATCHLIST_QUERY, [userId]),
    sql.query(EXPORT_FOLLOWING_QUERY, [userId]),
    sql.query(EXPORT_FOLLOWERS_QUERY, [userId]),
  ]);

  return {
    account: toRows(account).at(0) ?? null,
    episodeProgress: toRows(episodeProgress),
    exportedAt: new Date().toISOString(),
    favourites: toRows(favourites),
    followers: toRows(followers),
    following: toRows(following),
    format: EXPORT_FORMAT,
    library: toRows(library),
    ratings: toRows(ratings),
    signInMethods: toRows(signInMethods),
    watchlist: toRows(watchlist),
  };
};

export const exportOwnPersonalData = async () =>
  buildPersonalDataExport(await getAuthenticatedUserId());

export const findAccountForPrivacyRequest = async (
  identifier: string
): Promise<PrivacyRequestAccount | null> => {
  const sql = getDatabaseSql();
  const rows = toRows(
    await sql.query(FIND_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY, [identifier])
  );
  const row = rows.at(0);

  return row
    ? {
        email: String(row.email ?? ''),
        userId: String(row.user_id ?? ''),
        username: String(row.username ?? ''),
      }
    : null;
};

/**
 * Answers an access request that arrived out of band, for an account the
 * requester proved they own but can no longer sign in to. Callers must have a
 * verified admin session.
 */
export const exportPersonalDataForPrivacyRequest = (userId: string) =>
  buildPersonalDataExport(userId);

/**
 * Erasure for the same out-of-band case. Every personal table cascades from
 * `profiles`, and the deleted profile stops answering the session-version read,
 * so any live session for the account fails its next request.
 */
export const deleteAccountForPrivacyRequest = async (
  userId: string
): Promise<PrivacyRequestAccount | null> => {
  const sql = getDatabaseSql();
  const rows = toRows(
    await sql.query(DELETE_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY, [userId])
  );
  const row = rows.at(0);

  if (!row) {
    return null;
  }

  revalidateSessionVersion(String(row.user_id ?? ''));

  return {
    email: String(row.email ?? ''),
    userId: String(row.user_id ?? ''),
    username: String(row.username ?? ''),
  };
};

export const countAnalyticsOptOuts = async () => {
  const sql = getDatabaseSql();
  const rows = toRows(await sql.query(COUNT_ANALYTICS_OPT_OUTS_QUERY, []));

  return Number(rows.at(0)?.opted_out ?? 0);
};
