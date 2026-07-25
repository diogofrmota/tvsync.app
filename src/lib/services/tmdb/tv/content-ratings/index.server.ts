import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvContentRatingsResponse } from './types';
import { normalizeTvContentRatingsResponse } from './utils';

export const getTvContentRatingsServer = (id: number | string) =>
  tmdbServerFetcherCore<TvContentRatingsResponse>({
    path: `/tv/${id}/content_ratings`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.detail } },
  }).then(normalizeTvContentRatingsResponse);
