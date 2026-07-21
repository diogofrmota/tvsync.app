import type { PersonType } from 'lib/services/tmdb/person/detail/types';
import type { TmdbCreditsResponse } from 'lib/services/tmdb/types';

type TVCreditCastType = PersonType & {
  character: string;
  roles?: Array<{
    credit_id: string;
    character: string;
    episode_count: number;
  }>;
  total_episode_count?: number;
  order: number;
};

type TVCreditCrewType = PersonType & {
  department: string;
  job: string;
  jobs?: Array<{
    credit_id: string;
    job: string;
    episode_count: number;
  }>;
  total_episode_count?: number;
};

export type TVCreditsResponse = TmdbCreditsResponse<
  TVCreditCastType,
  TVCreditCrewType
>;
