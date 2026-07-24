import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvWatchProvidersResponse } from './types';
import { normalizeTvWatchProvidersResponse } from './utils';

export const getTvWatchProvidersServer = (id: number | string) =>
  tmdbServerFetcherCore<TvWatchProvidersResponse>({
    path: `/tv/${id}/watch/providers`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.providers } },
  }).then(normalizeTvWatchProvidersResponse);
