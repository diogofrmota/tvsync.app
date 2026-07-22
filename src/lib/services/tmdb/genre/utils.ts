import {
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { GenreListResponse } from './types';

export const normalizeGenreListResponse = (
  response: Partial<GenreListResponse> | undefined
): GenreListResponse => ({
  genres: normalizeObjectArray(response?.genres, (genre) => ({
    id: normalizeNumber(genre.id),
    name: normalizeText(genre.name),
  })).filter((genre) => genre.id > 0 && Boolean(genre.name)),
});
