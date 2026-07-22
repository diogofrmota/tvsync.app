'use client';

import {
  filterAndSortTitleResults,
  getProviderPagePlan,
  getProviderSort,
  getSearchTotalPages,
  mergeProviderResults,
  type SearchMediaType,
  type SearchSort,
} from 'lib/pages/search/search-state';
import { useMovieList } from 'lib/services/tmdb/movie/list/index.client';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import {
  useTVShowByList,
  useTVShowSearchResultList,
} from 'lib/services/tmdb/tv/list/index.client';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';

export type SearchResultItem = {
  id: number;
  mediaType: SearchMediaType;
  posterPath: string | null;
  title: string;
};

type SearchResultParams = {
  genre: string;
  mediaType: SearchMediaType;
  page: number;
  query: string;
  sort: SearchSort;
};

const mapMovie = (item: MovieListItemType): SearchResultItem => ({
  id: item.id,
  mediaType: MediaType.Movie,
  posterPath: item.poster_path,
  title: item.title,
});

const mapTV = (item: TVShowItem): SearchResultItem => ({
  id: item.id,
  mediaType: MediaType.Tv,
  posterPath: item.poster_path,
  title: item.name,
});

export const useSearchResults = ({
  genre,
  mediaType,
  page,
  query,
  sort,
}: SearchResultParams) => {
  const providerPlan = getProviderPagePlan(page);
  const providerPages = providerPlan.pages;
  const providerSort = getProviderSort(mediaType, sort);
  const getProviderParams = (providerPage: number | undefined) => ({
    page: providerPage ?? 1,
    ...(query
      ? { query }
      : { sort_by: providerSort, with_genres: genre || undefined }),
  });

  const moviePageOne = useMovieList(
    'popular',
    getProviderParams(providerPages[0]),
    undefined,
    mediaType === MediaType.Movie && Boolean(providerPages[0])
  );
  const moviePageTwo = useMovieList(
    'popular',
    getProviderParams(providerPages[1]),
    undefined,
    mediaType === MediaType.Movie && Boolean(providerPages[1])
  );
  const moviePageThree = useMovieList(
    'popular',
    getProviderParams(providerPages[2]),
    undefined,
    mediaType === MediaType.Movie && Boolean(providerPages[2])
  );
  const tvBrowsePageOne = useTVShowByList({
    isReady: mediaType === MediaType.Tv && !query && Boolean(providerPages[0]),
    listType: 'popular',
    params: getProviderParams(providerPages[0]),
  });
  const tvBrowsePageTwo = useTVShowByList({
    isReady: mediaType === MediaType.Tv && !query && Boolean(providerPages[1]),
    listType: 'popular',
    params: getProviderParams(providerPages[1]),
  });
  const tvBrowsePageThree = useTVShowByList({
    isReady: mediaType === MediaType.Tv && !query && Boolean(providerPages[2]),
    listType: 'popular',
    params: getProviderParams(providerPages[2]),
  });
  const tvSearchPageOne = useTVShowSearchResultList(
    { page: providerPages[0] ?? 1, query },
    mediaType === MediaType.Tv && Boolean(query) && Boolean(providerPages[0])
  );
  const tvSearchPageTwo = useTVShowSearchResultList(
    { page: providerPages[1] ?? 1, query },
    mediaType === MediaType.Tv && Boolean(query) && Boolean(providerPages[1])
  );
  const tvSearchPageThree = useTVShowSearchResultList(
    { page: providerPages[2] ?? 1, query },
    mediaType === MediaType.Tv && Boolean(query) && Boolean(providerPages[2])
  );
  const moviePages = [moviePageOne, moviePageTwo, moviePageThree].slice(
    0,
    providerPages.length
  );
  const tvPages = (
    query
      ? [tvSearchPageOne, tvSearchPageTwo, tvSearchPageThree]
      : [tvBrowsePageOne, tvBrowsePageTwo, tvBrowsePageThree]
  ).slice(0, providerPages.length);
  const activePages = mediaType === MediaType.Movie ? moviePages : tvPages;
  const mergedMovieResults = mergeProviderResults(
    moviePages.map((result) => result.data?.results ?? []),
    providerPlan.offset
  );
  const mergedTvResults = mergeProviderResults(
    tvPages.map((result) => result.data?.results ?? []),
    providerPlan.offset
  );
  const movieResults = query
    ? filterAndSortTitleResults(
        mergedMovieResults,
        genre,
        sort,
        (item) => item.release_date
      )
    : mergedMovieResults;
  const tvResults = query
    ? filterAndSortTitleResults(
        mergedTvResults,
        genre,
        sort,
        (item) => item.first_air_date
      )
    : mergedTvResults;

  return {
    isError: activePages.some((result) => Boolean(result.isError)),
    isLoading: activePages.some((result) => result.isLoading),
    items:
      mediaType === MediaType.Movie
        ? movieResults.map(mapMovie)
        : tvResults.map(mapTV),
    retry: () => Promise.all(activePages.map((result) => result.mutate())),
    totalPages: getSearchTotalPages(activePages[0]?.data?.total_results ?? 0),
  };
};
