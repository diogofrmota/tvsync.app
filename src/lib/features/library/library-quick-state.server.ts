import 'server-only';

import { normalizeTvLibraryStatus } from 'lib/features/library/tv-library-state';
import { getAuthSession } from 'lib/services/auth/session.server';
import { listOwnFavorites } from 'lib/services/database/profile.server';
import { listOwnMedia } from 'lib/services/database/tracking.server';
import { MediaType } from 'lib/types';

import type { MediaLibraryEntry, MediaLibraryRef } from './media-library-keys';

/**
 * Everything the poster quick actions need in one read: which titles are in the
 * signed-in user's library (with their current status) and which of them are
 * favourites. Anonymous visitors get an empty state instead of a database hit.
 */
export type MediaLibraryQuickState = {
  favorites: Array<MediaLibraryRef>;
  isAuthenticated: boolean;
  library: Array<MediaLibraryEntry>;
};

const EMPTY_QUICK_STATE: MediaLibraryQuickState = {
  favorites: [],
  isAuthenticated: false,
  library: [],
};

export const loadOwnLibraryQuickState =
  async (): Promise<MediaLibraryQuickState> => {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return EMPTY_QUICK_STATE;
    }

    const [mediaRows, favoriteRows] = await Promise.all([
      listOwnMedia().catch(() => []),
      listOwnFavorites().catch(() => []),
    ]);

    return {
      favorites: favoriteRows.map((row) => ({
        mediaType: row.media_type,
        tmdbId: row.tmdb_id,
      })),
      isAuthenticated: true,
      library: mediaRows
        .filter(
          (row) =>
            row.media_type === MediaType.Movie ||
            row.media_type === MediaType.Tv
        )
        .map((row) => ({
          mediaType: row.media_type,
          status:
            row.media_type === MediaType.Tv
              ? normalizeTvLibraryStatus(row.watch_status)
              : row.watch_status,
          tmdbId: row.tmdb_id,
        })),
    };
  };
