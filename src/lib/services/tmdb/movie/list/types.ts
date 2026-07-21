import type {
  TmdbAPIListResponse,
  TmdbDateString,
  TmdbImagePath,
  TmdbListParams,
} from 'lib/services/tmdb/types';

export type ListType =
  | 'now_playing'
  | 'popular'
  | 'top_rated'
  | 'trending_week'
  | 'upcoming';

export type MovieListParams = TmdbListParams & {
  include_adult?: boolean | string;
  query?: string;
  sort_by?: string;
  'vote_average.gte'?: number | string;
  'vote_count.gte'?: number | string;
  with_genres?: string | Array<string>;
};

export type TMovieListParams = Pick<
  MovieListParams,
  | 'include_adult'
  | 'query'
  | 'sort_by'
  | 'vote_average.gte'
  | 'vote_count.gte'
  | 'with_genres'
> & {
  section: ListType;
};

export type MovieListItemType = {
  poster_path: TmdbImagePath;
  adult: boolean;
  overview: string;
  release_date: TmdbDateString;
  genre_ids: Array<number>;
  id: number;
  original_title: string;
  original_language: string;
  title: string;
  backdrop_path: TmdbImagePath;
  popularity: number;
  vote_count: number;
  video: boolean;
  vote_average: number;
};

export type DatesType = {
  maximum: string;
  minimum: string;
};

export type MovieListResponse = TmdbAPIListResponse<MovieListItemType> & {
  dates: DatesType;
};
