import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import type { MovieVideosResponse } from './types';
import { normalizeMovieVideosResponse } from './utils';

export const getMovieVideosServer = (id: number) =>
  tmdbServerFetcherCore<MovieVideosResponse>({
    path: `/movie/${id}/videos`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.videos } },
  }).then(normalizeMovieVideosResponse);
