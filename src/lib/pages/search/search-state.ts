import { MediaType, type WatchStatus } from 'lib/types';

export const SEARCH_RESULTS_PER_PAGE = 27;
export const TMDB_RESULTS_PER_PAGE = 20;
export const TMDB_MAX_PAGE = 500;
const POSITIVE_INTEGER_REGEX = /^\d+$/;
export const SEARCH_MAX_PAGE = Math.ceil(
  (TMDB_RESULTS_PER_PAGE * TMDB_MAX_PAGE) / SEARCH_RESULTS_PER_PAGE
);

export type SearchMediaType = MediaType.Movie | MediaType.Tv;
export type SearchSort = 'popularity' | 'rating' | 'release';

export type SearchLibraryItem = {
  mediaType: SearchMediaType;
  status: WatchStatus;
  tmdbId: number;
};

export const getSearchMediaType = (value: string | null): SearchMediaType =>
  value === MediaType.Tv ? MediaType.Tv : MediaType.Movie;

export const getSearchPage = (value: string | null) => {
  const page = Number(value);

  if (!(Number.isInteger(page) && page > 0)) {
    return 1;
  }

  return Math.min(page, SEARCH_MAX_PAGE);
};

export const getSearchSort = (value: string | null): SearchSort => {
  if (value === 'rating' || value === 'release') {
    return value;
  }

  return 'popularity';
};

export const getSearchGenre = (value: string | null) =>
  value && POSITIVE_INTEGER_REGEX.test(value) && Number(value) > 0 ? value : '';

export const getProviderSort = (
  mediaType: SearchMediaType,
  sort: SearchSort
) => {
  if (sort === 'rating') {
    return 'vote_average.desc';
  }
  if (sort === 'release') {
    return mediaType === MediaType.Movie
      ? 'primary_release_date.desc'
      : 'first_air_date.desc';
  }

  return 'popularity.desc';
};

export const getProviderPagePlan = (page: number) => {
  const firstResultIndex = (page - 1) * SEARCH_RESULTS_PER_PAGE;
  const firstProviderPage =
    Math.floor(firstResultIndex / TMDB_RESULTS_PER_PAGE) + 1;
  const offset = firstResultIndex % TMDB_RESULTS_PER_PAGE;
  const lastResultIndex = firstResultIndex + SEARCH_RESULTS_PER_PAGE - 1;
  const lastProviderPage =
    Math.floor(lastResultIndex / TMDB_RESULTS_PER_PAGE) + 1;
  const pages = Array.from(
    { length: lastProviderPage - firstProviderPage + 1 },
    (_, index) => firstProviderPage + index
  ).filter((providerPage) => providerPage <= TMDB_MAX_PAGE);

  return { offset, pages };
};

export const mergeProviderResults = <Item extends { id: number }>(
  resultPages: ReadonlyArray<ReadonlyArray<Item>>,
  offset: number
) => {
  const seenIds = new Set<number>();
  const uniqueResults = resultPages.flat().filter((item) => {
    if (seenIds.has(item.id)) {
      return false;
    }
    seenIds.add(item.id);
    return true;
  });

  return uniqueResults
    .slice(offset, offset + SEARCH_RESULTS_PER_PAGE)
    .slice(0, SEARCH_RESULTS_PER_PAGE);
};

export const filterAndSortTitleResults = <
  Item extends {
    genre_ids: Array<number>;
    popularity: number;
    vote_average: number;
  },
>(
  items: ReadonlyArray<Item>,
  genre: string,
  sort: SearchSort,
  getReleaseDate: (item: Item) => string
) => {
  const genreId = Number(genre);
  const filteredItems = genre
    ? items.filter((item) => item.genre_ids.includes(genreId))
    : [...items];

  return filteredItems.toSorted((left, right) => {
    if (sort === 'rating') {
      return right.vote_average - left.vote_average;
    }
    if (sort === 'release') {
      return getReleaseDate(right).localeCompare(getReleaseDate(left));
    }

    return right.popularity - left.popularity;
  });
};

export const getSearchTotalPages = (totalResults: number) =>
  Math.ceil(
    Math.min(Math.max(0, totalResults), TMDB_RESULTS_PER_PAGE * TMDB_MAX_PAGE) /
      SEARCH_RESULTS_PER_PAGE
  );
