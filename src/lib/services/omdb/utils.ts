import type { ImdbRating, OmdbTitleResponse } from './types';

export const IMDB_ID_REGEX = /^tt\d{7,10}$/;
const NON_DIGITS_REGEX = /\D/g;

const parseRating = (value: string | undefined) => {
  const rating = Number(value);

  return Number.isFinite(rating) && rating > 0 && rating <= 10 ? rating : null;
};

const parseVoteCount = (value: string | undefined) => {
  const votes = Number((value ?? '').replaceAll(NON_DIGITS_REGEX, ''));

  return Number.isFinite(votes) && votes > 0 ? votes : null;
};

/**
 * Returns a rating only when OMDb answered successfully for the requested
 * title and reported a real numeric IMDb score. `N/A`, error responses, and
 * identifier mismatches all normalize to `null` so the UI never shows a
 * fabricated or mismatched IMDb rating.
 */
export const normalizeImdbRating = (
  imdbId: string,
  response: OmdbTitleResponse | undefined
): ImdbRating | null => {
  if (response?.Response !== 'True' || response.imdbID !== imdbId) {
    return null;
  }

  const rating = parseRating(response.imdbRating);

  return rating === null
    ? null
    : { imdbId, rating, voteCount: parseVoteCount(response.imdbVotes) };
};
