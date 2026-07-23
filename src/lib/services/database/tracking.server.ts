import 'server-only';

import { getAuthSession } from 'lib/services/auth/session.server';
import type {
  MovieWatchStatus,
  PrivacySetting,
  RatingTargetType,
  TrackableMediaType,
  WatchStatus,
} from 'lib/types';

import { getDatabaseSql } from './core.server';
import {
  ADD_OWN_LIBRARY_ITEM_QUERY,
  REMOVE_OWN_LIBRARY_ITEM_QUERY,
  SET_OWN_EPISODE_PROGRESS_BATCH_QUERY,
  SET_OWN_MOVIE_LIBRARY_STATUS_QUERY,
  SET_OWN_TV_LIBRARY_STATE_QUERY,
} from './library-queries';

type ProfileRow = {
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

export type OwnProfile = ProfileRow;
export type PublicProfile = Pick<
  ProfileRow,
  'bio' | 'display_name' | 'privacy_setting' | 'user_id' | 'username'
>;

export type OwnProfileInput = {
  bio?: string;
  displayName: string;
  email: string;
  name: string;
  privacySetting: PrivacySetting;
  username: string;
};

export type MediaTrackingInput = {
  lastWatchedAt?: Date | null;
  mediaType: TrackableMediaType;
  privacySetting?: PrivacySetting;
  tmdbId: number;
  watchStatus: WatchStatus;
};

export type EpisodeProgressInput = {
  episodeNumber: number;
  note?: string;
  seasonNumber: number;
  tmdbShowId: number;
  watched: boolean;
  watchedAt?: Date | null;
};

export type RatingInput = {
  episodeNumber?: number;
  mediaType: RatingTargetType;
  rating: number;
  seasonNumber?: number;
  tmdbId: number;
};

export type ReviewInput = {
  body: string;
  mediaType: TrackableMediaType;
  privacySetting?: PrivacySetting;
  title?: string;
  tmdbId: number;
};

export type WatchlistItemInput = {
  mediaType: TrackableMediaType;
  note?: string;
  tmdbId: number;
};

export type WatchlistItemRow = {
  created_at: string;
  date_added: string;
  id: string;
  media_type: TrackableMediaType;
  note: string;
  tmdb_id: number;
  updated_at: string;
  user_id: string;
};

export type UserMediaRow = {
  created_at: string;
  date_added: string;
  id: string;
  last_watched_at: string | null;
  media_type: TrackableMediaType;
  privacy_setting: PrivacySetting;
  tmdb_id: number;
  updated_at: string;
  user_id: string;
  watch_status: WatchStatus;
};

export type EpisodeProgressRow = {
  created_at: string;
  episode_number: number;
  id: string;
  note: string;
  season_number: number;
  tmdb_show_id: number;
  updated_at: string;
  user_id: string;
  watched: boolean;
  watched_at: string | null;
};

export type RatingRow = {
  created_at: string;
  episode_number: number;
  id: string;
  media_type: RatingTargetType;
  rating: number;
  season_number: number;
  tmdb_id: number;
  updated_at: string;
  user_id: string;
};

export type RatingSummaryRow = {
  average_rating: number | null;
  rating_count: number;
};

export type ReviewRow = {
  body: string;
  created_at: string;
  display_name: string;
  id: string;
  media_type: TrackableMediaType;
  privacy_setting: PrivacySetting;
  title: string;
  tmdb_id: number;
  updated_at: string;
  user_id: string;
  username: string;
};

export type PublicProfileStatsRow = {
  completed_show_count: number;
  currently_watching_count: number;
  public_review_count: number;
  watched_movie_count: number;
};

export const getAuthenticatedUserId = async () => {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error(
      'Unauthorized: sign in before accessing personal tracking data.'
    );
  }

  return userId;
};

export const assertCurrentUserCanAccessUserRecords = async (userId: string) => {
  const currentUserId = await getAuthenticatedUserId();

  if (currentUserId !== userId) {
    throw new Error(
      'Forbidden: users can only access their own private records.'
    );
  }

  return currentUserId;
};

export const getOwnProfile = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select user_id, name, username, display_name, email, bio, privacy_setting, created_at, updated_at
    from profiles
    where user_id = ${userId}
    limit 1
  `) as Array<ProfileRow>;

  return rows.at(0) ?? null;
};

export const isUsernameTakenByAnotherUser = async (username: string) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select user_id
    from profiles
    where lower(username) = lower(${username})
      and user_id <> ${userId}
    limit 1
  `) as Array<{ user_id: string }>;

  return rows.length > 0;
};

export const getPublicProfileByUsername = async (username: string) => {
  const sql = getDatabaseSql();
  const rows = (await sql`
    select user_id, username, display_name, bio, privacy_setting
    from profiles
    where lower(btrim(username)) = ${username
      .normalize('NFKC')
      .trim()
      .toLowerCase()}
      and privacy_setting = 'public'
    limit 1
  `) as Array<PublicProfile>;

  return rows.at(0) ?? null;
};

export const upsertOwnProfile = async (input: OwnProfileInput) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    insert into profiles (
      user_id,
      name,
      username,
      display_name,
      email,
      bio,
      privacy_setting
    )
    values (
      ${userId},
      ${input.name},
      ${input.username},
      ${input.displayName},
      ${input.email},
      ${input.bio ?? ''},
      ${input.privacySetting}
    )
    on conflict (user_id) do update set
      name = excluded.name,
      username = excluded.username,
      display_name = excluded.display_name,
      email = excluded.email,
      bio = excluded.bio,
      privacy_setting = excluded.privacy_setting,
      updated_at = now()
    returning user_id, name, username, display_name, email, bio, privacy_setting, created_at, updated_at
  `) as Array<ProfileRow>;

  return rows[0];
};

export const listOwnMedia = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select id, user_id, tmdb_id, media_type, watch_status, date_added, last_watched_at, privacy_setting, created_at, updated_at
    from user_media
    where user_id = ${userId}
    order by date_added desc
  `) as Array<UserMediaRow>;
};

export const listOwnMediaByType = async (mediaType: TrackableMediaType) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select id, user_id, tmdb_id, media_type, watch_status, date_added, last_watched_at, privacy_setting, created_at, updated_at
    from user_media
    where user_id = ${userId}
      and media_type = ${mediaType}
    order by date_added desc
  `) as Array<UserMediaRow>;
};

export const listPublicMediaForProfile = async (username: string) => {
  const sql = getDatabaseSql();

  return (await sql`
    select user_media.id, user_media.user_id, user_media.tmdb_id, user_media.media_type,
      user_media.watch_status, user_media.date_added, user_media.last_watched_at,
      user_media.privacy_setting, user_media.created_at, user_media.updated_at
    from user_media
    inner join profiles on profiles.user_id = user_media.user_id
    where lower(profiles.username) = lower(${username})
      and profiles.privacy_setting = 'public'
      and user_media.privacy_setting = 'public'
      and (
        (user_media.media_type = 'tv' and user_media.watch_status in ('watching', 'completed'))
        or (user_media.media_type = 'movie' and user_media.watch_status = 'watched')
      )
    order by coalesce(user_media.last_watched_at, user_media.date_added) desc
  `) as Array<UserMediaRow>;
};

export const getPublicProfileStats = async (username: string) => {
  const sql = getDatabaseSql();
  const rows = (await sql`
    select
      (
        select count(*)::int
        from user_media
        inner join profiles on profiles.user_id = user_media.user_id
        where lower(profiles.username) = lower(${username})
          and profiles.privacy_setting = 'public'
          and user_media.privacy_setting = 'public'
          and user_media.media_type = 'tv'
          and user_media.watch_status = 'watching'
      ) as currently_watching_count,
      (
        select count(*)::int
        from user_media
        inner join profiles on profiles.user_id = user_media.user_id
        where lower(profiles.username) = lower(${username})
          and profiles.privacy_setting = 'public'
          and user_media.privacy_setting = 'public'
          and user_media.media_type = 'tv'
          and user_media.watch_status = 'completed'
      ) as completed_show_count,
      (
        select count(*)::int
        from user_media
        inner join profiles on profiles.user_id = user_media.user_id
        where lower(profiles.username) = lower(${username})
          and profiles.privacy_setting = 'public'
          and user_media.privacy_setting = 'public'
          and user_media.media_type = 'movie'
          and user_media.watch_status = 'watched'
      ) as watched_movie_count,
      (
        select count(*)::int
        from reviews
        inner join profiles on profiles.user_id = reviews.user_id
        where lower(profiles.username) = lower(${username})
          and profiles.privacy_setting = 'public'
          and reviews.privacy_setting = 'public'
      ) as public_review_count
  `) as Array<PublicProfileStatsRow>;

  return (
    rows.at(0) ?? {
      completed_show_count: 0,
      currently_watching_count: 0,
      public_review_count: 0,
      watched_movie_count: 0,
    }
  );
};

export const getOwnMedia = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select id, user_id, tmdb_id, media_type, watch_status, date_added, last_watched_at, privacy_setting, created_at, updated_at
    from user_media
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
    limit 1
  `) as Array<UserMediaRow>;

  return rows.at(0) ?? null;
};

export const upsertOwnMedia = async (input: MediaTrackingInput) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    insert into user_media (
      user_id,
      tmdb_id,
      media_type,
      watch_status,
      last_watched_at,
      privacy_setting
    )
    values (
      ${userId},
      ${input.tmdbId},
      ${input.mediaType},
      ${input.watchStatus},
      ${input.lastWatchedAt ?? null},
      ${input.privacySetting ?? 'private'}
    )
    on conflict (user_id, tmdb_id, media_type) do update set
      watch_status = excluded.watch_status,
      last_watched_at = excluded.last_watched_at,
      privacy_setting = excluded.privacy_setting,
      updated_at = now()
    returning *
  `;
};

export const deleteOwnMedia = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    delete from user_media
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
    returning id
  `;
};

export const setOwnMovieLibraryStatus = async (
  tmdbId: number,
  watchStatus: MovieWatchStatus
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const lastWatchedAt = watchStatus === 'watched' ? new Date() : null;

  return sql.query(SET_OWN_MOVIE_LIBRARY_STATUS_QUERY, [
    userId,
    tmdbId,
    watchStatus,
    lastWatchedAt,
  ]);
};

export const removeOwnLibraryItem = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql.query(REMOVE_OWN_LIBRARY_ITEM_QUERY, [userId, tmdbId, mediaType]);
};

export const upsertOwnEpisodeProgress = async (input: EpisodeProgressInput) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    insert into episode_progress (
      user_id,
      tmdb_show_id,
      season_number,
      episode_number,
      watched,
      watched_at,
      note
    )
    values (
      ${userId},
      ${input.tmdbShowId},
      ${input.seasonNumber},
      ${input.episodeNumber},
      ${input.watched},
      ${input.watchedAt ?? null},
      ${input.note ?? ''}
    )
    on conflict (user_id, tmdb_show_id, season_number, episode_number) do update set
      watched = excluded.watched,
      watched_at = excluded.watched_at,
      note = excluded.note,
      updated_at = now()
    returning *
  `;
};

export const listOwnEpisodeProgressForShow = async (tmdbShowId: number) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select id, user_id, tmdb_show_id, season_number, episode_number, watched, watched_at, note, created_at, updated_at
    from episode_progress
    where user_id = ${userId}
      and tmdb_show_id = ${tmdbShowId}
    order by season_number asc, episode_number asc
  `) as Array<EpisodeProgressRow>;
};

export const listOwnEpisodeProgressForTvLibrary = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select episode_progress.id, episode_progress.user_id,
      episode_progress.tmdb_show_id, episode_progress.season_number,
      episode_progress.episode_number, episode_progress.watched,
      episode_progress.watched_at, episode_progress.note,
      episode_progress.created_at, episode_progress.updated_at
    from episode_progress
    inner join user_media
      on user_media.user_id = episode_progress.user_id
      and user_media.tmdb_id = episode_progress.tmdb_show_id
      and user_media.media_type = 'tv'
    where episode_progress.user_id = ${userId}
    order by episode_progress.tmdb_show_id asc,
      episode_progress.season_number asc,
      episode_progress.episode_number asc
  `) as Array<EpisodeProgressRow>;
};

export const setOwnEpisodeProgressBatch = async (
  tmdbShowId: number,
  episodes: Array<{
    episodeNumber: number;
    seasonNumber: number;
    watched: boolean;
  }>
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const values = episodes.map((episode) => ({
    episode_number: episode.episodeNumber,
    season_number: episode.seasonNumber,
    watched: episode.watched,
  }));

  return sql.query(SET_OWN_EPISODE_PROGRESS_BATCH_QUERY, [
    userId,
    tmdbShowId,
    JSON.stringify(values),
  ]);
};

export const setOwnTvLibraryState = async (
  tmdbShowId: number,
  watchStatus: Extract<WatchStatus, 'planned' | 'watching' | 'completed'>,
  episodes: Array<{
    episodeNumber: number;
    seasonNumber: number;
    watched: boolean;
  }>,
  lastWatchedAt: Date | null
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const values = episodes.map((episode) => ({
    episode_number: episode.episodeNumber,
    season_number: episode.seasonNumber,
    watched: episode.watched,
  }));

  return sql.query(SET_OWN_TV_LIBRARY_STATE_QUERY, [
    userId,
    tmdbShowId,
    watchStatus,
    JSON.stringify(values),
    lastWatchedAt,
  ]);
};

export const listOwnEpisodeProgressForSeason = async (
  tmdbShowId: number,
  seasonNumber: number
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select id, user_id, tmdb_show_id, season_number, episode_number, watched, watched_at, note, created_at, updated_at
    from episode_progress
    where user_id = ${userId}
      and tmdb_show_id = ${tmdbShowId}
      and season_number = ${seasonNumber}
    order by episode_number asc
  `) as Array<EpisodeProgressRow>;
};

export const getOwnEpisodeProgress = async (
  tmdbShowId: number,
  seasonNumber: number,
  episodeNumber: number
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select id, user_id, tmdb_show_id, season_number, episode_number, watched, watched_at, note, created_at, updated_at
    from episode_progress
    where user_id = ${userId}
      and tmdb_show_id = ${tmdbShowId}
      and season_number = ${seasonNumber}
      and episode_number = ${episodeNumber}
    limit 1
  `) as Array<EpisodeProgressRow>;

  return rows.at(0) ?? null;
};

export const upsertOwnRating = async (input: RatingInput) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const seasonNumber = input.seasonNumber ?? -1;
  const episodeNumber = input.episodeNumber ?? -1;

  return (await sql`
    insert into ratings (
      user_id,
      tmdb_id,
      media_type,
      season_number,
      episode_number,
      rating
    )
    values (
      ${userId},
      ${input.tmdbId},
      ${input.mediaType},
      ${seasonNumber},
      ${episodeNumber},
      ${input.rating}
    )
    on conflict (user_id, tmdb_id, media_type, season_number, episode_number) do update set
      rating = excluded.rating,
      updated_at = now()
    returning *
  `) as Array<RatingRow>;
};

export const getOwnRating = async ({
  episodeNumber,
  mediaType,
  seasonNumber,
  tmdbId,
}: Omit<RatingInput, 'rating'>) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select id, user_id, tmdb_id, media_type, season_number, episode_number, rating, created_at, updated_at
    from ratings
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
      and season_number = ${seasonNumber ?? -1}
      and episode_number = ${episodeNumber ?? -1}
    limit 1
  `) as Array<RatingRow>;

  return rows.at(0) ?? null;
};

export const getRatingSummary = async ({
  episodeNumber,
  mediaType,
  seasonNumber,
  tmdbId,
}: Omit<RatingInput, 'rating'>) => {
  const sql = getDatabaseSql();
  const rows = (await sql`
    select count(*)::int as rating_count, round(avg(rating), 1)::float as average_rating
    from ratings
    where tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
      and season_number = ${seasonNumber ?? -1}
      and episode_number = ${episodeNumber ?? -1}
  `) as Array<RatingSummaryRow>;

  return rows.at(0) ?? { average_rating: null, rating_count: 0 };
};

export const deleteOwnRating = async ({
  episodeNumber,
  mediaType,
  seasonNumber,
  tmdbId,
}: Omit<RatingInput, 'rating'>) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    delete from ratings
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
      and season_number = ${seasonNumber ?? -1}
      and episode_number = ${episodeNumber ?? -1}
    returning id
  `) as Array<{ id: string }>;
};

export const upsertOwnReview = async (input: ReviewInput) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    insert into reviews (
      user_id,
      tmdb_id,
      media_type,
      title,
      body,
      privacy_setting
    )
    values (
      ${userId},
      ${input.tmdbId},
      ${input.mediaType},
      ${input.title ?? ''},
      ${input.body},
      ${input.privacySetting ?? 'private'}
    )
    on conflict (user_id, tmdb_id, media_type) do update set
      title = excluded.title,
      body = excluded.body,
      privacy_setting = excluded.privacy_setting,
      updated_at = now()
    returning *
  `;
};

export const deleteOwnReview = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    delete from reviews
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
    returning id
  `;
};

export const getOwnReview = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select reviews.id, reviews.user_id, profiles.username, profiles.display_name, reviews.tmdb_id,
      reviews.media_type, reviews.title, reviews.body, reviews.privacy_setting, reviews.created_at, reviews.updated_at
    from reviews
    inner join profiles on profiles.user_id = reviews.user_id
    where reviews.user_id = ${userId}
      and reviews.tmdb_id = ${tmdbId}
      and reviews.media_type = ${mediaType}
    limit 1
  `) as Array<ReviewRow>;

  return rows.at(0) ?? null;
};

export const listPublicReviewsForMedia = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const sql = getDatabaseSql();

  return (await sql`
    select reviews.id, reviews.user_id, profiles.username, profiles.display_name, reviews.tmdb_id,
      reviews.media_type, reviews.title, reviews.body, reviews.privacy_setting, reviews.created_at, reviews.updated_at
    from reviews
    inner join profiles on profiles.user_id = reviews.user_id
    where reviews.tmdb_id = ${tmdbId}
      and reviews.media_type = ${mediaType}
      and reviews.privacy_setting = 'public'
      and profiles.privacy_setting = 'public'
    order by reviews.created_at desc
  `) as Array<ReviewRow>;
};

export const listPublicReviewsForProfile = async (
  username: string,
  limit = 6
) => {
  const sql = getDatabaseSql();

  return (await sql`
    select reviews.id, reviews.user_id, profiles.username, profiles.display_name, reviews.tmdb_id,
      reviews.media_type, reviews.title, reviews.body, reviews.privacy_setting, reviews.created_at, reviews.updated_at
    from reviews
    inner join profiles on profiles.user_id = reviews.user_id
    where lower(profiles.username) = lower(${username})
      and profiles.privacy_setting = 'public'
      and reviews.privacy_setting = 'public'
    order by reviews.updated_at desc
    limit ${limit}
  `) as Array<ReviewRow>;
};

export const upsertOwnWatchlistItem = async (input: WatchlistItemInput) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    insert into watchlist_items (user_id, tmdb_id, media_type, note)
    values (${userId}, ${input.tmdbId}, ${input.mediaType}, ${input.note ?? ''})
    on conflict (user_id, tmdb_id, media_type) do update set
      note = excluded.note,
      updated_at = now()
    returning *
  `;
};

export const addOwnLibraryItem = async (input: WatchlistItemInput) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql.query(ADD_OWN_LIBRARY_ITEM_QUERY, [
    userId,
    input.tmdbId,
    input.mediaType,
    input.note ?? '',
  ]);
};

export const listOwnWatchlistItems = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select id, user_id, tmdb_id, media_type, date_added, note, created_at, updated_at
    from watchlist_items
    where user_id = ${userId}
    order by date_added desc
  `) as Array<WatchlistItemRow>;
};

export const getOwnWatchlistItem = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const rows = (await sql`
    select id, user_id, tmdb_id, media_type, date_added, note, created_at, updated_at
    from watchlist_items
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
    limit 1
  `) as Array<WatchlistItemRow>;

  return rows.at(0) ?? null;
};

export const deleteOwnWatchlistItem = async (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    delete from watchlist_items
    where user_id = ${userId}
      and tmdb_id = ${tmdbId}
      and media_type = ${mediaType}
    returning id
  `;
};
