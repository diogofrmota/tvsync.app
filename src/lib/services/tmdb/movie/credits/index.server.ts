import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieCreditsResponse } from './types';
import { normalizeMovieCreditsResponse } from './utils';

export const getMovieCreditsServer = (id: number) =>
  tmdbServerFetcherCore<MovieCreditsResponse>({
    path: `/movie/${id}/credits`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeMovieCreditsResponse);
