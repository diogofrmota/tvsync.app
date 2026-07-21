export const DEFAULT_TMDB_API_URL = 'https://api.themoviedb.org/3';

export const TMDB_API_URL = process.env.TMDB_API_URL || DEFAULT_TMDB_API_URL;
export const TMDB_API_KEY = process.env.TMDB_API_KEY ?? '';
