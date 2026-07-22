import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieDetailResponse } from './types';
import { normalizeMovieDetailResponse } from './utils';

export const getMovieDetailServer = (id: number) =>
  tmdbServerFetcherCore<MovieDetailResponse>({
    path: `/movie/${id}`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeMovieDetailResponse);
