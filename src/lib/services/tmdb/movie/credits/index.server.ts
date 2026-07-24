import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieCreditsResponse } from './types';
import { normalizeMovieCreditsResponse } from './utils';

export const getMovieCreditsServer = (id: number) =>
  tmdbServerFetcherCore<MovieCreditsResponse>({
    path: `/movie/${id}/credits`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.credits } },
  }).then(normalizeMovieCreditsResponse);
