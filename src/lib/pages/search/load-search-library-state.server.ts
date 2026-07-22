import 'server-only';

import type { SearchLibraryItem } from 'lib/pages/search/search-state';
import { listOwnMedia } from 'lib/services/database/tracking.server';
import { MediaType } from 'lib/types';

export const loadSearchLibraryState = async () => {
  const rows = await listOwnMedia();

  return rows
    .filter(
      (row) =>
        row.media_type === MediaType.Movie || row.media_type === MediaType.Tv
    )
    .map(
      (row): SearchLibraryItem => ({
        mediaType: row.media_type,
        status: row.watch_status,
        tmdbId: row.tmdb_id,
      })
    );
};
