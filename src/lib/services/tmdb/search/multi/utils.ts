import {
  normalizeBoolean,
  normalizeDate,
  normalizeImagePath,
  normalizeListResponse,
  normalizeNumber,
  normalizeNumberArray,
  normalizeObjectArray,
  normalizeStringArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';
import { MediaType } from 'lib/types';

import type { MultiSearchResponse, MultiSearchResult } from './types';

const normalizeMediaType = (value: unknown) =>
  value === MediaType.Movie || value === MediaType.Tv || value === MediaType.Person
    ? value
    : MediaType.Movie;

export const normalizeMultiSearchResult = (
  item: Record<string, unknown>
): MultiSearchResult => ({
  adult: normalizeBoolean(item.adult),
  backdrop_path: normalizeImagePath(item.backdrop_path),
  first_air_date: normalizeDate(item.first_air_date),
  genre_ids: normalizeNumberArray(item.genre_ids),
  id: normalizeNumber(item.id),
  known_for: normalizeObjectArray(item.known_for, normalizeMultiSearchResult),
  media_type: normalizeMediaType(item.media_type),
  name: normalizeText(item.name, normalizeText(item.original_name)),
  origin_country: normalizeStringArray(item.origin_country),
  original_language: normalizeText(item.original_language),
  original_name: normalizeText(item.original_name),
  original_title: normalizeText(item.original_title),
  overview: normalizeText(item.overview),
  popularity: normalizeNumber(item.popularity),
  poster_path: normalizeImagePath(item.poster_path),
  profile_path: normalizeImagePath(item.profile_path),
  release_date: normalizeDate(item.release_date),
  title: normalizeText(item.title, normalizeText(item.original_title)),
  video: normalizeBoolean(item.video),
  vote_average: normalizeNumber(item.vote_average),
  vote_count: normalizeNumber(item.vote_count),
});

export const normalizeMultiSearchResponse = (
  response: Partial<MultiSearchResponse> | undefined
): MultiSearchResponse => normalizeListResponse(response, normalizeMultiSearchResult);
