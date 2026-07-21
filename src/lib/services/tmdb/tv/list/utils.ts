import {
  normalizeDate,
  normalizeImagePath,
  normalizeListResponse,
  normalizeNumber,
  normalizeNumberArray,
  normalizeStringArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { TVShowItem, TVShowListParams, TVShowListResponse } from './types';

export const normalizeTVShowItem = (
  item: Record<string, unknown>
): TVShowItem => ({
  backdrop_path: normalizeImagePath(item.backdrop_path),
  first_air_date: normalizeDate(item.first_air_date),
  genre_ids: normalizeNumberArray(item.genre_ids),
  id: normalizeNumber(item.id),
  name: normalizeText(item.name, normalizeText(item.original_name)),
  origin_country: normalizeStringArray(item.origin_country),
  original_language: normalizeText(item.original_language),
  original_name: normalizeText(item.original_name),
  overview: normalizeText(item.overview),
  popularity: normalizeNumber(item.popularity),
  poster_path: normalizeImagePath(item.poster_path),
  vote_average: normalizeNumber(item.vote_average),
  vote_count: normalizeNumber(item.vote_count),
});

export const normalizeTVShowListResponse = (
  response: Partial<TVShowListResponse> | undefined
): TVShowListResponse => normalizeListResponse(response, normalizeTVShowItem);

const DISCOVER_RESOURCE_PATH = '/discover/tv';

export const tvShowListEndpoint = ({
  include_adult,
  listType,
  sort_by,
  'vote_average.gte': voteAverageGte,
  'vote_count.gte': voteCountGte,
  with_genres,
}: Pick<
  TVShowListParams,
  | 'include_adult'
  | 'sort_by'
  | 'vote_average.gte'
  | 'vote_count.gte'
  | 'with_genres'
> & {
  listType: string;
}) => {
  if (listType === 'trending_week') {
    return '/trending/tv/week';
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

  return `/tv/${listType}`;
};
