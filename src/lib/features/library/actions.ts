'use server';

import { setOwnTvLibraryIntent } from 'lib/features/library/tv-library.server';
import type { TvLibrarySectionStatus } from 'lib/features/library/types';
import { authOptions } from 'lib/services/auth/index.server';
import {
  removeOwnLibraryItem,
  setOwnMovieLibraryStatus,
} from 'lib/services/database/tracking.server';
import {
  MediaType,
  MOVIE_WATCH_STATUSES,
  type MovieWatchStatus,
  WatchStatus,
} from 'lib/types';
import { getServerSession } from 'next-auth/next';

type MovieLibraryMutationInput = {
  status: MovieWatchStatus;
  tmdbId: number;
};

type MovieLibraryRemoveInput = {
  tmdbId: number;
};

type TvLibraryMutationInput = {
  status: TvLibrarySectionStatus;
  tmdbId: number;
};

export type MovieLibraryMutationResult = {
  message: string;
  status: 'error' | 'login_required' | 'removed' | 'saved';
  watchStatus: MovieWatchStatus | null;
};

export type TvLibraryMutationResult = {
  message: string;
  progressPercent: number;
  status: 'error' | 'removed' | 'saved';
  totalEpisodeCount: number;
  watchStatus: TvLibrarySectionStatus | null;
  watchedEpisodeCount: number;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const isAuthenticated = async () =>
  Boolean((await getServerSession(authOptions))?.user?.id);

const isMovieWatchStatus = (
  value: MovieWatchStatus
): value is MovieWatchStatus =>
  (MOVIE_WATCH_STATUSES as ReadonlyArray<WatchStatus>).includes(value);

const isTvLibraryStatus = (
  value: TvLibrarySectionStatus
): value is TvLibrarySectionStatus =>
  value === WatchStatus.Planned ||
  value === WatchStatus.Watching ||
  value === WatchStatus.Completed;

export const updateMovieLibraryStatus = async ({
  status,
  tmdbId,
}: MovieLibraryMutationInput): Promise<MovieLibraryMutationResult> => {
  if (!(isPositiveInteger(tmdbId) && isMovieWatchStatus(status))) {
    return {
      message: 'Choose a valid movie status and try again.',
      status: 'error',
      watchStatus: null,
    };
  }

  if (!(await isAuthenticated())) {
    return {
      message: 'Sign in before changing your movie library.',
      status: 'login_required',
      watchStatus: null,
    };
  }

  try {
    await setOwnMovieLibraryStatus(tmdbId, status);

    return {
      message: 'Your movie status was saved automatically.',
      status: 'saved',
      watchStatus: status,
    };
  } catch {
    return {
      message: 'We could not save that movie status. Please try again.',
      status: 'error',
      watchStatus: null,
    };
  }
};

export const removeMovieFromLibrary = async ({
  tmdbId,
}: MovieLibraryRemoveInput): Promise<MovieLibraryMutationResult> => {
  if (!isPositiveInteger(tmdbId)) {
    return {
      message: 'We could not remove that movie. Please try again.',
      status: 'error',
      watchStatus: null,
    };
  }

  if (!(await isAuthenticated())) {
    return {
      message: 'Sign in before changing your movie library.',
      status: 'login_required',
      watchStatus: null,
    };
  }

  try {
    await removeOwnLibraryItem(tmdbId, MediaType.Movie);

    return {
      message: 'The movie was removed from your library.',
      status: 'removed',
      watchStatus: null,
    };
  } catch {
    return {
      message: 'We could not remove that movie. Please try again.',
      status: 'error',
      watchStatus: null,
    };
  }
};

const tvMutationError = (message: string): TvLibraryMutationResult => ({
  message,
  progressPercent: 0,
  status: 'error',
  totalEpisodeCount: 0,
  watchStatus: null,
  watchedEpisodeCount: 0,
});

export const updateTvLibraryStatus = async ({
  status,
  tmdbId,
}: TvLibraryMutationInput): Promise<TvLibraryMutationResult> => {
  if (!(isPositiveInteger(tmdbId) && isTvLibraryStatus(status))) {
    return tvMutationError('Choose a valid TV show status and try again.');
  }

  try {
    const projection = await setOwnTvLibraryIntent(tmdbId, status);

    return {
      ...projection,
      message: 'Your TV show status and progress were saved automatically.',
      status: 'saved',
      watchStatus: projection.status,
    };
  } catch {
    return tvMutationError(
      'We could not save that TV show status. Please try again.'
    );
  }
};

export const removeTvShowFromLibrary = async ({
  tmdbId,
}: MovieLibraryRemoveInput): Promise<TvLibraryMutationResult> => {
  if (!isPositiveInteger(tmdbId)) {
    return tvMutationError(
      'We could not remove that TV show. Please try again.'
    );
  }

  try {
    await removeOwnLibraryItem(tmdbId, MediaType.Tv);

    return {
      message: 'The TV show was removed from your library.',
      progressPercent: 0,
      status: 'removed',
      totalEpisodeCount: 0,
      watchStatus: null,
      watchedEpisodeCount: 0,
    };
  } catch {
    return tvMutationError(
      'We could not remove that TV show. Please try again.'
    );
  }
};
