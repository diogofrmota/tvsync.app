import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvVideosResponse } from './types';
import { normalizeTvVideosResponse } from './utils';

export const getTvVideosServer = (id: number | string) =>
  tmdbServerFetcherCore<TvVideosResponse>({
    path: `/tv/${id}/videos`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.videos } },
  }).then(normalizeTvVideosResponse);
