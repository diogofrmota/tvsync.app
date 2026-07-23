import { type TvWatchStatus, WatchStatus } from 'lib/types';

import type { TvLibraryItem, TvLibrarySectionStatus } from './types';

export type TvAvailableEpisode = {
  episodeNumber: number;
  seasonNumber: number;
};

export type TvEpisodeProgressValue = TvAvailableEpisode & {
  watched: boolean;
};

type TvSeasonEpisodeCount = {
  episode_count: number;
  season_number: number;
};

type TvProgressRow = {
  episode_number: number;
  season_number: number;
  watched: boolean;
};

export type TvLibraryProjection = {
  progressPercent: number;
  status: TvLibrarySectionStatus;
  totalEpisodeCount: number;
  watchedEpisodeCount: number;
};

export const TV_LIBRARY_STATUSES = [
  WatchStatus.Watching,
  WatchStatus.Planned,
  WatchStatus.Completed,
] as const satisfies ReadonlyArray<TvLibrarySectionStatus>;

export const getTvEpisodeKey = ({
  episodeNumber,
  seasonNumber,
}: TvAvailableEpisode) => `${seasonNumber}:${episodeNumber}`;

/**
 * Overall TV progress intentionally excludes season zero/specials. This keeps
 * library progress aligned with the existing detail progress rule while still
 * allowing specials to be tracked independently on their own pages.
 */
export const getAvailableRegularEpisodes = (
  seasons: ReadonlyArray<TvSeasonEpisodeCount>
): Array<TvAvailableEpisode> =>
  seasons
    .filter(
      (season) =>
        Number.isInteger(season.season_number) &&
        season.season_number > 0 &&
        Number.isInteger(season.episode_count) &&
        season.episode_count > 0
    )
    .toSorted((left, right) => left.season_number - right.season_number)
    .flatMap((season) =>
      Array.from({ length: season.episode_count }, (_, index) => ({
        episodeNumber: index + 1,
        seasonNumber: season.season_number,
      }))
    );

export const getWatchedAvailableEpisodeKeys = (
  availableEpisodes: ReadonlyArray<TvAvailableEpisode>,
  progressRows: ReadonlyArray<TvProgressRow>
) => {
  const availableKeys = new Set(availableEpisodes.map(getTvEpisodeKey));

  return new Set(
    progressRows
      .filter((row) => row.watched)
      .map((row) =>
        getTvEpisodeKey({
          episodeNumber: row.episode_number,
          seasonNumber: row.season_number,
        })
      )
      .filter((key) => availableKeys.has(key))
  );
};

export const deriveTvLibraryStatus = ({
  intentStatus,
  totalEpisodeCount,
  watchedEpisodeCount,
}: {
  intentStatus: TvWatchStatus;
  totalEpisodeCount: number;
  watchedEpisodeCount: number;
}): TvLibrarySectionStatus => {
  if (
    (totalEpisodeCount > 0 && watchedEpisodeCount >= totalEpisodeCount) ||
    (totalEpisodeCount === 0 && intentStatus === WatchStatus.Completed)
  ) {
    return WatchStatus.Completed;
  }

  if (watchedEpisodeCount > 0) {
    return WatchStatus.Watching;
  }

  return WatchStatus.Planned;
};

export const getTvLibraryProjection = ({
  availableEpisodes,
  intentStatus,
  watchedEpisodeKeys,
}: {
  availableEpisodes: ReadonlyArray<TvAvailableEpisode>;
  intentStatus: TvWatchStatus;
  watchedEpisodeKeys: ReadonlySet<string>;
}): TvLibraryProjection => {
  const totalEpisodeCount = availableEpisodes.length;
  const watchedEpisodeCount = availableEpisodes.reduce(
    (count, episode) =>
      count + (watchedEpisodeKeys.has(getTvEpisodeKey(episode)) ? 1 : 0),
    0
  );

  return {
    progressPercent:
      totalEpisodeCount > 0
        ? Math.round((watchedEpisodeCount / totalEpisodeCount) * 100)
        : 0,
    status: deriveTvLibraryStatus({
      intentStatus,
      totalEpisodeCount,
      watchedEpisodeCount,
    }),
    totalEpisodeCount,
    watchedEpisodeCount,
  };
};

export const projectWatchedKeysForStatus = ({
  availableEpisodes,
  currentWatchedEpisodeKeys,
  status,
}: {
  availableEpisodes: ReadonlyArray<TvAvailableEpisode>;
  currentWatchedEpisodeKeys: ReadonlySet<string>;
  status: TvLibrarySectionStatus;
}) => {
  if (status === WatchStatus.Completed) {
    return new Set(availableEpisodes.map(getTvEpisodeKey));
  }

  if (status === WatchStatus.Planned) {
    return new Set<string>();
  }

  const availableKeys = availableEpisodes.map(getTvEpisodeKey);
  const watchedKeys = new Set(
    availableKeys.filter((key) => currentWatchedEpisodeKeys.has(key))
  );

  if (availableKeys.length <= 1) {
    watchedKeys.clear();
    return watchedKeys;
  }

  if (watchedKeys.size === 0) {
    watchedKeys.add(availableKeys[0]);
  } else if (watchedKeys.size === availableKeys.length) {
    watchedKeys.delete(availableKeys.at(-1) as string);
  }

  return watchedKeys;
};

export const toTvEpisodeProgressValues = (
  availableEpisodes: ReadonlyArray<TvAvailableEpisode>,
  watchedEpisodeKeys: ReadonlySet<string>
): Array<TvEpisodeProgressValue> =>
  availableEpisodes.map((episode) => ({
    ...episode,
    watched: watchedEpisodeKeys.has(getTvEpisodeKey(episode)),
  }));

export const groupTvLibraryItems = (
  items: ReadonlyArray<TvLibraryItem>
): Record<TvLibrarySectionStatus, Array<TvLibraryItem>> => ({
  [WatchStatus.Completed]: items.filter(
    (item) => item.status === WatchStatus.Completed
  ),
  [WatchStatus.Planned]: items.filter(
    (item) => item.status === WatchStatus.Planned
  ),
  [WatchStatus.Watching]: items.filter(
    (item) => item.status === WatchStatus.Watching
  ),
});

export const updateTvLibraryItemFromProjection = (
  items: ReadonlyArray<TvLibraryItem>,
  tmdbId: number,
  intentStatus: TvWatchStatus,
  projection: TvLibraryProjection
) =>
  items.map((item) =>
    item.tmdbId === tmdbId ? { ...item, ...projection, intentStatus } : item
  );

export const getOptimisticTvLibraryProjection = (
  item: TvLibraryItem,
  status: TvLibrarySectionStatus
): TvLibraryProjection => {
  let watchedEpisodeCount = item.watchedEpisodeCount;
  let resolvedStatus = status;

  if (status === WatchStatus.Completed) {
    watchedEpisodeCount = item.totalEpisodeCount;
  } else if (status === WatchStatus.Planned) {
    watchedEpisodeCount = 0;
  } else if (item.totalEpisodeCount <= 1) {
    // A show with zero or one available episode can never be "partway
    // through" — watching its only episode completes it. Selecting
    // Watching for such a show can only resolve to Planned.
    watchedEpisodeCount = 0;
    resolvedStatus = WatchStatus.Planned;
  } else if (watchedEpisodeCount === 0) {
    watchedEpisodeCount = 1;
  } else if (watchedEpisodeCount >= item.totalEpisodeCount) {
    watchedEpisodeCount = item.totalEpisodeCount - 1;
  }

  return {
    progressPercent:
      item.totalEpisodeCount > 0
        ? Math.round((watchedEpisodeCount / item.totalEpisodeCount) * 100)
        : 0,
    status: resolvedStatus,
    totalEpisodeCount: item.totalEpisodeCount,
    watchedEpisodeCount,
  };
};

export const removeTvLibraryItem = (
  items: ReadonlyArray<TvLibraryItem>,
  tmdbId: number
) => items.filter((item) => item.tmdbId !== tmdbId);

export const restoreTvLibraryItem = (
  items: ReadonlyArray<TvLibraryItem>,
  restoredItem: TvLibraryItem
) =>
  items.some((item) => item.tmdbId === restoredItem.tmdbId)
    ? [...items]
    : [...items, restoredItem].toSorted((left, right) =>
        right.dateAdded.localeCompare(left.dateAdded)
      );
