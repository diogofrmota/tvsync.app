import { TV_SHOW_SEARCH_RESOURCE_PATH } from 'lib/services/tmdb/tv/list/constants';
import {
  normalizeTVShowListResponse,
  tvShowListEndpoint,
} from 'lib/services/tmdb/tv/list/utils';
import {
  tmdbServerFetcher,
  tmdbServerFetcherCore,
} from 'lib/services/tmdb/utils.server';

import type {
  SearchTVShowParams,
  TVShowListParams,
  TVShowListResponse,
  TVShowListType,
} from './types';

export const getTVShowByListType = (
  listType: TVShowListType,
  params?: TVShowListParams,
  revalidate?: number
) =>
  tmdbServerFetcherCore<TVShowListResponse>({
    path: tvShowListEndpoint({
      include_adult: params?.include_adult,
      listType,
      sort_by: params?.sort_by,
      'vote_average.gte': params?.['vote_average.gte'],
      'vote_count.gte': params?.['vote_count.gte'],
      with_genres: params?.with_genres,
    }),
    params,
    reqInit: { next: { revalidate } },
  }).then(normalizeTVShowListResponse);

export const getDiscoverTVShowsServer = (params?: TVShowListParams) =>
  tmdbServerFetcherCore<TVShowListResponse>({
    path: '/discover/tv',
    params,
    reqInit: { next: { revalidate: 86_400 } },
  }).then(normalizeTVShowListResponse);

export const getTVShowSearchResultList = (params: SearchTVShowParams) =>
  tmdbServerFetcher<TVShowListResponse>(
    TV_SHOW_SEARCH_RESOURCE_PATH,
    params
  ).then(normalizeTVShowListResponse);

export const getTrendingTVShowsServer = (
  params?: TVShowListParams,
  timeWindow: 'day' | 'week' = 'day'
) =>
  tmdbServerFetcherCore<TVShowListResponse>({
    path: `/trending/tv/${timeWindow}`,
    params,
    reqInit: { next: { revalidate: 43_200 } },
  }).then(normalizeTVShowListResponse);
