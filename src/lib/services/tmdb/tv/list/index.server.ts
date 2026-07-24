import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
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

// Top-rated ordering barely moves, trending refreshes twice daily, and the
// remaining curated lists share the daily discovery window.
const tvListRevalidate = (listType: TVShowListType): number => {
  if (listType === 'top_rated') {
    return TMDB_REVALIDATE_SECONDS.topRated;
  }

  if (listType === 'trending_week') {
    return TMDB_REVALIDATE_SECONDS.trending;
  }

  return TMDB_REVALIDATE_SECONDS.list;
};

export const getTVShowByListType = (
  listType: TVShowListType,
  params?: TVShowListParams
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
    reqInit: { next: { revalidate: tvListRevalidate(listType) } },
  }).then(normalizeTVShowListResponse);

export const getDiscoverTVShowsServer = (params?: TVShowListParams) =>
  tmdbServerFetcherCore<TVShowListResponse>({
    path: '/discover/tv',
    params,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.list } },
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
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.trending } },
  }).then(normalizeTVShowListResponse);

export const getSimilarTVShowsServer = (
  id: number | string,
  params?: TVShowListParams
) =>
  tmdbServerFetcherCore<TVShowListResponse>({
    path: `/tv/${id}/similar`,
    params,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.recommendations } },
  }).then(normalizeTVShowListResponse);
