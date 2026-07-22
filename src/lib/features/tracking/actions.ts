'use server';

import { authOptions } from 'lib/services/auth/index.server';
import {
  getOwnEpisodeProgress,
  getOwnMedia,
  listOwnEpisodeProgressForSeason,
  listOwnEpisodeProgressForShow,
  upsertOwnEpisodeProgress,
  upsertOwnMedia,
} from 'lib/services/database/tracking.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { getTVSeasonDetailsServer } from 'lib/services/tmdb/tv/season/index.server';
import {
  MediaType,
  MOVIE_WATCH_STATUSES,
  type TrackableMediaType,
  TV_WATCH_STATUSES,
  WatchStatus,
} from 'lib/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';

type TrackingActionStatus = 'error' | 'login_required' | 'removed' | 'saved';

type MediaStatusInput = {
  mediaType: TrackableMediaType;
  status: WatchStatus;
  tmdbId: number;
};

type EpisodeProgressInput = {
  episodeNumber: number;
  seasonNumber: number;
  tmdbShowId: number;
  watched: boolean;
};

type SeasonProgressInput = {
  seasonNumber: number;
  tmdbShowId: number;
  watched: boolean;
};

export type MediaTrackingStateResult = {
  status: TrackingActionStatus;
  watchStatus: WatchStatus | null;
};

export type EpisodeProgressStateResult = {
  status: TrackingActionStatus;
  watched: boolean;
};

export type SeasonProgressStateResult = {
  status: TrackingActionStatus;
  watchedEpisodeNumbers: Array<number>;
};

export type TvProgressSummaryResult = {
  lastWatchedAt: string | null;
  nextEpisode: {
    episodeNumber: number;
    name: string;
    seasonNumber: number;
  } | null;
  progressPercent: number;
  status: TrackingActionStatus;
  totalEpisodeCount: number;
  watchedEpisodeCount: number;
  watchedSeasonCount: number;
};

const ensureAuthenticated = async () => {
  const session = await getServerSession(authOptions);

  return Boolean(session?.user?.id);
};

const isValidMediaType = (
  mediaType: TrackableMediaType
): mediaType is TrackableMediaType =>
  mediaType === MediaType.Movie || mediaType === MediaType.Tv;

const isValidStatusForMedia = (
  mediaType: TrackableMediaType,
  status: WatchStatus
) => {
  if (mediaType === MediaType.Movie) {
    return (MOVIE_WATCH_STATUSES as ReadonlyArray<WatchStatus>).includes(
      status
    );
  }

  return (TV_WATCH_STATUSES as ReadonlyArray<WatchStatus>).includes(status);
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: number) =>
  Number.isInteger(value) && value >= 0;

const getLastWatchedAtForStatus = (status: WatchStatus) =>
  status === WatchStatus.Watched || status === WatchStatus.Completed
    ? new Date()
    : null;

const revalidateMediaPaths = (
  tmdbId: number,
  mediaType: TrackableMediaType
) => {
  revalidatePath('/watchlist');
  revalidatePath(mediaType === MediaType.Movie ? '/movies' : '/tv-shows');

  if (mediaType === MediaType.Movie) {
    revalidatePath(`/movie/${tmdbId}`);
    return;
  }

  revalidatePath(`/tv/show/${tmdbId}`);
};

const revalidateEpisodePaths = (
  tmdbShowId: number,
  seasonNumber: number,
  episodeNumber?: number
) => {
  revalidatePath(`/tv/show/${tmdbShowId}`);
  revalidatePath(`/tv/show/${tmdbShowId}/season/${seasonNumber}`);

  if (episodeNumber) {
    revalidatePath(
      `/tv/show/${tmdbShowId}/season/${seasonNumber}/episode/${episodeNumber}`
    );
  }
};

export const getMediaTrackingState = async ({
  mediaType,
  tmdbId,
}: Omit<MediaStatusInput, 'status'>): Promise<MediaTrackingStateResult> => {
  if (!(isPositiveInteger(tmdbId) && isValidMediaType(mediaType))) {
    return { status: 'error', watchStatus: null };
  }

  if (!(await ensureAuthenticated())) {
    return { status: 'login_required', watchStatus: null };
  }

  const item = await getOwnMedia(tmdbId, mediaType);

  return {
    status: item ? 'saved' : 'removed',
    watchStatus: item?.watch_status ?? null,
  };
};

export const setMediaWatchStatus = async (
  input: MediaStatusInput
): Promise<MediaTrackingStateResult> => {
  if (
    !(
      isPositiveInteger(input.tmdbId) &&
      isValidMediaType(input.mediaType) &&
      isValidStatusForMedia(input.mediaType, input.status)
    )
  ) {
    return { status: 'error', watchStatus: null };
  }

  if (!(await ensureAuthenticated())) {
    return { status: 'login_required', watchStatus: null };
  }

  await upsertOwnMedia({
    lastWatchedAt: getLastWatchedAtForStatus(input.status),
    mediaType: input.mediaType,
    tmdbId: input.tmdbId,
    watchStatus: input.status,
  });
  revalidateMediaPaths(input.tmdbId, input.mediaType);

  return { status: 'saved', watchStatus: input.status };
};

export const getEpisodeProgressState = async ({
  episodeNumber,
  seasonNumber,
  tmdbShowId,
}: Omit<
  EpisodeProgressInput,
  'watched'
>): Promise<EpisodeProgressStateResult> => {
  if (
    !(
      isPositiveInteger(tmdbShowId) &&
      isNonNegativeInteger(seasonNumber) &&
      isPositiveInteger(episodeNumber)
    )
  ) {
    return { status: 'error', watched: false };
  }

  if (!(await ensureAuthenticated())) {
    return { status: 'login_required', watched: false };
  }

  const progress = await getOwnEpisodeProgress(
    tmdbShowId,
    seasonNumber,
    episodeNumber
  );

  return {
    status: progress ? 'saved' : 'removed',
    watched: Boolean(progress?.watched),
  };
};

export const setEpisodeWatched = async (
  input: EpisodeProgressInput
): Promise<EpisodeProgressStateResult> => {
  if (
    !(
      isPositiveInteger(input.tmdbShowId) &&
      isNonNegativeInteger(input.seasonNumber) &&
      isPositiveInteger(input.episodeNumber)
    )
  ) {
    return { status: 'error', watched: false };
  }

  if (!(await ensureAuthenticated())) {
    return { status: 'login_required', watched: false };
  }

  await upsertOwnEpisodeProgress({
    episodeNumber: input.episodeNumber,
    seasonNumber: input.seasonNumber,
    tmdbShowId: input.tmdbShowId,
    watched: input.watched,
    watchedAt: input.watched ? new Date() : null,
  });
  revalidateEpisodePaths(
    input.tmdbShowId,
    input.seasonNumber,
    input.episodeNumber
  );

  return { status: 'saved', watched: input.watched };
};

export const getSeasonProgressState = async ({
  seasonNumber,
  tmdbShowId,
}: Omit<
  SeasonProgressInput,
  'watched'
>): Promise<SeasonProgressStateResult> => {
  if (!(isPositiveInteger(tmdbShowId) && isNonNegativeInteger(seasonNumber))) {
    return { status: 'error', watchedEpisodeNumbers: [] };
  }

  if (!(await ensureAuthenticated())) {
    return { status: 'login_required', watchedEpisodeNumbers: [] };
  }

  const rows = await listOwnEpisodeProgressForSeason(tmdbShowId, seasonNumber);

  return {
    status: 'saved',
    watchedEpisodeNumbers: rows
      .filter((row) => row.watched)
      .map((row) => row.episode_number),
  };
};

export const setSeasonWatched = async (
  input: SeasonProgressInput
): Promise<SeasonProgressStateResult> => {
  if (
    !(
      isPositiveInteger(input.tmdbShowId) &&
      isNonNegativeInteger(input.seasonNumber)
    )
  ) {
    return { status: 'error', watchedEpisodeNumbers: [] };
  }

  if (!(await ensureAuthenticated())) {
    return { status: 'login_required', watchedEpisodeNumbers: [] };
  }

  const season = await getTVSeasonDetailsServer({
    seasonNumber: input.seasonNumber,
    showId: input.tmdbShowId,
  });

  const episodeNumbers = season.episodes.map(
    (episode) => episode.episode_number
  );

  await Promise.all(
    episodeNumbers.map((episodeNumber) =>
      upsertOwnEpisodeProgress({
        episodeNumber,
        seasonNumber: input.seasonNumber,
        tmdbShowId: input.tmdbShowId,
        watched: input.watched,
        watchedAt: input.watched ? new Date() : null,
      })
    )
  );
  revalidateEpisodePaths(input.tmdbShowId, input.seasonNumber);

  return {
    status: 'saved',
    watchedEpisodeNumbers: input.watched ? episodeNumbers : [],
  };
};

export const getTvProgressSummary = async (
  tmdbShowId: number
): Promise<TvProgressSummaryResult> => {
  if (!isPositiveInteger(tmdbShowId)) {
    return {
      lastWatchedAt: null,
      nextEpisode: null,
      progressPercent: 0,
      status: 'error',
      totalEpisodeCount: 0,
      watchedEpisodeCount: 0,
      watchedSeasonCount: 0,
    };
  }

  if (!(await ensureAuthenticated())) {
    return {
      lastWatchedAt: null,
      nextEpisode: null,
      progressPercent: 0,
      status: 'login_required',
      totalEpisodeCount: 0,
      watchedEpisodeCount: 0,
      watchedSeasonCount: 0,
    };
  }

  const [show, progressRows] = await Promise.all([
    getTvShowDetail(tmdbShowId),
    listOwnEpisodeProgressForShow(tmdbShowId),
  ]);
  const seasons = show.seasons.filter(
    (season) => season.season_number > 0 && season.episode_count > 0
  );
  const seasonDetails = await Promise.all(
    seasons.map((season) =>
      getTVSeasonDetailsServer({
        seasonNumber: season.season_number,
        showId: tmdbShowId,
      })
    )
  );
  const episodes = seasonDetails
    .flatMap((season) =>
      season.episodes.map((episode) => ({
        episodeNumber: episode.episode_number,
        name: episode.name || `Episode ${episode.episode_number}`,
        seasonNumber: season.season_number,
      }))
    )
    .sort((left, right) =>
      left.seasonNumber === right.seasonNumber
        ? left.episodeNumber - right.episodeNumber
        : left.seasonNumber - right.seasonNumber
    );
  const watchedRows = progressRows.filter((row) => row.watched);
  const watchedKeys = new Set(
    watchedRows.map((row) => `${row.season_number}:${row.episode_number}`)
  );
  const totalEpisodeCount = episodes.length || show.number_of_episodes;
  const watchedEpisodeCount = watchedKeys.size;
  const nextEpisode =
    episodes.find(
      (episode) =>
        !watchedKeys.has(`${episode.seasonNumber}:${episode.episodeNumber}`)
    ) ?? null;
  const watchedSeasonCount = seasonDetails.filter((season) =>
    season.episodes.every((episode) =>
      watchedKeys.has(`${season.season_number}:${episode.episode_number}`)
    )
  ).length;
  const lastWatchedAt =
    watchedRows
      .map((row) => row.watched_at)
      .filter((watchedAt): watchedAt is string => Boolean(watchedAt))
      .sort()
      .at(-1) ?? null;

  return {
    lastWatchedAt,
    nextEpisode,
    progressPercent:
      totalEpisodeCount > 0
        ? Math.round((watchedEpisodeCount / totalEpisodeCount) * 100)
        : 0,
    status: 'saved',
    totalEpisodeCount,
    watchedEpisodeCount,
    watchedSeasonCount,
  };
};
