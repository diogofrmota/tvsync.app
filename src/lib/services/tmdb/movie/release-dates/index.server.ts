import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieReleaseDatesResponse } from './types';
import { normalizeMovieReleaseDatesResponse } from './utils';

/**
 * The movie counterpart to `/tv/{id}/content_ratings`: TMDB publishes movie age
 * certificates inside the per-country release dates.
 */
export const getMovieReleaseDatesServer = (id: number | string) =>
  tmdbServerFetcherCore<MovieReleaseDatesResponse>({
    path: `/movie/${id}/release_dates`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.detail } },
  }).then(normalizeMovieReleaseDatesResponse);
