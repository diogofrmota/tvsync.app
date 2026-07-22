import 'server-only';

import {
  listPublicProfileStatisticsMedia,
  listPublicProfileStatisticsProgress,
} from 'lib/services/database/profile.server';
import {
  listOwnEpisodeProgressForTvLibrary,
  listOwnMedia,
} from 'lib/services/database/tracking.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTVSeasonDetailsServer } from 'lib/services/tmdb/tv/season/index.server';
import { MediaType, WatchStatus } from 'lib/types';

import {
  calculateProfileStatistics,
  getEpisodeRuntimeKey,
  type ProfileStatistics,
} from './profile-statistics';

const hydrateProfileStatistics = async (
  mediaRows: Awaited<ReturnType<typeof listOwnMedia>>,
  progressRows: Awaited<ReturnType<typeof listOwnEpisodeProgressForTvLibrary>>
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
  });
};

export const getOwnProfileStatistics = async (): Promise<ProfileStatistics> => {
  const [mediaRows, progressRows] = await Promise.all([
    listOwnMedia(),
    listOwnEpisodeProgressForTvLibrary(),
  ]);

  return hydrateProfileStatistics(mediaRows, progressRows);
};

export const getPublicProfileStatistics = async (username: string) => {
  const [mediaRows, progressRows] = await Promise.all([
    listPublicProfileStatisticsMedia(username),
    listPublicProfileStatisticsProgress(username),
  ]);

  return hydrateProfileStatistics(mediaRows, progressRows);
};
