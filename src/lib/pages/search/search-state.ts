import type { MediaType, WatchStatus } from 'lib/types';

export type SearchMediaType = MediaType.Movie | MediaType.Tv;

export type SearchLibraryItem = {
  mediaType: SearchMediaType;
  status: WatchStatus;
  tmdbId: number;
};

/** One poster in the mixed movie/TV result list. */
export type SearchResultItem = {
  id: number;
  mediaType: SearchMediaType;
  popularity: number;
  posterPath: string | null;
  title: string;
};

export const getSearchQuery = (value: string | null) => (value ?? '').trim();

export const getSearchResultKey = (item: SearchResultItem) =>
  `${item.mediaType}:${item.id}`;

/**
 * Search results are one list, not two tabs: movies and TV shows related to the
 * query are merged and ordered by TMDB popularity so the titles most people are
 * looking for come first. Ties fall back to the title so the order stays stable
 * between renders.
 */
export const mergeSearchResultsByPopularity = (
  resultGroups: ReadonlyArray<ReadonlyArray<SearchResultItem>>
): Array<SearchResultItem> => {
  const seenKeys = new Set<string>();

  return resultGroups
    .flat()
    .filter((item) => {
      const key = getSearchResultKey(item);

      if (seenKeys.has(key)) {
        return false;
      }

      seenKeys.add(key);
      return true;
    })
    .toSorted((left, right) =>
      right.popularity === left.popularity
        ? left.title.localeCompare(right.title)
        : right.popularity - left.popularity
    );
};
