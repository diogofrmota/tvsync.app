import { normalizeGenreListResponse } from 'lib/services/tmdb/genre/utils';
import { useTmdbSWR } from 'lib/services/tmdb/utils.client';
import type { MediaType } from 'lib/types';

import type { GenreListResponse } from './types';

type GenreMediaType = MediaType.Movie | MediaType.Tv;

export const useGenreList = (mediaType: GenreMediaType) =>
  useTmdbSWR<GenreListResponse>({
    path: `/genre/${mediaType}/list`,
    transform: normalizeGenreListResponse,
  });
