import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TvExternalIdsResponse } from './types';
import { normalizeTvExternalIdsResponse } from './utils';

export const getTvExternalIdsServer = (id: number | string) =>
  tmdbServerFetcherCore<TvExternalIdsResponse>({
    path: `/tv/${id}/external_ids`,
    reqInit: { cache: 'no-store' },
  }).then(normalizeTvExternalIdsResponse);
