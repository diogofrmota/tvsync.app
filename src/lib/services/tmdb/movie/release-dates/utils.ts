import type { MediaCertification } from 'lib/services/tmdb/certification';
import { selectPreferredCertification } from 'lib/services/tmdb/certification';
import {
  normalizeDate,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { MovieReleaseDatesResponse } from './types';

export const normalizeMovieReleaseDatesResponse = (
  response: Partial<MovieReleaseDatesResponse> | undefined
): MovieReleaseDatesResponse => ({
  id: normalizeNumber(response?.id),
  results: normalizeObjectArray(response?.results, (result) => ({
    iso_3166_1: normalizeText(result.iso_3166_1).toUpperCase(),
    release_dates: normalizeObjectArray(result.release_dates, (release) => ({
      certification: normalizeText(release.certification).trim(),
      release_date: normalizeDate(release.release_date),
      type: normalizeNumber(release.type),
    })),
  })),
});

/**
 * A country can list several releases (theatrical, digital, physical) and only
 * some of them carry the certificate, so the first non-empty one per country
 * becomes that country's candidate.
 */
export const selectMovieCertification = (
  response: MovieReleaseDatesResponse
): MediaCertification | null =>
  selectPreferredCertification(
    response.results.map((result) => ({
      certification:
        result.release_dates.find((release) => release.certification)
          ?.certification ?? '',
      region: result.iso_3166_1,
    }))
  );
