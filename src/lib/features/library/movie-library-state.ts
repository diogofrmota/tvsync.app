import type { MovieLibraryItem } from 'lib/features/library/types';
import { type MovieWatchStatus, WatchStatus } from 'lib/types';

export const groupMovieLibraryItems = (
  items: Array<MovieLibraryItem>
): {
  finished: Array<MovieLibraryItem>;
  planned: Array<MovieLibraryItem>;
} => ({
  finished: items.filter((item) => item.status === WatchStatus.Watched),
  planned: items.filter((item) => item.status === WatchStatus.Planned),
});

export const updateMovieLibraryItemStatus = (
  items: Array<MovieLibraryItem>,
  tmdbId: number,
  status: MovieWatchStatus
) => items.map((item) => (item.tmdbId === tmdbId ? { ...item, status } : item));

export const removeMovieLibraryItem = (
  items: Array<MovieLibraryItem>,
  tmdbId: number
) => items.filter((item) => item.tmdbId !== tmdbId);

export const restoreMovieLibraryItem = (
  items: Array<MovieLibraryItem>,
  restoredItem: MovieLibraryItem
) =>
  items.some((item) => item.tmdbId === restoredItem.tmdbId)
    ? items
    : [...items, restoredItem].toSorted((left, right) =>
        right.dateAdded.localeCompare(left.dateAdded)
      );
