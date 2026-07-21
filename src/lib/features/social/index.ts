import 'server-only';

import {
  type ActivityRow,
  listFollowedActivity,
  listReceivedRecommendations,
  type RecommendationRow,
} from 'lib/services/database/social.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, type TrackableMediaType, WatchStatus } from 'lib/types';

const FEED_LIMIT = 30;

export type ActivityFeedItem = {
  activityAt: string;
  activityType: ActivityRow['activity_type'];
  displayName: string;
  episodeNumber: number | null;
  mediaType: TrackableMediaType;
  posterPath: null | string;
  rating: number | null;
  reviewId: string | null;
  seasonNumber: number | null;
  sentence: string;
  title: string;
  tmdbId: number;
  userId: string;
  username: string;
  watchStatus: WatchStatus | null;
};

export type ReceivedRecommendationItem = {
  createdAt: string;
  displayName: string;
  id: string;
  mediaType: TrackableMediaType;
  note: string;
  posterPath: null | string;
  senderUserId: string;
  title: string;
  tmdbId: number;
  username: string;
};

const getMediaTitle = async (mediaType: TrackableMediaType, tmdbId: number) => {
  if (mediaType === MediaType.Movie) {
    const movie = await getMovieDetailServer(tmdbId);

    return {
      posterPath: movie.poster_path,
      title: movie.title,
    };
  }

  const show = await getTvShowDetail(tmdbId);

  return {
    posterPath: show.poster_path,
    title: show.name,
  };
};

const getStatusVerb = (status: WatchStatus | null) => {
  if (status === WatchStatus.Completed) {
    return 'finished';
  }

  if (status === WatchStatus.Watched) {
    return 'watched';
  }

  if (status === WatchStatus.Watching) {
    return 'started watching';
  }

  if (status === WatchStatus.Dropped) {
    return 'dropped';
  }

  if (status === WatchStatus.Paused) {
    return 'paused';
  }

  return 'updated';
};

const getActivitySentence = (
  row: ActivityRow,
  title: string,
  displayName: string
) => {
  if (row.activity_type === 'watch_status') {
    return `${displayName} ${getStatusVerb(row.watch_status)} ${title}`;
  }

  if (row.activity_type === 'rating') {
    return `${displayName} rated ${title} ${row.rating}/10`;
  }

  if (row.activity_type === 'review') {
    return `${displayName} reviewed ${title}`;
  }

  if (row.activity_type === 'watchlist') {
    return `${displayName} added ${title} to watchlist`;
  }

  return `${displayName} watched S${row.season_number} E${row.episode_number} of ${title}`;
};

const hydrateActivity = async (
  row: ActivityRow
): Promise<ActivityFeedItem | null> => {
  try {
    const media = await getMediaTitle(row.media_type, row.tmdb_id);
    const displayName = row.display_name || row.username;

    return {
      activityAt: row.activity_at,
      activityType: row.activity_type,
      displayName,
      episodeNumber: row.episode_number,
      mediaType: row.media_type,
      posterPath: media.posterPath,
      rating: row.rating,
      reviewId: row.review_id,
      seasonNumber: row.season_number,
      sentence: getActivitySentence(row, media.title, displayName),
      title: media.title,
      tmdbId: row.tmdb_id,
      userId: row.user_id,
      username: row.username,
      watchStatus: row.watch_status,
    };
  } catch {
    return null;
  }
};

const hydrateRecommendation = async (
  row: RecommendationRow
): Promise<ReceivedRecommendationItem | null> => {
  try {
    const media = await getMediaTitle(row.media_type, row.tmdb_id);

    return {
      createdAt: row.created_at,
      displayName: row.display_name || row.username,
      id: row.id,
      mediaType: row.media_type,
      note: row.note,
      posterPath: media.posterPath,
      senderUserId: row.sender_user_id,
      title: media.title,
      tmdbId: row.tmdb_id,
      username: row.username,
    };
  } catch {
    return null;
  }
};

export const getActivityFeedData = async () => {
  const rows = await listFollowedActivity(FEED_LIMIT);
  const items = await Promise.all(rows.map(hydrateActivity));

  return items.filter((item) => item !== null);
};

export const getReceivedRecommendationsData = async () => {
  const rows = await listReceivedRecommendations();
  const items = await Promise.all(rows.map(hydrateRecommendation));

  return items.filter((item) => item !== null);
};
