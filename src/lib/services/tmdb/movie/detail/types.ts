import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import type {
  TmdbGenre,
  TmdbProductionCompany,
  TmdbProductionCountry,
  TmdbSpokenLanguage,
} from 'lib/services/tmdb/types';

export type MovieDetailResponse = Omit<MovieListItemType, 'genre_ids'> & {
  belongs_to_collection?: Record<string, unknown>;
  budget: number;
  genres: Array<TmdbGenre>;
  homepage?: string;
  imdb_id?: string;
  original_language: string;
  original_title: string;
  production_companies: Array<TmdbProductionCompany>;
  production_countries: Array<TmdbProductionCountry>;
  revenue: number;
  runtime?: number;
  spoken_languages: Array<TmdbSpokenLanguage>;
  status?:
    | 'Rumored'
    | 'Planned'
    | 'In Production'
    | 'Post Production'
    | 'Released'
    | 'Canceled';
  tagline?: string;
};
