import {
  normalizeTrendingResponse,
  trendingEndpoint,
} from 'lib/services/tmdb/trending/utils';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type {
  TrendingMediaType,
  TrendingParams,
  TrendingResponse,
  TrendingTimeWindow,
} from './types';

export const getTrendingServer = ({
  mediaType = 'all',
  timeWindow = 'week',
  params,
  revalidate = 43_200,
}: {
  mediaType?: TrendingMediaType;
  timeWindow?: TrendingTimeWindow;
  params?: TrendingParams;
  revalidate?: number;
} = {}) =>
  tmdbServerFetcherCore<TrendingResponse>({
    path: trendingEndpoint({ mediaType, timeWindow }),
    params,
    reqInit: { next: { revalidate } },
  }).then(normalizeTrendingResponse);
