import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieCreditsResponse } from './types';
import { normalizeMovieCreditsResponse } from './utils';

export const getMovieCreditsServer = (id: number) =>
  tmdbServerFetcherCore<MovieCreditsResponse>({
    path: `/movie/${id}/credits`,
    reqInit: { next: { revalidate: 604_800 } },
  }).then(normalizeMovieCreditsResponse);
