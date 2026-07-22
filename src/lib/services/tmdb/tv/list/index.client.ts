import { useTmdbSWR } from 'lib/services/tmdb/utils.client';

import { TV_SHOW_SEARCH_RESOURCE_PATH } from './constants';
import type {
  SearchTVShowParams,
  TVShowListParams,
  TVShowListResponse,
  TVShowListType,
} from './types';
import { normalizeTVShowListResponse, tvShowListEndpoint } from './utils';

type UseTVShowByListArgs = {
  listType: TVShowListType;
  params?: TVShowListParams;
  fallbackData?: TVShowListResponse;
  isReady?: boolean;
};

export const useTVShowByList = ({
  listType,
  params,
  fallbackData,
  isReady,
}: UseTVShowByListArgs) =>
  useTmdbSWR<TVShowListResponse>({
    path: tvShowListEndpoint({
      include_adult: params?.include_adult,
      listType,
      sort_by: params?.sort_by,
      'vote_average.gte': params?.['vote_average.gte'],
      'vote_count.gte': params?.['vote_count.gte'],
      with_genres: params?.with_genres,
    }),
    params,
    fallbackData,
    isReady,
    transform: normalizeTVShowListResponse,
  });

export const useTVShowSearchResultList = (
  params: SearchTVShowParams,
  isReady = true
) =>
  useTmdbSWR<TVShowListResponse>({
    path: TV_SHOW_SEARCH_RESOURCE_PATH,
    params,
    isReady,
    transform: normalizeTVShowListResponse,
  });

export const useTrendingTVShows = (
  params?: TVShowListParams,
  fallbackData?: TVShowListResponse,
  isReady?: boolean
) =>
  useTmdbSWR<TVShowListResponse>({
    path: '/trending/tv/day',
    params,
    fallbackData,
    isReady,
    transform: normalizeTVShowListResponse,
  });
