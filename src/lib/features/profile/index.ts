import 'server-only';

import { authOptions } from 'lib/services/auth/index.server';
import type { FollowState } from 'lib/services/database/social.server';
import { getFollowStateForProfile } from 'lib/services/database/social.server';
import type {
  OwnProfile,
  PublicProfileStatsRow,
  ReviewRow,
  UserMediaRow,
} from 'lib/services/database/tracking.server';
import {
  getPublicProfileByUsername,
  getPublicProfileStats,
  listPublicMediaForProfile,
  listPublicReviewsForProfile,
} from 'lib/services/database/tracking.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, type TrackableMediaType, WatchStatus } from 'lib/types';
import { getServerSession } from 'next-auth/next';

const SECTION_LIMIT = 8;
const REVIEW_LIMIT = 6;
const FAVORITE_GENRE_LIMIT = 6;

export type PublicProfileMediaItem = {
  date: string;
  genres: Array<string>;
  mediaType: TrackableMediaType;
  posterPath: null | string;
  releaseDate: string;
  title: string;
  tmdbId: number;
};

export type PublicProfileReviewItem = {
  body: string;
  mediaType: TrackableMediaType;
  mediaTitle: string;
  title: string;
  tmdbId: number;
  updatedAt: string;
};

export type PublicProfileData = {
  completedShows: Array<PublicProfileMediaItem>;
  currentlyWatching: Array<PublicProfileMediaItem>;
  favoriteGenres: Array<string>;
  followState: FollowState;
  isOwnProfile: boolean;
  profile: OwnProfile;
  reviews: Array<PublicProfileReviewItem>;
  stats: PublicProfileStatsRow;
  watchedMovies: Array<PublicProfileMediaItem>;
};

const hydrateMediaItem = async (
  row: UserMediaRow
): Promise<PublicProfileMediaItem | null> => {
  try {
    if (row.media_type === MediaType.Movie) {
      const movie = await getMovieDetailServer(row.tmdb_id);

      return {
        date: row.last_watched_at ?? row.date_added,
        genres: movie.genres.map((genre) => genre.name),
        mediaType: row.media_type,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        title: movie.title,
        tmdbId: row.tmdb_id,
      };
    }

    const show = await getTvShowDetail(row.tmdb_id);

    return {
      date: row.last_watched_at ?? row.date_added,
      genres: show.genres.map((genre) => genre.name),
      mediaType: row.media_type,
      posterPath: show.poster_path,
      releaseDate: show.first_air_date,
      title: show.name,
      tmdbId: row.tmdb_id,
    };
  } catch {
    return null;
  }
};

const hydrateReviewItem = async (
  row: ReviewRow
): Promise<PublicProfileReviewItem | null> => {
  try {
    const mediaTitle =
      row.media_type === MediaType.Movie
        ? (await getMovieDetailServer(row.tmdb_id)).title
        : (await getTvShowDetail(row.tmdb_id)).name;

    return {
      body: row.body,
      mediaTitle,
      mediaType: row.media_type,
      title: row.title,
      tmdbId: row.tmdb_id,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
};

const getFavoriteGenres = (items: Array<PublicProfileMediaItem>) =>
  Array.from(
    items
      .flatMap((item) => item.genres)
      .reduce((genreCounts, genre) => {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
        return genreCounts;
      }, new Map<string, number>())
      .entries()
  )
    .toSorted(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, FAVORITE_GENRE_LIMIT)
    .map(([genre]) => genre);

export const getPublicProfileData = async (
  username: string
): Promise<PublicProfileData | null> => {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    return null;
  }

  const [mediaRows, reviewRows, stats] = await Promise.all([
    listPublicMediaForProfile(username),
    listPublicReviewsForProfile(username, REVIEW_LIMIT),
    getPublicProfileStats(username),
  ]);
  const [followState, session] = await Promise.all([
    getFollowStateForProfile(profile.user_id),
    getServerSession(authOptions),
  ]);
  const currentlyWatchingRows = mediaRows
    .filter(
      (row) =>
        row.media_type === MediaType.Tv &&
        row.watch_status === WatchStatus.Watching
    )
    .slice(0, SECTION_LIMIT);
  const completedShowRows = mediaRows
    .filter(
      (row) =>
        row.media_type === MediaType.Tv &&
        row.watch_status === WatchStatus.Completed
    )
    .slice(0, SECTION_LIMIT);
  const watchedMovieRows = mediaRows
    .filter(
      (row) =>
        row.media_type === MediaType.Movie &&
        row.watch_status === WatchStatus.Watched
    )
    .slice(0, SECTION_LIMIT);

  const [currentlyWatching, completedShows, watchedMovies, hydratedReviews] =
    await Promise.all([
      Promise.all(currentlyWatchingRows.map(hydrateMediaItem)),
      Promise.all(completedShowRows.map(hydrateMediaItem)),
      Promise.all(watchedMovieRows.map(hydrateMediaItem)),
      Promise.all(reviewRows.map(hydrateReviewItem)),
    ]);
  const mediaItems = [
    ...currentlyWatching,
    ...completedShows,
    ...watchedMovies,
  ].filter((item) => item !== null);

  return {
    completedShows: completedShows.filter((item) => item !== null),
    currentlyWatching: currentlyWatching.filter((item) => item !== null),
    favoriteGenres: getFavoriteGenres(mediaItems),
    followState,
    isOwnProfile: session?.user?.id === profile.user_id,
    profile,
    reviews: hydratedReviews.filter((review) => review !== null),
    stats,
    watchedMovies: watchedMovies.filter((item) => item !== null),
  };
};
