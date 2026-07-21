import 'server-only';

import {
  type ActivityFeedItem,
  getActivityFeedData,
} from 'lib/features/social';
import type {
  UserMediaRow,
  WatchlistItemRow,
} from 'lib/services/database/tracking.server';
import {
  listOwnMedia,
  listOwnWatchlistItems,
} from 'lib/services/database/tracking.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, type TrackableMediaType, WatchStatus } from 'lib/types';

const UPCOMING_EPISODES_LIMIT = 5;
const WATCHLIST_PREVIEW_LIMIT = 4;

export type DashboardUpcomingEpisodeItem = {
  airDate: string;
  episodeNumber: number;
  episodeTitle: string;
  posterPath: null | string;
  seasonNumber: number;
  showTitle: string;
  tmdbId: number;
};

export type DashboardWatchlistPreviewItem = {
  dateAdded: string;
  mediaType: TrackableMediaType;
  posterPath: null | string;
  releaseDate: string;
  title: string;
  tmdbId: number;
};

export type DashboardData = {
  activityFeed: Array<ActivityFeedItem>;
  savedWatchlistKeys: Array<string>;
  upcomingEpisodes: Array<DashboardUpcomingEpisodeItem>;
  watchlistPreview: Array<DashboardWatchlistPreviewItem>;
};

const getDateTime = (value: string | null) =>
  value ? new Date(value).getTime() : 0;

const getWatchlistKey = (mediaType: TrackableMediaType, tmdbId: number) =>
  `${mediaType}:${tmdbId}`;

const isWatchableTvRow = (row: UserMediaRow) =>
  row.media_type === MediaType.Tv &&
  row.watch_status !== WatchStatus.Completed &&
  row.watch_status !== WatchStatus.Dropped;

const hydrateUpcomingEpisodeItem = async (
  row: UserMediaRow
): Promise<DashboardUpcomingEpisodeItem | null> => {
  try {
    const show = await getTvShowDetail(row.tmdb_id);
    const nextEpisode = show.next_episode_to_air;

    if (!nextEpisode?.air_date) {
      return null;
    }

    return {
      airDate: nextEpisode.air_date,
      episodeNumber: nextEpisode.episode_number,
      episodeTitle: nextEpisode.name || `Episode ${nextEpisode.episode_number}`,
      posterPath: show.poster_path,
      seasonNumber: nextEpisode.season_number,
      showTitle: show.name,
      tmdbId: row.tmdb_id,
    };
  } catch {
    return null;
  }
};

const hydrateWatchlistPreviewItem = async (
  row: WatchlistItemRow
): Promise<DashboardWatchlistPreviewItem | null> => {
  try {
    if (row.media_type === MediaType.Movie) {
      const movie = await getMovieDetailServer(row.tmdb_id);

      return {
        dateAdded: row.date_added,
        mediaType: row.media_type,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        title: movie.title,
        tmdbId: row.tmdb_id,
      };
    }

    const show = await getTvShowDetail(row.tmdb_id);

    return {
      dateAdded: row.date_added,
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

export const getDashboardData = async (): Promise<DashboardData> => {
  const [mediaRows, watchlistRows, activityFeed] = await Promise.all([
    listOwnMedia(),
    listOwnWatchlistItems(),
    getActivityFeedData(),
  ]);
  const tvRows = mediaRows.filter(isWatchableTvRow);
  const upcomingTvRows = tvRows
    .toSorted(
      (left, right) =>
        getDateTime(right.date_added) - getDateTime(left.date_added)
    )
    .slice(0, UPCOMING_EPISODES_LIMIT);

  const [upcomingEpisodes, watchlistPreview] = await Promise.all([
    Promise.all(upcomingTvRows.map(hydrateUpcomingEpisodeItem)),
    Promise.all(
      watchlistRows
        .slice(0, WATCHLIST_PREVIEW_LIMIT)
        .map(hydrateWatchlistPreviewItem)
    ),
  ]);

  return {
    activityFeed,
    savedWatchlistKeys: watchlistRows.map((row) =>
      getWatchlistKey(row.media_type, row.tmdb_id)
    ),
    upcomingEpisodes: upcomingEpisodes
      .filter((item) => item !== null)
      .toSorted(
        (left, right) =>
          new Date(left.airDate).getTime() - new Date(right.airDate).getTime()
      ),
    watchlistPreview: watchlistPreview.filter((item) => item !== null),
  };
};
