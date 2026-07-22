import {
  movieListEndpoint,
  normalizeMovieListResponse,
} from 'lib/services/tmdb/movie/list/utils';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { ListType, MovieListParams, MovieListResponse } from './types';

export const getMovieListServer = ({
  section = 'popular',
  params,
}: {
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
    reqInit: { cache: 'no-store' },
  }).then(normalizeMovieListResponse);

export const getTrendingMoviesServer = (
  params?: MovieListParams,
  timeWindow: 'day' | 'week' = 'day'
) =>
  tmdbServerFetcherCore<MovieListResponse>({
    path: `/trending/movie/${timeWindow}`,
    params,
    reqInit: { next: { revalidate: 43_200 } },
  }).then(normalizeMovieListResponse);

export const getMovieRecommendationsServer = (
  id: number,
  params?: MovieListParams
) =>
  tmdbServerFetcherCore<MovieListResponse>({
    path: `/movie/${id}/recommendations`,
    params,
    reqInit: { cache: 'no-store' },
  }).then(normalizeMovieListResponse);

export const getSimilarMoviesServer = (id: number, params?: MovieListParams) =>
  tmdbServerFetcherCore<MovieListResponse>({
    path: `/movie/${id}/similar`,
    params,
    reqInit: { cache: 'no-store' },
  }).then(normalizeMovieListResponse);
