import {
  normalizeDate,
  normalizeImagePath,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type {
  TVSeasonDetailsResponse,
  TVSeasonEpisode,
  TVSeasonEpisodeCrew,
  TVSeasonGuestStar,
} from './types';

const normalizeEpisodeCrew = (
  crew: Record<string, unknown>
): TVSeasonEpisodeCrew => ({
  credit_id: normalizeText(crew.credit_id),
  department: normalizeText(crew.department),
  gender: normalizeNumber(crew.gender),
  id: normalizeNumber(crew.id),
  job: normalizeText(crew.job),
  known_for_department: normalizeText(crew.known_for_department),
  name: normalizeText(crew.name, normalizeText(crew.original_name)),
  original_name: normalizeText(crew.original_name),
  popularity: normalizeNumber(crew.popularity),
  profile_path: normalizeImagePath(crew.profile_path),
});

const normalizeGuestStar = (guest: Record<string, unknown>): TVSeasonGuestStar => ({
  ...normalizeEpisodeCrew(guest),
  character: normalizeText(guest.character),
  order: normalizeNumber(guest.order),
});

export const normalizeTVSeasonEpisode = (
  episode: Record<string, unknown>
): TVSeasonEpisode => ({
  air_date: normalizeDate(episode.air_date),
  crew: normalizeObjectArray(episode.crew, normalizeEpisodeCrew),
  episode_number: normalizeNumber(episode.episode_number),
  episode_type: normalizeText(episode.episode_type),
  guest_stars: normalizeObjectArray(episode.guest_stars, normalizeGuestStar),
  id: normalizeNumber(episode.id),
  name: normalizeText(episode.name),
  overview: normalizeText(episode.overview),
  production_code: normalizeText(episode.production_code),
  runtime: normalizeNumber(episode.runtime),
  season_number: normalizeNumber(episode.season_number),
  show_id: normalizeNumber(episode.show_id),
  still_path: normalizeImagePath(episode.still_path),
  vote_average: normalizeNumber(episode.vote_average),
  vote_count: normalizeNumber(episode.vote_count),
});

export const normalizeTVSeasonDetailsResponse = (
  response: Partial<TVSeasonDetailsResponse> | undefined
): TVSeasonDetailsResponse => ({
  _id: normalizeText(response?._id),
  air_date: normalizeDate(response?.air_date),
  episodes: normalizeObjectArray(response?.episodes, normalizeTVSeasonEpisode),
  id: normalizeNumber(response?.id),
  name: normalizeText(response?.name),
  overview: normalizeText(response?.overview),
  poster_path: normalizeImagePath(response?.poster_path),
  season_number: normalizeNumber(response?.season_number),
  vote_average: normalizeNumber(response?.vote_average),
});
