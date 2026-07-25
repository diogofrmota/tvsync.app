import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import {
  type MediaReviewsResponse,
  normalizeMediaReviewsResponse,
} from 'lib/services/tmdb/reviews';
import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

export const getMovieReviewsServer = (id: number | string) =>
  tmdbServerFetcherCore<MediaReviewsResponse>({
    path: `/movie/${id}/reviews`,
    reqInit: { next: { revalidate: TMDB_REVALIDATE_SECONDS.reviews } },
  }).then(normalizeMediaReviewsResponse);
