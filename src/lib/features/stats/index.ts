import 'server-only';

import {
  listOwnEpisodeProgressForShow,
  listOwnMedia,
} from 'lib/services/database/tracking.server';
import { getMovieCreditsServer } from 'lib/services/tmdb/movie/credits/index.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTVShowCreditsServer } from 'lib/services/tmdb/tv/credits/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, WatchStatus } from 'lib/types';

const TMDB_STATS_LIMIT = 24;
const DEFAULT_TV_EPISODE_MINUTES = 45;

export type UserStatsData = {
  completionRate: number;
  currentWatchingCount: number;
  favoriteGenres: Array<{ count: number; name: string }>;
  mostWatchedActor: string | null;
  mostWatchedDirector: string | null;
  moviesWatchedThisMonth: number;
  showsCompletedThisYear: number;
  totalEpisodesWatched: number;
  totalHoursWatched: number;
  totalMoviesWatched: number;
};

const increment = (counts: Map<string, number>, key: string, amount = 1) => {
  if (!key) {
    return;
  }

  counts.set(key, (counts.get(key) ?? 0) + amount);
};

const topEntries = (counts: Map<string, number>, limit: number) =>
  Array.from(counts.entries())
    .toSorted(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, limit)
    .map(([name, count]) => ({ count, name }));

const topName = (counts: Map<string, number>) =>
  topEntries(counts, 1).at(0)?.name ?? null;

const isThisYear = (value: string | null) => {
  if (!value) {
    return false;
  }

  return new Date(value).getFullYear() === new Date().getFullYear();
};

const isThisMonth = (value: string | null) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

export const getUserStatsData = async (): Promise<UserStatsData> => {
  const mediaRows = await listOwnMedia();
  const watchedMovies = mediaRows.filter(
    (row) =>
      row.media_type === MediaType.Movie &&
      row.watch_status === WatchStatus.Watched
  );
  const tvRows = mediaRows.filter((row) => row.media_type === MediaType.Tv);
  const completedShows = tvRows.filter(
    (row) => row.watch_status === WatchStatus.Completed
  );
  const currentWatchingCount = tvRows.filter(
    (row) => row.watch_status === WatchStatus.Watching
  ).length;
  const genreCounts = new Map<string, number>();
  const actorCounts = new Map<string, number>();
  const directorCounts = new Map<string, number>();
  let movieMinutes = 0;
  let episodeMinutes = 0;
  let totalEpisodesWatched = 0;

  await Promise.all(
    watchedMovies.slice(0, TMDB_STATS_LIMIT).map(async (row) => {
      try {
        const [movie, credits] = await Promise.all([
          getMovieDetailServer(row.tmdb_id),
          getMovieCreditsServer(row.tmdb_id),
        ]);

        movieMinutes += movie.runtime ?? 0;
        for (const genre of movie.genres) {
          increment(genreCounts, genre.name);
        }

        for (const castMember of credits.cast.slice(0, 8)) {
          increment(actorCounts, castMember.name);
        }

        for (const crewMember of credits.crew) {
          if (crewMember.job === 'Director') {
            increment(directorCounts, crewMember.name);
          }
        }
      } catch {
        // Ignore individual TMDB failures so one title cannot break stats.
      }
    })
  );

  await Promise.all(
    tvRows.slice(0, TMDB_STATS_LIMIT).map(async (row) => {
      try {
        const [show, credits, progressRows] = await Promise.all([
          getTvShowDetail(row.tmdb_id),
          getTVShowCreditsServer(row.tmdb_id),
          listOwnEpisodeProgressForShow(row.tmdb_id),
        ]);
        const watchedCount = progressRows.filter(
          (progress) => progress.watched
        ).length;
        const averageRuntime =
          show.episode_run_time.at(0) ?? DEFAULT_TV_EPISODE_MINUTES;

        totalEpisodesWatched += watchedCount;
        episodeMinutes += watchedCount * averageRuntime;
        for (const genre of show.genres) {
          increment(genreCounts, genre.name, watchedCount || 1);
        }

        for (const castMember of credits.cast.slice(0, 8)) {
          increment(actorCounts, castMember.name, watchedCount || 1);
        }

        for (const creator of show.created_by) {
          increment(directorCounts, creator.name, watchedCount || 1);
        }
      } catch {
        // Ignore individual TMDB failures so one show cannot break stats.
      }
    })
  );

  const meaningfulTrackedRows = mediaRows.filter(
    (row) => row.watch_status !== WatchStatus.Planned
  );
  const completedRows = mediaRows.filter(
    (row) =>
      row.watch_status === WatchStatus.Watched ||
      row.watch_status === WatchStatus.Completed
  );

  return {
    completionRate:
      meaningfulTrackedRows.length > 0
        ? Math.round(
            (completedRows.length / meaningfulTrackedRows.length) * 100
          )
        : 0,
    currentWatchingCount,
    favoriteGenres: topEntries(genreCounts, 6),
    mostWatchedActor: topName(actorCounts),
    mostWatchedDirector: topName(directorCounts),
    moviesWatchedThisMonth: watchedMovies.filter((row) =>
      isThisMonth(row.last_watched_at ?? row.updated_at)
    ).length,
    showsCompletedThisYear: completedShows.filter((row) =>
      isThisYear(row.last_watched_at ?? row.updated_at)
    ).length,
    totalEpisodesWatched,
    totalHoursWatched: Math.round((movieMinutes + episodeMinutes) / 60),
    totalMoviesWatched: watchedMovies.length,
  };
};
