import { normalizeMovieListItem } from 'lib/services/tmdb/movie/list/utils';
import {
  normalizeImagePath,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { MovieDetailResponse } from './types';

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
  imdb_id: normalizeText(response?.imdb_id),
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
  status: response?.status ?? 'Released',
  tagline: normalizeText(response?.tagline),
});
