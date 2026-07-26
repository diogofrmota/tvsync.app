import {
  TMDB_REVALIDATE_SECONDS,
  type TmdbCacheOptions,
  tmdbCacheInit,
} from 'lib/services/tmdb/constants';
import {
  movieListEndpoint,
  normalizeMovieListResponse,
} from 'lib/services/tmdb/movie/list/utils';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { ListType, MovieListParams, MovieListResponse } from './types';

// Free-text searches are high cardinality and change often, top-rated ordering
// barely moves, and everything else refreshes on the shared daily window.
const movieListRevalidate = (
  section: ListType,
  params?: MovieListParams
): number => {
  if (params?.query) {
    return TMDB_REVALIDATE_SECONDS.search;
  }

  if (section === 'top_rated') {
    return TMDB_REVALIDATE_SECONDS.topRated;
  }

  if (section === 'trending_week') {
    return TMDB_REVALIDATE_SECONDS.trending;
  }

  return TMDB_REVALIDATE_SECONDS.list;
};

export const getMovieListServer = ({
  cache,
  section = 'popular',
  params,
}: {
  cache?: TmdbCacheOptions;
  section: ListType;
  params?: MovieListParams;
}) =>
  tmdbServerFetcherCore<MovieListResponse>({
    path: movieListEndpoint({
      include_adult: params?.include_adult,
      section,
      query: params?.query,
      sort_by: params?.sort_by,
      'vote_average.gte': params?.['vote_average.gte'],
      'vote_count.gte': params?.['vote_count.gte'],
      with_genres: params?.with_genres,
    }),
    params,
    reqInit: tmdbCacheInit(movieListRevalidate(section, params), cache),
  }).then(normalizeMovieListResponse);

export const getTrendingMoviesServer = (
  params?: MovieListParams,
  timeWindow: 'day' | 'week' = 'day',
  cache?: TmdbCacheOptions
) =>
  tmdbServerFetcherCore<MovieListResponse>({
    path: `/trending/movie/${timeWindow}`,
    params,
    reqInit: tmdbCacheInit(TMDB_REVALIDATE_SECONDS.trending, cache),
  }).then(normalizeMovieListResponse);

export const getMovieRecommendationsServer = (
  id: number,
  params?: MovieListParams
) =>
  tmdbServerFetcherCore<MovieListResponse>({
    path: `/movie/${id}/recommendations`,
    params,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.recommendations } },
  }).then(normalizeMovieListResponse);

export const getSimilarMoviesServer = (id: number, params?: MovieListParams) =>
  tmdbServerFetcherCore<MovieListResponse>({
    path: `/movie/${id}/similar`,
    params,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.recommendations } },
  }).then(normalizeMovieListResponse);
