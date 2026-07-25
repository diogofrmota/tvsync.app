import 'server-only';

import type { MediaCardEntry } from 'lib/components/shared/media-item';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, type TrackableMediaType } from 'lib/types';

export type MediaCardRef = {
  mediaType: TrackableMediaType;
  tmdbId: number;
};

const fallbackTitle = ({ mediaType, tmdbId }: MediaCardRef) =>
  mediaType === MediaType.Movie ? `Movie ${tmdbId}` : `TV show ${tmdbId}`;

/**
 * Turns a stored (tmdb_id, media_type) pair into the poster card shape used by
 * every rail and grid. A failed TMDB read degrades to a titled placeholder
 * instead of dropping the row the user saved.
 */
export const hydrateMediaCardItem = async (
  ref: MediaCardRef
): Promise<MediaCardEntry> => {
  try {
    if (ref.mediaType === MediaType.Movie) {
      const movie = await getMovieDetailServer(ref.tmdbId);

      return {
        id: ref.tmdbId,
        mediaType: MediaType.Movie,
        posterPath: movie.poster_path,
        title: movie.title || movie.original_title || fallbackTitle(ref),
      };
    }

    const show = await getTvShowDetail(ref.tmdbId);

    return {
      id: ref.tmdbId,
      mediaType: MediaType.Tv,
      posterPath: show.poster_path,
      title: show.name || show.original_name || fallbackTitle(ref),
    };
  } catch {
    return {
      id: ref.tmdbId,
      mediaType: ref.mediaType,
      posterPath: null,
      title: fallbackTitle(ref),
    };
  }
};

export const hydrateMediaCardItems = (
  refs: ReadonlyArray<MediaCardRef>
): Promise<Array<MediaCardEntry>> =>
  Promise.all(refs.map(hydrateMediaCardItem));
