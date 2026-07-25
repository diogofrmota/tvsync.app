'use client';

import {
  mergeSearchResultsByPopularity,
  type SearchResultItem,
} from 'lib/pages/search/search-state';
import { useMovieList } from 'lib/services/tmdb/movie/list/index.client';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import { useTVShowSearchResultList } from 'lib/services/tmdb/tv/list/index.client';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';

const mapMovie = (item: MovieListItemType): SearchResultItem => ({
  id: item.id,
  mediaType: MediaType.Movie,
  popularity: item.popularity,
  posterPath: item.poster_path,
  title: item.title,
});

const mapTV = (item: TVShowItem): SearchResultItem => ({
  id: item.id,
  mediaType: MediaType.Tv,
  popularity: item.popularity,
  posterPath: item.poster_path,
  title: item.name,
});

/**
 * A search asks TMDB for the movies and the TV shows matching the term and
 * returns them as a single popularity-ordered list.
 */
export const useSearchResults = (query: string) => {
  const isReady = query.length > 0;
  const movies = useMovieList(
    'popular',
    { page: 1, query },
    undefined,
    isReady
  );
  const tvShows = useTVShowSearchResultList({ page: 1, query }, isReady);
  const responses = [movies, tvShows];

  return {
    isError: responses.some((response) => Boolean(response.isError)),
    isLoading: isReady && responses.some((response) => response.isLoading),
    items: mergeSearchResultsByPopularity([
      (movies.data?.results ?? []).map(mapMovie),
      (tvShows.data?.results ?? []).map(mapTV),
    ]),
    retry: () => Promise.all(responses.map((response) => response.mutate())),
  };
};
