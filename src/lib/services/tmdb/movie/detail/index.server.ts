import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieDetailResponse } from './types';
import { normalizeMovieDetailResponse } from './utils';

export const getMovieDetailServer = (id: number) =>
  tmdbServerFetcherCore<MovieDetailResponse>({
    path: `/movie/${id}`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.detail } },
  }).then(normalizeMovieDetailResponse);
