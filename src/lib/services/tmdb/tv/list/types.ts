import type {
  TmdbAPIListResponse,
  TmdbDateString,
  TmdbImagePath,
  TmdbListParams,
} from 'lib/services/tmdb/types';

export enum TVShowList {
  airing_today = 'airing_today',
  on_the_air = 'on_the_air',
  popular = 'popular',
  top_rated = 'top_rated',
}

export type TVShowListType = keyof typeof TVShowList | 'trending_week';

export type TVShowListParams = TmdbListParams & {
  include_adult?: boolean | string;
  sort_by?: string;
  'vote_average.gte'?: number | string;
  'vote_count.gte'?: number | string;
  with_genres?: string | Array<string>;
};

export type SearchTVShowParams = TVShowListParams & {
  query: string;
  include_adult?: boolean;
  first_air_date_year?: number;
};

export type TVShowItem = {
  poster_path: TmdbImagePath;
  popularity: number;
  id: number;
  backdrop_path: TmdbImagePath;
  vote_average: number;
  overview: string;
  first_air_date: TmdbDateString;
  origin_country: Array<string>;
  genre_ids: Array<number>;
  original_language: string;
  vote_count: number;
  name: string;
  original_name: string;
};

export type TVShowListResponse = TmdbAPIListResponse<TVShowItem>;
