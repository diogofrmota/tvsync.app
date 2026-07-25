import type { TrackableMediaType } from 'lib/types';

/**
 * Poster-shaped media summary shared by every list surface: home rails, explore
 * rails, media overview shelves, the profile rails, and the full "See All"
 * grids. `mediaType` is only needed for mixed lists (favourites); single-type
 * lists inherit it from the rail or grid.
 */
export type MediaCardItem = {
  id: number;
  mediaType?: TrackableMediaType;
  posterPath: string | null;
  title: string;
};

/** A poster card item from a mixed list, which always knows its media type. */
export type MediaCardEntry = MediaCardItem & {
  mediaType: TrackableMediaType;
};
