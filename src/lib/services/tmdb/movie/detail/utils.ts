import { normalizeMovieListItem } from 'lib/services/tmdb/movie/list/utils';
import {
  normalizeImagePath,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { MovieDetailResponse } from './types';

const movieStatuses = new Set<MovieDetailResponse['status']>([
  'Rumored',
  'Planned',
  'In Production',
  'Post Production',
  'Released',
  'Canceled',
]);
const imdbIdRegex = /^tt\d{7,10}$/;

export const normalizeMovieDetailResponse = (
  response: Partial<MovieDetailResponse> | undefined
): MovieDetailResponse => ({
  ...normalizeMovieListItem(response ?? {}),
  belongs_to_collection: response?.belongs_to_collection,
  budget: normalizeNumber(response?.budget),
  genres: normalizeObjectArray(response?.genres, (genre) => ({
    id: normalizeNumber(genre.id),
    name: normalizeText(genre.name),
  })),
  homepage: normalizeText(response?.homepage),
  imdb_id: imdbIdRegex.test(normalizeText(response?.imdb_id))
    ? normalizeText(response?.imdb_id)
    : undefined,
  production_companies: normalizeObjectArray(
    response?.production_companies,
    (company) => ({
      id: normalizeNumber(company.id),
      logo_path: normalizeImagePath(company.logo_path),
      name: normalizeText(company.name),
      origin_country: normalizeText(company.origin_country),
    })
  ),
  production_countries: normalizeObjectArray(
    response?.production_countries,
    (country) => ({
      iso_3166_1: normalizeText(country.iso_3166_1),
      name: normalizeText(country.name),
    })
  ),
  revenue: normalizeNumber(response?.revenue),
  runtime: normalizeNumber(response?.runtime),
  spoken_languages: normalizeObjectArray(response?.spoken_languages, (lang) => ({
    english_name: normalizeText(lang.english_name),
    iso_639_1: normalizeText(lang.iso_639_1),
    name: normalizeText(lang.name),
  })),
  status: movieStatuses.has(response?.status) ? response?.status : undefined,
  tagline: normalizeText(response?.tagline),
});
