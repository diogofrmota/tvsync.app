import type {
  MultiSearchParams,
  MultiSearchResponse,
} from 'lib/services/tmdb/search/multi/types';

export type TrendingTimeWindow = 'day' | 'week';
export type TrendingMediaType = 'all' | 'movie' | 'tv' | 'person';

export type TrendingParams = Omit<MultiSearchParams, 'query'>;

export type TrendingResponse = MultiSearchResponse;
