import {
  normalizeBoolean,
  normalizeDate,
  normalizeImagePath,
  normalizeNumber,
  normalizeNumberArray,
  normalizeObjectArray,
  normalizeStringArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type {
  CreatedBy,
  Genre,
  LastEpisodeToAir,
  Network,
  ProductionCountry,
  Season,
  SpokenLanguage,
  TvShowDetail,
} from './types';

const normalizeGenre = (genre: Record<string, unknown>): Genre => ({
  id: normalizeNumber(genre.id),
  name: normalizeText(genre.name),
});

const normalizeNetwork = (network: Record<string, unknown>): Network => ({
  id: normalizeNumber(network.id),
  logo_path: normalizeImagePath(network.logo_path),
  name: normalizeText(network.name),
  origin_country: normalizeText(network.origin_country),
});

const normalizeEpisodeSummary = (
  episode: Record<string, unknown>
): LastEpisodeToAir => ({
  air_date: normalizeDate(episode.air_date),
  episode_number: normalizeNumber(episode.episode_number),
  id: normalizeNumber(episode.id),
  name: normalizeText(episode.name),
  overview: normalizeText(episode.overview),
  production_code: normalizeText(episode.production_code),
  season_number: normalizeNumber(episode.season_number),
  still_path: normalizeImagePath(episode.still_path),
  vote_average: normalizeNumber(episode.vote_average),
  vote_count: normalizeNumber(episode.vote_count),
});

const maybeNormalizeEpisodeSummary = (value: unknown) =>
  typeof value === 'object' && value !== null
    ? normalizeEpisodeSummary(value as Record<string, unknown>)
    : null;

export const normalizeTVShowDetailResponse = (
  response: Partial<TvShowDetail> | undefined
): TvShowDetail => ({
  backdrop_path: normalizeImagePath(response?.backdrop_path),
  created_by: normalizeObjectArray<CreatedBy>(response?.created_by, (creator) => ({
    credit_id: normalizeText(creator.credit_id),
    gender: normalizeNumber(creator.gender),
    id: normalizeNumber(creator.id),
    name: normalizeText(creator.name),
    profile_path: normalizeImagePath(creator.profile_path),
  })),
  episode_run_time: normalizeNumberArray(response?.episode_run_time),
  first_air_date: normalizeDate(response?.first_air_date),
  genres: normalizeObjectArray(response?.genres, normalizeGenre),
  homepage: normalizeText(response?.homepage),
  id: normalizeNumber(response?.id),
  in_production: normalizeBoolean(response?.in_production),
  languages: normalizeStringArray(response?.languages),
  last_air_date: normalizeDate(response?.last_air_date),
  last_episode_to_air: maybeNormalizeEpisodeSummary(
    response?.last_episode_to_air
  ),
  name: normalizeText(response?.name, normalizeText(response?.original_name)),
  networks: normalizeObjectArray(response?.networks, normalizeNetwork),
  next_episode_to_air: maybeNormalizeEpisodeSummary(
    response?.next_episode_to_air
  ),
  number_of_episodes: normalizeNumber(response?.number_of_episodes),
  number_of_seasons: normalizeNumber(response?.number_of_seasons),
  origin_country: normalizeStringArray(response?.origin_country),
  original_language: normalizeText(response?.original_language),
  original_name: normalizeText(response?.original_name),
  overview: normalizeText(response?.overview),
  popularity: normalizeNumber(response?.popularity),
  poster_path: normalizeImagePath(response?.poster_path),
  production_companies: normalizeObjectArray(
    response?.production_companies,
    normalizeNetwork
  ),
  production_countries: normalizeObjectArray<ProductionCountry>(
    response?.production_countries,
    (country) => ({
      iso_3166_1: normalizeText(country.iso_3166_1),
      name: normalizeText(country.name),
    })
  ),
  seasons: normalizeObjectArray<Season>(response?.seasons, (season) => ({
    air_date: normalizeDate(season.air_date),
    episode_count: normalizeNumber(season.episode_count),
    id: normalizeNumber(season.id),
    name: normalizeText(season.name),
    overview: normalizeText(season.overview),
    poster_path: normalizeImagePath(season.poster_path),
    season_number: normalizeNumber(season.season_number),
  })),
  spoken_languages: normalizeObjectArray<SpokenLanguage>(
    response?.spoken_languages,
    (language) => ({
      english_name: normalizeText(language.english_name),
      iso_639_1: normalizeText(language.iso_639_1),
      name: normalizeText(language.name),
    })
  ),
  status: normalizeText(response?.status),
  tagline: normalizeText(response?.tagline),
  type: normalizeText(response?.type),
  vote_average: normalizeNumber(response?.vote_average),
  vote_count: normalizeNumber(response?.vote_count),
});
