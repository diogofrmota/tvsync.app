import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';

import { normalizeTVSeasonEpisode } from '../season/utils';
import type { TVEpisodeDetailsResponse, TVEpisodeParams } from './types';

export const getTVEpisodeDetailsServer = ({
  showId,
  seasonNumber,
  episodeNumber,
  params,
}: {
  showId: number | string;
  seasonNumber: number | string;
  episodeNumber: number | string;
  params?: TVEpisodeParams;
}) =>
  tmdbServerFetcherCore<TVEpisodeDetailsResponse>({
    path: `/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`,
    params,
    reqInit: { cache: 'no-store' },
  }).then(normalizeTVSeasonEpisode);
