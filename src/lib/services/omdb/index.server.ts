import 'server-only';

import type { ImdbRating, OmdbTitleResponse } from './types';
import { IMDB_ID_REGEX, normalizeImdbRating } from './utils';

const OMDB_API_URL = 'https://www.omdbapi.com/';
const OMDB_API_KEY = process.env.OMDB_API_KEY ?? '';
/** IMDb scores drift slowly, so a day-long cache keeps the key well inside its quota. */
const OMDB_REVALIDATE_SECONDS = 86_400;

/**
 * Reads the genuine IMDb rating for a title. Returns `null` — never a
 * substituted TMDB score — when the identifier is missing or malformed, when
 * `OMDB_API_KEY` is not configured, or when OMDb has no rating for the title.
 */
export const getImdbRatingServer = async (
  imdbId: string | null | undefined
): Promise<ImdbRating | null> => {
  if (!(OMDB_API_KEY && imdbId && IMDB_ID_REGEX.test(imdbId))) {
    return null;
  }

  const url = new URL(OMDB_API_URL);
  url.searchParams.set('apikey', OMDB_API_KEY);
  url.searchParams.set('i', imdbId);
  url.searchParams.set('tomatoes', 'false');

  try {
    const response = await fetch(url, {
      next: { revalidate: OMDB_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return null;
    }

    return normalizeImdbRating(
      imdbId,
      (await response.json()) as OmdbTitleResponse
    );
  } catch (error) {
    console.error(`Failed to load the IMDb rating for ${imdbId}:`, error);
    return null;
  }
};
