import 'server-only';

import {
  getAvailableRegularEpisodes,
  getTvEpisodeKey,
  getTvLibraryProjection,
  getWatchedAvailableEpisodeKeys,
  projectWatchedKeysForStatus,
  type TvEpisodeProgressValue,
  type TvLibraryProjection,
  toTvEpisodeProgressValues,
} from 'lib/features/library/tv-library-state';
import type { TvLibrarySectionStatus } from 'lib/features/library/types';
import {
  getOwnMedia,
  listOwnEpisodeProgressForShow,
  setOwnEpisodeProgressBatch,
  setOwnTvLibraryState,
} from 'lib/services/database/tracking.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, type TvWatchStatus, WatchStatus } from 'lib/types';

type TvProgressContext = {
  availableEpisodes: ReturnType<typeof getAvailableRegularEpisodes>;
  intentStatus: TvWatchStatus;
  progressRows: Awaited<ReturnType<typeof listOwnEpisodeProgressForShow>>;
  watchedEpisodeKeys: Set<string>;
};

const getOwnTvProgressContext = async (
  tmdbShowId: number
): Promise<TvProgressContext> => {
  const [detail, progressRows, media] = await Promise.all([
    getTvShowDetail(tmdbShowId),
    listOwnEpisodeProgressForShow(tmdbShowId),
    getOwnMedia(tmdbShowId, MediaType.Tv),
  ]);
  const availableEpisodes = getAvailableRegularEpisodes(detail.seasons);

  return {
    availableEpisodes,
    intentStatus:
      (media?.watch_status as TvWatchStatus | undefined) ?? WatchStatus.Planned,
    progressRows,
    watchedEpisodeKeys: getWatchedAvailableEpisodeKeys(
      availableEpisodes,
      progressRows
    ),
  };
};

const saveTvLibraryProjection = async ({
  availableEpisodes,
  intentStatus,
  tmdbShowId,
  watchedEpisodeKeys,
}: {
  availableEpisodes: TvProgressContext['availableEpisodes'];
  intentStatus: TvWatchStatus;
  tmdbShowId: number;
  watchedEpisodeKeys: ReadonlySet<string>;
}) => {
  const projection = getTvLibraryProjection({
    availableEpisodes,
    intentStatus,
    watchedEpisodeKeys,
  });

  await setOwnTvLibraryState(
    tmdbShowId,
    projection.status,
    toTvEpisodeProgressValues(availableEpisodes, watchedEpisodeKeys),
    projection.watchedEpisodeCount > 0 ? new Date() : null
  );

  return projection;
};

export const getOwnTvLibraryProjection = async (
  tmdbShowId: number
): Promise<TvLibraryProjection> => {
  const context = await getOwnTvProgressContext(tmdbShowId);

  return getTvLibraryProjection({
    availableEpisodes: context.availableEpisodes,
    intentStatus: context.intentStatus,
    watchedEpisodeKeys: context.watchedEpisodeKeys,
  });
};

export const setOwnTvLibraryIntent = async (
  tmdbShowId: number,
  status: TvLibrarySectionStatus
) => {
  const context = await getOwnTvProgressContext(tmdbShowId);
  const watchedEpisodeKeys = projectWatchedKeysForStatus({
    availableEpisodes: context.availableEpisodes,
    currentWatchedEpisodeKeys: context.watchedEpisodeKeys,
    status,
  });

  return saveTvLibraryProjection({
    availableEpisodes: context.availableEpisodes,
    intentStatus: status,
    tmdbShowId,
    watchedEpisodeKeys,
  });
};

export const setOwnTvEpisodeWatchedAndReconcile = async ({
  episodeNumber,
  seasonNumber,
  tmdbShowId,
  watched,
}: {
  episodeNumber: number;
  seasonNumber: number;
  tmdbShowId: number;
  watched: boolean;
}) => {
  if (seasonNumber === 0) {
    await setOwnEpisodeProgressBatch(tmdbShowId, [
      { episodeNumber, seasonNumber, watched },
    ]);
    return null;
  }

  const context = await getOwnTvProgressContext(tmdbShowId);
  const episodeKey = getTvEpisodeKey({ episodeNumber, seasonNumber });
  const isAvailable = context.availableEpisodes.some(
    (episode) => getTvEpisodeKey(episode) === episodeKey
  );

  if (!isAvailable) {
    await setOwnEpisodeProgressBatch(tmdbShowId, [
      { episodeNumber, seasonNumber, watched },
    ]);
    return null;
  }

  const watchedEpisodeKeys = new Set(context.watchedEpisodeKeys);
  if (watched) {
    watchedEpisodeKeys.add(episodeKey);
  } else {
    watchedEpisodeKeys.delete(episodeKey);
  }

  return saveTvLibraryProjection({
    availableEpisodes: context.availableEpisodes,
    intentStatus: context.intentStatus,
    tmdbShowId,
    watchedEpisodeKeys,
  });
};

export const setOwnTvSeasonWatchedAndReconcile = async ({
  episodeNumbers,
  seasonNumber,
  tmdbShowId,
  watched,
}: {
  episodeNumbers: Array<number>;
  seasonNumber: number;
  tmdbShowId: number;
  watched: boolean;
}) => {
  const seasonValues: Array<TvEpisodeProgressValue> = episodeNumbers.map(
    (episodeNumber) => ({ episodeNumber, seasonNumber, watched })
  );

  if (seasonNumber === 0) {
    await setOwnEpisodeProgressBatch(tmdbShowId, seasonValues);
    return null;
  }

  const context = await getOwnTvProgressContext(tmdbShowId);
  const availableKeys = new Set(context.availableEpisodes.map(getTvEpisodeKey));
  const watchedEpisodeKeys = new Set(context.watchedEpisodeKeys);

  for (const episode of seasonValues) {
    const key = getTvEpisodeKey(episode);
    if (!availableKeys.has(key)) {
      continue;
    }
    if (watched) {
      watchedEpisodeKeys.add(key);
    } else {
      watchedEpisodeKeys.delete(key);
    }
  }

  return saveTvLibraryProjection({
    availableEpisodes: context.availableEpisodes,
    intentStatus: context.intentStatus,
    tmdbShowId,
    watchedEpisodeKeys,
  });
};
