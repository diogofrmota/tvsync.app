import type { TrackableMediaType, WatchStatus } from 'lib/types';

/**
 * Identity of a trackable title shared by every quick action surface: poster
 * cards, search results, and the profile rails.
 */
export type MediaLibraryRef = {
  mediaType: TrackableMediaType;
  tmdbId: number;
};

export type MediaLibraryEntry = MediaLibraryRef & {
  status: WatchStatus;
};

export const getMediaLibraryKey = ({ mediaType, tmdbId }: MediaLibraryRef) =>
  `${mediaType}:${tmdbId}`;

export const toMediaLibraryStatusMap = (
  entries: ReadonlyArray<MediaLibraryEntry>
): ReadonlyMap<string, WatchStatus> =>
  new Map(entries.map((entry) => [getMediaLibraryKey(entry), entry.status]));

export const toMediaFavoriteKeySet = (
  entries: ReadonlyArray<MediaLibraryRef>
): ReadonlySet<string> => new Set(entries.map(getMediaLibraryKey));
