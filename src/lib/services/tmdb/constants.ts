export const DEFAULT_TMDB_API_URL = 'https://api.themoviedb.org/3';

export const TMDB_API_URL = process.env.TMDB_API_URL || DEFAULT_TMDB_API_URL;
export const TMDB_API_KEY = process.env.TMDB_API_KEY ?? '';

/**
 * Shared revalidation windows (seconds) for durable TMDB reads served from the
 * Next.js Data Cache. TMDB content is highly cacheable — titles, runtimes, and
 * credits effectively never change once published — so serving repeat reads
 * from the cache keeps the single shared API key far under its per-key rate
 * limit even at very high traffic. Windows are sized by how quickly each
 * resource actually changes.
 */
export const TMDB_REVALIDATE_SECONDS = {
  /** Movie/TV/season/episode/person details and external ids. */
  detail: 86_400, // 24h
  /** Cast and crew lists. */
  credits: 86_400, // 24h
  /** Trailer/video collections. */
  videos: 86_400, // 24h
  /** Streaming availability shifts with licensing windows. */
  providers: 43_200, // 12h
  /** Recommendations and "similar" rails. */
  recommendations: 86_400, // 24h
  /** Member reviews arrive slowly and never change once published. */
  reviews: 43_200, // 12h
  /** Popular / now-playing / on-the-air / discover style lists. */
  list: 86_400, // 24h
  /** Top-rated ordering barely moves week to week. */
  topRated: 604_800, // 7d
  /** Trending refreshes on TMDB roughly twice a day. */
  trending: 43_200, // 12h
  /** Free-text search responses. */
  search: 3600, // 1h
} as const;
