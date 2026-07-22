import { normalizeNumber, normalizeText } from 'lib/services/tmdb/normalize';

import type { TvExternalIdsResponse } from './types';

const imdbIdRegex = /^tt\d{7,10}$/;

export const normalizeTvExternalIdsResponse = (
  response: Partial<TvExternalIdsResponse> | undefined
): TvExternalIdsResponse => {
  const imdbId = normalizeText(response?.imdb_id);

  return {
    id: normalizeNumber(response?.id),
    imdb_id: imdbIdRegex.test(imdbId) ? imdbId : null,
  };
};
