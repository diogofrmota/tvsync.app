import type { TmdbDateString, TmdbImagePath } from 'lib/services/tmdb/types';

export type TVSeasonParams = {
  append_to_response?: string;
  language?: string;
};

export type TVSeasonEpisodeCrew = {
  credit_id: string;
  department: string;
  gender: number;
  id: number;
  job: string;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: TmdbImagePath;
};

export type TVSeasonGuestStar = TVSeasonEpisodeCrew & {
  character: string;
  order: number;
};

export type TVSeasonEpisode = {
  air_date: TmdbDateString;
  crew: Array<TVSeasonEpisodeCrew>;
  episode_number: number;
  episode_type: string;
  guest_stars: Array<TVSeasonGuestStar>;
  id: number;
  name: string;
  overview: string;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path: TmdbImagePath;
  vote_average: number;
  vote_count: number;
};

export type TVSeasonDetailsResponse = {
  _id: string;
  air_date: TmdbDateString;
  episodes: Array<TVSeasonEpisode>;
  id: number;
  name: string;
  overview: string;
  poster_path: TmdbImagePath;
  season_number: number;
  vote_average: number;
};
