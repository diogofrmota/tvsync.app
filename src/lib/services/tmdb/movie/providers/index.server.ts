import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieWatchProvidersResponse } from './types';
import { normalizeMovieWatchProvidersResponse } from './utils';

export const getMovieWatchProvidersServer = (id: number) =>
  tmdbServerFetcherCore<MovieWatchProvidersResponse>({
    path: `/movie/${id}/watch/providers`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeMovieWatchProvidersResponse);
