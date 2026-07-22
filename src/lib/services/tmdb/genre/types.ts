import type { TmdbGenre } from 'lib/services/tmdb/types';

export type GenreListResponse = {
  genres: Array<TmdbGenre>;
};
