'use server';

import {
  removeOwnLibraryItem,
  setOwnMovieLibraryStatus,
} from 'lib/services/database/tracking.server';
import {
  MediaType,
  MOVIE_WATCH_STATUSES,
  type MovieWatchStatus,
  type WatchStatus,
} from 'lib/types';
import { revalidatePath } from 'next/cache';

type MovieLibraryMutationInput = {
  status: MovieWatchStatus;
  tmdbId: number;
};

type MovieLibraryRemoveInput = {
  tmdbId: number;
};

export type MovieLibraryMutationResult = {
  message: string;
  status: 'error' | 'removed' | 'saved';
  watchStatus: MovieWatchStatus | null;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const isMovieWatchStatus = (
  value: MovieWatchStatus
): value is MovieWatchStatus =>
  (MOVIE_WATCH_STATUSES as ReadonlyArray<WatchStatus>).includes(value);

const revalidateMovieLibraryPaths = (tmdbId: number) => {
  revalidatePath('/movies');
  revalidatePath('/watchlist');
  revalidatePath(`/movie/${tmdbId}`);
};

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

  try {
    await setOwnMovieLibraryStatus(tmdbId, status);
    revalidateMovieLibraryPaths(tmdbId);

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

  try {
    await removeOwnLibraryItem(tmdbId, MediaType.Movie);
    revalidateMovieLibraryPaths(tmdbId);

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
