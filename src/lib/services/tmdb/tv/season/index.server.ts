import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { TVSeasonDetailsResponse, TVSeasonParams } from './types';
import { normalizeTVSeasonDetailsResponse } from './utils';

export const getTVSeasonDetailsServer = ({
  showId,
  seasonNumber,
  params,
}: {
  showId: number | string;
  seasonNumber: number | string;
  params?: TVSeasonParams;
}) =>
  tmdbServerFetcherCore<TVSeasonDetailsResponse>({
    path: `/tv/${showId}/season/${seasonNumber}`,
    params,
    reqInit: { cache: 'no-store' },
  }).then(normalizeTVSeasonDetailsResponse);
