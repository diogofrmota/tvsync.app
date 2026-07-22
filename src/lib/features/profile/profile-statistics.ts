import { MediaType, WatchStatus } from 'lib/types';

export type ProfileStatistics = {
  episodesWatched: number;
  missingMovieRuntimeCount: number;
  missingTvRuntimeCount: number;
  movieMinutesWatched: number;
  moviesWatched: number;
  tvMinutesWatched: number;
  tvShowsWatched: number;
};

export type ProfileStatisticsMediaRow = {
  media_type: 'movie' | 'tv';
  tmdb_id: number;
  watch_status: string;
};

export type ProfileStatisticsEpisodeRow = {
  episode_number: number;
  season_number: number;
  tmdb_show_id: number;
  watched: boolean;
};

export const getEpisodeRuntimeKey = (input: {
  episode_number: number;
  season_number: number;
  tmdb_show_id: number;
}) => `${input.tmdb_show_id}:${input.season_number}:${input.episode_number}`;

const getPositiveRuntime = (runtime: number | null | undefined) =>
  typeof runtime === 'number' && Number.isFinite(runtime) && runtime > 0
    ? runtime
    : null;

export const calculateProfileStatistics = (input: {
  episodeRuntimeByKey: ReadonlyMap<string, number | null | undefined>;
  mediaRows: Array<ProfileStatisticsMediaRow>;
  movieRuntimeByTmdbId: ReadonlyMap<number, number | null | undefined>;
  progressRows: Array<ProfileStatisticsEpisodeRow>;
}): ProfileStatistics => {
  const uniqueMedia = new Map<string, ProfileStatisticsMediaRow>();

  for (const row of input.mediaRows) {
    uniqueMedia.set(`${row.media_type}:${row.tmdb_id}`, row);
  }

  const watchedMovies = Array.from(uniqueMedia.values()).filter(
    (row) =>
      row.media_type === MediaType.Movie &&
      row.watch_status === WatchStatus.Watched
  );
  const completedShows = Array.from(uniqueMedia.values()).filter(
    (row) =>
      row.media_type === MediaType.Tv &&
      row.watch_status === WatchStatus.Completed
  );
  const uniqueWatchedEpisodes = new Map<string, ProfileStatisticsEpisodeRow>();

  for (const row of input.progressRows) {
    if (row.watched) {
      uniqueWatchedEpisodes.set(getEpisodeRuntimeKey(row), row);
    }
  }

  let movieMinutesWatched = 0;
  let missingMovieRuntimeCount = 0;

  for (const movie of watchedMovies) {
    const runtime = getPositiveRuntime(
      input.movieRuntimeByTmdbId.get(movie.tmdb_id)
    );

    if (runtime === null) {
      missingMovieRuntimeCount += 1;
    } else {
      movieMinutesWatched += runtime;
    }
  }

  let tvMinutesWatched = 0;
  let missingTvRuntimeCount = 0;

  for (const key of Array.from(uniqueWatchedEpisodes.keys())) {
    const runtime = getPositiveRuntime(input.episodeRuntimeByKey.get(key));

    if (runtime === null) {
      missingTvRuntimeCount += 1;
    } else {
      tvMinutesWatched += runtime;
    }
  }

  return {
    episodesWatched: uniqueWatchedEpisodes.size,
    missingMovieRuntimeCount,
    missingTvRuntimeCount,
    movieMinutesWatched,
    moviesWatched: watchedMovies.length,
    tvMinutesWatched,
    tvShowsWatched: completedShows.length,
  };
};

export const formatWatchTime = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainingMinutes}m`;
};
