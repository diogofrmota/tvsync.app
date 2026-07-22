import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieVideosResponse } from './types';
import { normalizeMovieVideosResponse } from './utils';

export const getMovieVideosServer = (id: number) =>
  tmdbServerFetcherCore<MovieVideosResponse>({
    path: `/movie/${id}/videos`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeMovieVideosResponse);
