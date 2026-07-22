'use server';

import { authOptions } from 'lib/services/auth/index.server';
import {
  addOwnLibraryItem,
  getOwnMedia,
  removeOwnLibraryItem,
} from 'lib/services/database/tracking.server';
import { MediaType } from 'lib/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';

type WatchlistMediaType = MediaType.Movie | MediaType.Tv;

type WatchlistActionInput = {
  mediaType: WatchlistMediaType;
  tmdbId: number;
};

type WatchlistActionResult = {
  isSaved: boolean;
  status: 'saved' | 'removed' | 'login_required' | 'error';
};

const isValidMediaType = (
  mediaType: MediaType
): mediaType is WatchlistMediaType =>
  mediaType === MediaType.Movie || mediaType === MediaType.Tv;

const isValidInput = (input: WatchlistActionInput) =>
  Number.isInteger(input.tmdbId) &&
  input.tmdbId > 0 &&
  isValidMediaType(input.mediaType);

const ensureAuthenticated = async () => {
  const session = await getServerSession(authOptions);

  return Boolean(session?.user?.id);
};

export const getWatchlistSavedState = async (
  input: WatchlistActionInput
): Promise<WatchlistActionResult> => {
  if (!isValidInput(input)) {
    return { isSaved: false, status: 'error' };
  }

  if (!(await ensureAuthenticated())) {
    return { isSaved: false, status: 'login_required' };
  }

  const item = await getOwnMedia(input.tmdbId, input.mediaType);

  return { isSaved: Boolean(item), status: item ? 'saved' : 'removed' };
};

export const addToWatchlist = async (
  input: WatchlistActionInput
): Promise<WatchlistActionResult> => {
  if (!isValidInput(input)) {
    return { isSaved: false, status: 'error' };
  }

  if (!(await ensureAuthenticated())) {
    return { isSaved: false, status: 'login_required' };
  }

  await addOwnLibraryItem(input);
  revalidatePath('/search');
  revalidatePath('/watchlist');
  revalidatePath(input.mediaType === MediaType.Movie ? '/movies' : '/tv-shows');

  return { isSaved: true, status: 'saved' };
};

export const removeFromWatchlist = async (
  input: WatchlistActionInput
): Promise<WatchlistActionResult> => {
  if (!isValidInput(input)) {
    return { isSaved: false, status: 'error' };
  }

  if (!(await ensureAuthenticated())) {
    return { isSaved: false, status: 'login_required' };
  }

  await removeOwnLibraryItem(input.tmdbId, input.mediaType);
  revalidatePath('/search');
  revalidatePath('/watchlist');
  revalidatePath(input.mediaType === MediaType.Movie ? '/movies' : '/tv-shows');

  return { isSaved: false, status: 'removed' };
};
