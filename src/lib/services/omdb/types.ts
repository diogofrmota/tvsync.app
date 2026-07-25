/**
 * Genuine IMDb rating for a title, sourced from OMDb (the public IMDb data
 * service). TMDB never exposes IMDb rating values, only the IMDb identifier.
 */
export type ImdbRating = {
  imdbId: string;
  /** IMDb weighted average out of 10. */
  rating: number;
  /** Number of IMDb votes behind the rating, when OMDb reports it. */
  voteCount: number | null;
};

export type OmdbTitleResponse = {
  Response?: string;
  imdbID?: string;
  imdbRating?: string;
  imdbVotes?: string;
};
