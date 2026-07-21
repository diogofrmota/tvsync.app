import {
  normalizeBoolean,
  normalizeImagePath,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { TVCreditsResponse } from './types';

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

export const normalizeTVCreditsResponse = (
  response: Partial<TVCreditsResponse> | undefined
): TVCreditsResponse => ({
  id: normalizeNumber(response?.id),
  cast: normalizeObjectArray(response?.cast, (cast) => ({
    ...normalizePersonCredit(cast),
    character: normalizeText(cast.character),
    order: normalizeNumber(cast.order),
    roles: normalizeObjectArray(cast.roles, (role) => ({
      character: normalizeText(role.character),
      credit_id: normalizeText(role.credit_id),
      episode_count: normalizeNumber(role.episode_count),
    })),
    total_episode_count: normalizeNumber(cast.total_episode_count),
  })),
  crew: normalizeObjectArray(response?.crew, (crew) => ({
    ...normalizePersonCredit(crew),
    department: normalizeText(crew.department),
    job: normalizeText(crew.job),
    jobs: normalizeObjectArray(crew.jobs, (job) => ({
      credit_id: normalizeText(job.credit_id),
      episode_count: normalizeNumber(job.episode_count),
      job: normalizeText(job.job),
    })),
    total_episode_count: normalizeNumber(crew.total_episode_count),
  })),
});
