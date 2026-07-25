import 'server-only';

import { normalizeTvLibraryStatus } from 'lib/features/library/tv-library-state';
import type { SearchLibraryItem } from 'lib/pages/search/search-state';
import { listOwnMedia } from 'lib/services/database/tracking.server';
import { MediaType } from 'lib/types';

// TV library status is a 3-value derived projection (Watching/Planned/Finished);
// legacy Dropped/Paused rows collapse to Planned, matching /tv-shows' own
// zero-progress projection, so Search never offers or displays a status that
// doesn't exist in the canonical TV library model.
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
        status:
          row.media_type === MediaType.Tv
            ? normalizeTvLibraryStatus(row.watch_status)
            : row.watch_status,
        tmdbId: row.tmdb_id,
      })
    );
};
