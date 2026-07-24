import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
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
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.detail } },
  }).then(normalizeTVSeasonDetailsResponse);
