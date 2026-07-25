export type MovieReleaseDate = {
  certification: string;
  release_date: string;
  /** TMDB release type: 3 is theatrical, 4 digital, 5 physical, 6 TV. */
  type: number;
};

export type MovieReleaseDatesResult = {
  iso_3166_1: string;
  release_dates: Array<MovieReleaseDate>;
};

export type MovieReleaseDatesResponse = {
  id: number;
  results: Array<MovieReleaseDatesResult>;
};
