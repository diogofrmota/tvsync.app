import 'server-only';

import type { SearchLibraryItem } from 'lib/pages/search/search-state';
import { listOwnMedia } from 'lib/services/database/tracking.server';
import { MediaType, WatchStatus } from 'lib/types';

// TV library status is a 3-value derived projection (Watching/Planned/Finished);
// legacy Dropped/Paused rows collapse to Planned, matching /tv-shows' own
// zero-progress projection, so Search never offers or displays a status that
// doesn't exist in the canonical TV library model.
const normalizeTvWatchStatus = (status: WatchStatus): WatchStatus =>
  status === WatchStatus.Dropped || status === WatchStatus.Paused
    ? WatchStatus.Planned
    : status;

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
            ? normalizeTvWatchStatus(row.watch_status)
            : row.watch_status,
        tmdbId: row.tmdb_id,
      })
    );
};
