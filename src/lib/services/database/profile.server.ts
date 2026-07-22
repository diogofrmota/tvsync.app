import 'server-only';

import { verifyPassword } from 'lib/services/auth/password.server';
import {
  createAuthToken,
  digestAuthToken,
  getAuthTokenExpiry,
  normalizeEmail,
} from 'lib/services/auth/security';
import type { PrivacySetting, TrackableMediaType } from 'lib/types';

import { getDatabaseSql } from './core.server';
import {
  CONSUME_EMAIL_CHANGE_TOKEN_QUERY,
  DELETE_OWN_ACCOUNT_QUERY,
  DELETE_OWN_FAVORITE_QUERY,
  GET_OWN_AUTH_METHODS_QUERY,
  INSERT_EMAIL_CHANGE_TOKEN_QUERY,
  INVALIDATE_EMAIL_CHANGE_TOKENS_QUERY,
  LIST_OWN_FAVORITES_QUERY,
  LIST_PUBLIC_FAVORITES_QUERY,
  SET_OWN_PASSWORD_QUERY,
  UPDATE_OWN_PROFILE_DETAILS_QUERY,
  UPSERT_OWN_FAVORITE_QUERY,
} from './profile-queries';
import {
  type EpisodeProgressRow,
  getAuthenticatedUserId,
  type UserMediaRow,
} from './tracking.server';

export type ProfileDetailsRow = {
  bio: string;
  created_at: string;
  display_name: string;
  email: string;
  name: string;
  privacy_setting: PrivacySetting;
  updated_at: string;
  user_id: string;
  username: string;
};

export type AuthMethods = {
  hasCredentials: boolean;
  hasGoogle: boolean;
};

type AuthMethodsRow = {
  has_credentials: boolean;
  has_google: boolean;
  password_hash: string | null;
};

export type FavoriteMediaRow = {
  created_at: string;
  media_type: TrackableMediaType;
  tmdb_id: number;
  updated_at: string;
  user_id: string;
};

type EmailChangeRecipient = {
  email: string;
  token: string;
  username: string;
};

export class ProfileEmailConflictError extends Error {
  constructor() {
    super('That email address is already registered.');
    this.name = 'ProfileEmailConflictError';
  }
}

const getOwnAuthMethodsRow = async (): Promise<AuthMethodsRow> => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(GET_OWN_AUTH_METHODS_QUERY, [
    userId,
  ])) as Array<AuthMethodsRow>;

  return (
    rows.at(0) ?? {
      has_credentials: false,
      has_google: false,
      password_hash: null,
    }
  );
};

export const getOwnAuthMethods = async (): Promise<AuthMethods> => {
  const row = await getOwnAuthMethodsRow();

  return {
    hasCredentials: Boolean(row.has_credentials),
    hasGoogle: Boolean(row.has_google),
  };
};

export const verifyOwnCurrentPassword = async (password: string) => {
  const row = await getOwnAuthMethodsRow();

  if (!row.has_credentials) {
    return false;
  }

  return verifyPassword(password, row.password_hash);
};

export const updateOwnProfileDetails = async (input: {
  bio: string;
  displayName: string;
  privacySetting: PrivacySetting;
  username: string;
}) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(UPDATE_OWN_PROFILE_DETAILS_QUERY, [
    userId,
    input.displayName,
    input.username,
    input.bio,
    input.privacySetting,
  ])) as Array<ProfileDetailsRow>;

  return rows.at(0) ?? null;
};

export const createOwnEmailChangeToken = async (
  newEmailInput: string
): Promise<EmailChangeRecipient | null> => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const newEmail = normalizeEmail(newEmailInput);
  const profiles = (await sql`
    select email, username
    from profiles
    where user_id = ${userId}
    limit 1
  `) as Array<{ email: string; username: string }>;
  const profile = profiles.at(0);

  if (!profile || normalizeEmail(profile.email) === newEmail) {
    return null;
  }

  const conflicts = (await sql`
    select user_id
    from profiles
    where lower(btrim(email)) = ${newEmail}
      and user_id <> ${userId}
    limit 1
  `) as Array<{ user_id: string }>;

  if (conflicts.length > 0) {
    throw new ProfileEmailConflictError();
  }

  const token = createAuthToken();
  const tokenDigest = digestAuthToken(token);
  const expiresAt = getAuthTokenExpiry();

  await sql.transaction((tx) => [
    tx.query(INVALIDATE_EMAIL_CHANGE_TOKENS_QUERY, [userId]),
    tx.query(INSERT_EMAIL_CHANGE_TOKEN_QUERY, [
      userId,
      newEmail,
      tokenDigest,
      expiresAt,
    ]),
  ]);

  return { email: newEmail, token, username: profile.username };
};

export const consumeEmailChangeToken = async (token: string) => {
  if (!token) {
    return null;
  }

  const sql = getDatabaseSql();
  const rows = (await sql.query(CONSUME_EMAIL_CHANGE_TOKEN_QUERY, [
    digestAuthToken(token),
  ])) as Array<{
    email: string;
    previous_email: string;
    user_id: string;
  }>;

  return rows.at(0) ?? null;
};

export const setOwnPassword = async (passwordHash: string) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(SET_OWN_PASSWORD_QUERY, [
    userId,
    passwordHash,
  ])) as Array<{ user_id: string }>;

  return Boolean(rows.at(0));
};

export const deleteOwnAccount = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql.query(DELETE_OWN_ACCOUNT_QUERY, [userId])) as Array<{
    user_id: string;
  }>;

  return Boolean(rows.at(0));
};

export const listOwnFavorites = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql.query(LIST_OWN_FAVORITES_QUERY, [
    userId,
  ])) as Array<FavoriteMediaRow>;
};

export const listPublicFavorites = async (username: string) => {
  const sql = getDatabaseSql();

  return (await sql.query(LIST_PUBLIC_FAVORITES_QUERY, [
    username.trim().toLowerCase(),
  ])) as Array<FavoriteMediaRow>;
};

export const setOwnFavorite = async (input: {
  favorite: boolean;
  mediaType: TrackableMediaType;
  tmdbId: number;
}) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const query = input.favorite
    ? UPSERT_OWN_FAVORITE_QUERY
    : DELETE_OWN_FAVORITE_QUERY;

  return sql.query(query, [userId, input.tmdbId, input.mediaType]);
};

export const getOwnFavorite = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select 1 as is_favorite
    from favorite_media
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
    limit 1
  `) as Array<{ is_favorite: number }>;

  return rows.length > 0;
};

export const listPublicProfileStatisticsMedia = async (username: string) => {
  const sql = getDatabaseSql();

  return (await sql`
    select media.id, media.user_id, media.tmdb_id, media.media_type,
      media.watch_status, media.date_added, media.last_watched_at,
      media.privacy_setting, media.created_at, media.updated_at
    from user_media media
    inner join profiles on profiles.user_id = media.user_id
    where lower(btrim(profiles.username)) = ${username.trim().toLowerCase()}
      and profiles.privacy_setting = 'public'
      and media.privacy_setting = 'public'
    order by media.date_added desc
  `) as Array<UserMediaRow>;
};

export const listPublicProfileStatisticsProgress = async (username: string) => {
  const sql = getDatabaseSql();

  return (await sql`
    select progress.id, progress.user_id, progress.tmdb_show_id,
      progress.season_number, progress.episode_number, progress.watched,
      progress.watched_at, progress.note, progress.created_at,
      progress.updated_at
    from episode_progress progress
    inner join profiles on profiles.user_id = progress.user_id
    inner join user_media media
      on media.user_id = progress.user_id
      and media.tmdb_id = progress.tmdb_show_id
      and media.media_type = 'tv'
    where lower(btrim(profiles.username)) = ${username.trim().toLowerCase()}
      and profiles.privacy_setting = 'public'
      and media.privacy_setting = 'public'
    order by progress.tmdb_show_id, progress.season_number,
      progress.episode_number
  `) as Array<EpisodeProgressRow>;
};
