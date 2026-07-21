import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TVCreditsResponse } from './types';
import { normalizeTVCreditsResponse } from './utils';

export const getTVShowCreditsServer = (id: number | string) =>
  tmdbServerFetcherCore<TVCreditsResponse>({
    path: `/tv/${id}/credits`,
    reqInit: { next: { revalidate: 604_800 } },
  }).then(normalizeTVCreditsResponse);
