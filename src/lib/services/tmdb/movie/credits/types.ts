import type { PersonType } from 'lib/services/tmdb/person/detail/types';
import type { TmdbCreditsResponse } from 'lib/services/tmdb/types';

type CreditCastType = PersonType & {
  cast_id: number;
  character: string;
  order: number;
};

type CreditCrewType = PersonType & {
  department: string;
  job: string;
};

export type MovieCreditsResponse = TmdbCreditsResponse<
  CreditCastType,
  CreditCrewType
>;
