import {
  normalizeBoolean,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type { MovieVideo, MovieVideosResponse } from './types';

const youtubeVideoKeyRegex = /^[A-Za-z0-9_-]{11}$/;

export const normalizeMovieVideosResponse = (
  response: Partial<MovieVideosResponse> | undefined
): MovieVideosResponse => ({
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

const isTrustedYoutubeTrailer = (video: MovieVideo) =>
  video.site === 'YouTube' &&
  video.type === 'Trailer' &&
  youtubeVideoKeyRegex.test(video.key);

export const selectTrustedMovieTrailer = (
  videos: MovieVideosResponse
): MovieVideo | null => {
  const trailers = videos.results.filter(isTrustedYoutubeTrailer);

  return (
    trailers.find((video) => video.official) ?? trailers.at(0) ?? null
  );
};

