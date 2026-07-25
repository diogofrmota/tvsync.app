import type { MediaCertification } from 'lib/services/tmdb/certification';
import { selectPreferredCertification } from 'lib/services/tmdb/certification';
import {
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { TvContentRatingsResponse } from './types';

export const normalizeTvContentRatingsResponse = (
  response: Partial<TvContentRatingsResponse> | undefined
): TvContentRatingsResponse => ({
  id: normalizeNumber(response?.id),
  results: normalizeObjectArray(response?.results, (item) => ({
    iso_3166_1: normalizeText(item.iso_3166_1).toUpperCase(),
    rating: normalizeText(item.rating).trim(),
  })),
});

export const selectTvContentRating = (
  response: TvContentRatingsResponse
): MediaCertification | null =>
  selectPreferredCertification(
    response.results.map((result) => ({
      certification: result.rating,
      region: result.iso_3166_1,
    }))
  );
