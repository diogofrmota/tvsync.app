import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvShowDetail } from './types';
import { normalizeTVShowDetailResponse } from './utils';

export const getTvShowDetail = (id: number | string) =>
  tmdbServerFetcherCore<TvShowDetail>({
    path: `/tv/${id}`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeTVShowDetailResponse);
