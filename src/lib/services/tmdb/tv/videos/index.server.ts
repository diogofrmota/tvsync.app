import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvVideosResponse } from './types';
import { normalizeTvVideosResponse } from './utils';

export const getTvVideosServer = (id: number | string) =>
  tmdbServerFetcherCore<TvVideosResponse>({
    path: `/tv/${id}/videos`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeTvVideosResponse);
