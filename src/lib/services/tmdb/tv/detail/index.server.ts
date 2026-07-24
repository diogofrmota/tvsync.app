import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvShowDetail } from './types';
import { normalizeTVShowDetailResponse } from './utils';

export const getTvShowDetail = (id: number | string) =>
  tmdbServerFetcherCore<TvShowDetail>({
    path: `/tv/${id}`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.detail } },
  }).then(normalizeTVShowDetailResponse);
