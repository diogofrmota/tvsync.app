import {
  normalizeBoolean,
  normalizeDate,
  normalizeImagePath,
  normalizeListResponse,
  normalizeNumber,
  normalizeNumberArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type {
  MovieListItemType,
  MovieListResponse,
  TMovieListParams,
} from './types';

const SEARCH_RESOURCE_PATH = '/search/movie';
const DISCOVER_RESOURCE_PATH = '/discover/movie';

export const movieListEndpoint = ({
  include_adult,
  section,
  query,
  sort_by,
  'vote_average.gte': voteAverageGte,
  'vote_count.gte': voteCountGte,
  with_genres,
}: TMovieListParams) => {
  if (query) {
    return SEARCH_RESOURCE_PATH;
  }
  if (section === 'trending_week') {
    return '/trending/movie/week';
  }
  if (
    include_adult ||
    sort_by ||
    voteAverageGte ||
    voteCountGte ||
    with_genres
  ) {
    return DISCOVER_RESOURCE_PATH;
  }
  return `/movie/${section}`;
};

export const normalizeMovieListItem = (
  item: Record<string, unknown>
): MovieListItemType => ({
  adult: normalizeBoolean(item.adult),
  backdrop_path: normalizeImagePath(item.backdrop_path),
  genre_ids: normalizeNumberArray(item.genre_ids),
  id: normalizeNumber(item.id),
  original_language: normalizeText(item.original_language),
  original_title: normalizeText(item.original_title),
  overview: normalizeText(item.overview),
  popularity: normalizeNumber(item.popularity),
  poster_path: normalizeImagePath(item.poster_path),
  release_date: normalizeDate(item.release_date),
  title: normalizeText(item.title, normalizeText(item.original_title)),
  video: normalizeBoolean(item.video),
  vote_average: normalizeNumber(item.vote_average),
  vote_count: normalizeNumber(item.vote_count),
});

export const normalizeMovieListResponse = (
  response: Partial<MovieListResponse> | undefined
): MovieListResponse => ({
  ...normalizeListResponse(response, normalizeMovieListItem),
  dates: {
    maximum: normalizeDate(response?.dates?.maximum),
    minimum: normalizeDate(response?.dates?.minimum),
  },
});
