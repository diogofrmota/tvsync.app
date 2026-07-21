import {
  normalizeBoolean,
  normalizeImagePath,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { MovieCreditsResponse } from './types';

const normalizePersonCredit = (person: Record<string, unknown>) => ({
  adult: normalizeBoolean(person.adult),
  credit_id: normalizeText(person.credit_id),
  gender: normalizeNumber(person.gender),
  id: normalizeNumber(person.id),
  known_for_department: normalizeText(person.known_for_department),
  name: normalizeText(person.name, normalizeText(person.original_name)),
  original_name: normalizeText(person.original_name),
  popularity: normalizeNumber(person.popularity),
  profile_path: normalizeImagePath(person.profile_path) ?? undefined,
});

export const normalizeMovieCreditsResponse = (
  response: Partial<MovieCreditsResponse> | undefined
): MovieCreditsResponse => ({
  id: normalizeNumber(response?.id),
  cast: normalizeObjectArray(response?.cast, (cast) => ({
    ...normalizePersonCredit(cast),
    cast_id: normalizeNumber(cast.cast_id),
    character: normalizeText(cast.character),
    order: normalizeNumber(cast.order),
  })),
  crew: normalizeObjectArray(response?.crew, (crew) => ({
    ...normalizePersonCredit(crew),
    department: normalizeText(crew.department),
    job: normalizeText(crew.job),
  })),
});
