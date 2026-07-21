import type { TVSeasonEpisode } from 'lib/services/tmdb/tv/season/types';

export type TVEpisodeParams = {
  append_to_response?: string;
  language?: string;
};

export type TVEpisodeDetailsResponse = TVSeasonEpisode;
