import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvWatchProvidersResponse } from './types';
import { normalizeTvWatchProvidersResponse } from './utils';

export const getTvWatchProvidersServer = (id: number | string) =>
  tmdbServerFetcherCore<TvWatchProvidersResponse>({
    path: `/tv/${id}/watch/providers`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeTvWatchProvidersResponse);
