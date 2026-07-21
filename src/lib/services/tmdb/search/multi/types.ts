/**
 * Generated from:
 * - https://developers.themoviedb.org/3/search/multi-search
 * - https://app.quicktype.io/
 */

import type {
  TmdbAPIListResponse,
  TmdbDateString,
} from 'lib/services/tmdb/types';
import type { MediaType } from 'lib/types';

export { MediaType } from 'lib/types';

export interface MultiSearchParams {
  include_adult?: boolean;
  language?: string;
  page?: number;
  query: string;
  region?: string;
}

export type MultiSearchResponse = TmdbAPIListResponse<MultiSearchResult>;

export interface MultiSearchResult {
  adult?: boolean;
  backdrop_path?: null | string;
  first_air_date?: string;
  genre_ids?: Array<number>;
  id: number;
  known_for?: Array<MultiSearchResult>;
  media_type: MediaType;
  name?: string;
  origin_country?: Array<string>;
  original_language?: string;
  original_name?: string;
  original_title?: string;
  overview?: string;
  popularity: number;
  poster_path?: null | string;
  profile_path?: null | string;
  release_date?: TmdbDateString;
  title?: string;
  video?: boolean;
  vote_average?: number;
  vote_count?: number;
}
