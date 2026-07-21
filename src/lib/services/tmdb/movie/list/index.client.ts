import {
  movieListEndpoint,
  normalizeMovieListResponse,
} from 'lib/services/tmdb/movie/list/utils';
import { useTmdbSWR } from 'lib/services/tmdb/utils.client';

import type { ListType, MovieListParams, MovieListResponse } from './types';

export const useMovieList = (
  section: ListType = 'popular',
  params?: MovieListParams,
  fallbackData?: MovieListResponse,
  isReady?: boolean
) =>
  useTmdbSWR<MovieListResponse>({
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
    fallbackData,
    isReady,
    transform: normalizeMovieListResponse,
  });

export const useMovieRecommendations = (id: number) =>
  useTmdbSWR<MovieListResponse>({
    path: `/movie/${id}/recommendations`,
    transform: normalizeMovieListResponse,
  });

export const useTrendingMovies = (
  params?: MovieListParams,
  fallbackData?: MovieListResponse,
  isReady?: boolean
) =>
  useTmdbSWR<MovieListResponse>({
    path: '/trending/movie/day',
    params,
    fallbackData,
    isReady,
    transform: normalizeMovieListResponse,
  });
