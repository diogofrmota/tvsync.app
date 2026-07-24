import 'server-only';

import {
  listPublicProfileStatisticsMedia,
  listPublicProfileStatisticsProgress,
} from 'lib/services/database/profile.server';
import {
  countOwnReviews,
  countPublicReviews,
  listOwnEpisodeProgressForTvLibrary,
  listOwnMedia,
} from 'lib/services/database/tracking.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTVSeasonDetailsServer } from 'lib/services/tmdb/tv/season/index.server';
import { MediaType, WatchStatus } from 'lib/types';
import { unstable_cache } from 'next/cache';

import {
  calculateProfileStatistics,
  getEpisodeRuntimeKey,
  type ProfileStatistics,
} from './profile-statistics';

const hydrateProfileStatistics = async (
  mediaRows: Awaited<ReturnType<typeof listOwnMedia>>,
  progressRows: Awaited<ReturnType<typeof listOwnEpisodeProgressForTvLibrary>>,
  reviewsWritten: number
): Promise<ProfileStatistics> => {
  const watchedMovies = mediaRows.filter(
    (row) =>
      row.media_type === MediaType.Movie &&
      row.watch_status === WatchStatus.Watched
  );
  const watchedEpisodes = progressRows.filter((row) => row.watched);
  const seasonGroups = new Map<
    string,
    { seasonNumber: number; showId: number }
  >();

  for (const episode of watchedEpisodes) {
    seasonGroups.set(`${episode.tmdb_show_id}:${episode.season_number}`, {
      seasonNumber: episode.season_number,
      showId: episode.tmdb_show_id,
    });
  }

  const movieRuntimeByTmdbId = new Map<number, number | null>();
  const episodeRuntimeByKey = new Map<string, number | null>();

  await Promise.all([
    ...watchedMovies.map(async (movie) => {
      try {
        const detail = await getMovieDetailServer(movie.tmdb_id);
        movieRuntimeByTmdbId.set(movie.tmdb_id, detail.runtime ?? null);
      } catch {
        movieRuntimeByTmdbId.set(movie.tmdb_id, null);
      }
    }),
    ...Array.from(seasonGroups.values()).map(async (group) => {
      try {
        const season = await getTVSeasonDetailsServer({
          seasonNumber: group.seasonNumber,
          showId: group.showId,
        });

        for (const episode of season.episodes) {
          episodeRuntimeByKey.set(
            getEpisodeRuntimeKey({
              episode_number: episode.episode_number,
              season_number: episode.season_number,
              tmdb_show_id: group.showId,
            }),
            episode.runtime || null
          );
        }
      } catch {
        // Missing provider data stays absent and is reported as a partial total.
      }
    }),
  ]);

  return calculateProfileStatistics({
    episodeRuntimeByKey,
    mediaRows,
    movieRuntimeByTmdbId,
    progressRows,
    reviewsWritten,
  });
};

export const getOwnProfileStatistics = async (): Promise<ProfileStatistics> => {
  const [mediaRows, progressRows, reviewsWritten] = await Promise.all([
    listOwnMedia(),
    listOwnEpisodeProgressForTvLibrary(),
    countOwnReviews(),
  ]);

  return hydrateProfileStatistics(mediaRows, progressRows, reviewsWritten);
};

// A public profile can be opened by any anonymous visitor, and every open used
// to re-run the full per-title TMDB runtime fan-out. Caching the computed
// result per username keeps repeat views (and the follower-comparison view,
// which asks for up to 20 profiles at once) off TMDB entirely. One hour of
// staleness on someone else's watch totals is imperceptible.
const PUBLIC_PROFILE_STATISTICS_REVALIDATE_SECONDS = 3600; // 1h

const computePublicProfileStatistics = async (
  username: string
): Promise<ProfileStatistics> => {
  const [mediaRows, progressRows, reviewsWritten] = await Promise.all([
    listPublicProfileStatisticsMedia(username),
    listPublicProfileStatisticsProgress(username),
    countPublicReviews(username),
  ]);

  return hydrateProfileStatistics(mediaRows, progressRows, reviewsWritten);
};

export const getPublicProfileStatistics = (
  username: string
): Promise<ProfileStatistics> => {
  const normalizedUsername = username.normalize('NFKC').trim().toLowerCase();

  return unstable_cache(
    () => computePublicProfileStatistics(username),
    ['public-profile-statistics', normalizedUsername],
    { revalidate: PUBLIC_PROFILE_STATISTICS_REVALIDATE_SECONDS }
  )();
};
