import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvExternalIdsResponse } from './types';
import { normalizeTvExternalIdsResponse } from './utils';

export const getTvExternalIdsServer = (id: number | string) =>
  tmdbServerFetcherCore<TvExternalIdsResponse>({
    path: `/tv/${id}/external_ids`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.detail } },
  }).then(normalizeTvExternalIdsResponse);
