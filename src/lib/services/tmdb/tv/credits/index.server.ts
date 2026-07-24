import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TVCreditsResponse } from './types';
import { normalizeTVCreditsResponse } from './utils';

export const getTVShowCreditsServer = (id: number | string) =>
  tmdbServerFetcherCore<TVCreditsResponse>({
    path: `/tv/${id}/credits`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.credits } },
  }).then(normalizeTVCreditsResponse);
