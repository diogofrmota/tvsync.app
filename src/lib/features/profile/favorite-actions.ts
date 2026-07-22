'use server';

import { authOptions } from 'lib/services/auth/index.server';
import {
  getOwnFavorite,
  setOwnFavorite,
} from 'lib/services/database/profile.server';
import { MediaType, type TrackableMediaType } from 'lib/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';

export type FavoriteActionResult = {
  favorite: boolean;
  status: 'error' | 'login_required' | 'saved';
};

const isValidInput = (input: {
  mediaType: TrackableMediaType;
  tmdbId: number;
}) =>
  Number.isInteger(input.tmdbId) &&
  input.tmdbId > 0 &&
  (input.mediaType === MediaType.Movie || input.mediaType === MediaType.Tv);

const isAuthenticated = async () =>
  Boolean((await getServerSession(authOptions))?.user?.id);

export const getFavoriteState = async (input: {
  mediaType: TrackableMediaType;
  tmdbId: number;
}): Promise<FavoriteActionResult> => {
  if (!isValidInput(input)) {
    return { favorite: false, status: 'error' };
  }

  if (!(await isAuthenticated())) {
    return { favorite: false, status: 'login_required' };
  }

  try {
    return {
      favorite: await getOwnFavorite(input.tmdbId, input.mediaType),
      status: 'saved',
    };
  } catch {
    return { favorite: false, status: 'error' };
  }
};

export const updateFavorite = async (input: {
  favorite: boolean;
  mediaType: TrackableMediaType;
  tmdbId: number;
}): Promise<FavoriteActionResult> => {
  if (!isValidInput(input)) {
    return { favorite: !input.favorite, status: 'error' };
  }

  if (!(await isAuthenticated())) {
    return { favorite: !input.favorite, status: 'login_required' };
  }

  try {
    await setOwnFavorite(input);
    revalidatePath('/profile');
    revalidatePath(
      input.mediaType === MediaType.Movie
        ? `/movie/${input.tmdbId}`
        : `/tv/show/${input.tmdbId}`
    );

    return { favorite: input.favorite, status: 'saved' };
  } catch {
    return { favorite: !input.favorite, status: 'error' };
  }
};
