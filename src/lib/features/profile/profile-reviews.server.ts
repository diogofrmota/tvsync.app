import 'server-only';

import type { MediaCardEntry } from 'lib/components/shared/media-item';
import { hydrateMediaCardItems } from 'lib/features/library/media-card-hydration.server';
import { listOwnReviews } from 'lib/services/database/tracking.server';

/**
 * A review as the profile renders it: the stored rating and text joined to the
 * poster and title the review is about, so the card can carry the artwork the
 * way a Letterboxd entry does.
 */
export type ProfileReviewItem = MediaCardEntry & {
  rating: number;
  review: string;
  updatedAt: string;
};

/** The profile section previews this many reviews before "See All". */
export const PROFILE_REVIEW_PREVIEW_LIMIT = 4;

export const getOwnProfileReviews = async (
  limit?: number
): Promise<Array<ProfileReviewItem>> => {
  const rows = await listOwnReviews(limit);
  const cards = await hydrateMediaCardItems(
    rows.map((row) => ({ mediaType: row.media_type, tmdbId: row.tmdb_id }))
  );

  return rows.map((row, index) => ({
    ...(cards[index] ?? {
      backdropPath: null,
      id: row.tmdb_id,
      mediaType: row.media_type,
      posterPath: null,
      title: `${row.media_type === 'movie' ? 'Movie' : 'TV show'} ${row.tmdb_id}`,
    }),
    rating: Number(row.rating),
    review: row.review,
    updatedAt: row.updated_at,
  }));
};
