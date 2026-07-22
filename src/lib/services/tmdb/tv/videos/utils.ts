import {
  normalizeBoolean,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { TvVideo, TvVideosResponse } from './types';

const youtubeVideoKeyRegex = /^[A-Za-z0-9_-]{11}$/;

export const normalizeTvVideosResponse = (
  response: Partial<TvVideosResponse> | undefined
): TvVideosResponse => ({
  id: normalizeNumber(response?.id),
  results: normalizeObjectArray(response?.results, (video) => ({
    id: normalizeText(video.id),
    key: normalizeText(video.key),
    name: normalizeText(video.name),
    official: normalizeBoolean(video.official),
    publishedAt: normalizeText(video.published_at),
    site: normalizeText(video.site),
    type: normalizeText(video.type),
  })),
});

const isTrustedYoutubeTrailer = (video: TvVideo) =>
  video.site === 'YouTube' &&
  video.type === 'Trailer' &&
  youtubeVideoKeyRegex.test(video.key);

export const selectTrustedTvTrailer = (
  videos: TvVideosResponse
): TvVideo | null => {
  const trailers = videos.results.filter(isTrustedYoutubeTrailer);

  return trailers.find((video) => video.official) ?? trailers.at(0) ?? null;
};
