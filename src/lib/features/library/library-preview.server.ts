import 'server-only';

import type { MediaCardEntry } from 'lib/components/shared/media-item';
import { hydrateMediaCardItems } from 'lib/features/library/media-card-hydration.server';
import {
  listOwnMedia,
  listOwnMediaByType,
} from 'lib/services/database/tracking.server';
import { MediaType, type TrackableMediaType } from 'lib/types';

/**
 * The most recently added library titles as poster card items. Only the slice
 * that is actually rendered is hydrated, so a profile rail costs ten TMDB reads
 * instead of one per library row.
 */
export const loadOwnLibraryPreview = async ({
  limit,
  mediaType,
}: {
  limit: number;
  mediaType?: TrackableMediaType;
}): Promise<Array<MediaCardEntry>> => {
  const rows = await (mediaType
    ? listOwnMediaByType(mediaType)
    : listOwnMedia());

  return hydrateMediaCardItems(
    rows
      .filter(
        (row) =>
          row.media_type === MediaType.Movie || row.media_type === MediaType.Tv
      )
      .slice(0, limit)
      .map((row) => ({ mediaType: row.media_type, tmdbId: row.tmdb_id }))
  );
};
