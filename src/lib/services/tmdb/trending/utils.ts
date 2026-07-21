import { normalizeMultiSearchResponse } from 'lib/services/tmdb/search/multi/utils';

import type {
  TrendingMediaType,
  TrendingResponse,
  TrendingTimeWindow,
} from './types';

export const trendingEndpoint = ({
  mediaType,
  timeWindow,
}: {
  mediaType: TrendingMediaType;
  timeWindow: TrendingTimeWindow;
}) => `/trending/${mediaType}/${timeWindow}`;

export const normalizeTrendingResponse = (
  response: Partial<TrendingResponse> | undefined
): TrendingResponse => normalizeMultiSearchResponse(response);
