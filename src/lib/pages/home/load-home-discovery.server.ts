import 'server-only';

import {
  HOME_PREVIEW_ITEM_COUNT,
  HOME_SECTION_TITLES,
  type HomeDiscoverySection,
} from 'lib/pages/home/config';
import {
  type MediaOverviewItem,
  mapMovieOverviewItem,
  mapTVShowOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import { getMovieListServer } from 'lib/services/tmdb/movie/list/index.server';
import type { MovieListParams } from 'lib/services/tmdb/movie/list/types';
import { getTVShowByListType } from 'lib/services/tmdb/tv/list/index.server';
import type { TVShowListParams } from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import { unstable_cache } from 'next/cache';

const HOME_TMDB_REVALIDATE_SECONDS = 86_400;

const topRatedMovieParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '10000',
} satisfies MovieListParams;

const topRatedTVParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '1500',
} satisfies TVShowListParams;

const buildHref = (path: string, params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams({ ...params, page: '1' });

  return `${path}?${searchParams.toString()}` as Route;
};

const shapePreviewItems = (items: Array<MediaOverviewItem>) =>
  uniqueMediaOverviewItems(items).slice(0, HOME_PREVIEW_ITEM_COUNT);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to load TMDB data.';

const loadSection = async (
  section: Omit<HomeDiscoverySection, 'error' | 'items'>,
  request: Promise<Array<MediaOverviewItem>>
): Promise<HomeDiscoverySection> => {
  try {
    return {
      ...section,
      items: shapePreviewItems(await request),
    };
  } catch (error) {
    return {
      ...section,
      error: getErrorMessage(error),
      items: [],
    };
  }
};

const loadPopularMovies = unstable_cache(
  () =>
    getMovieListServer({
      params: { page: 1 },
      revalidate: HOME_TMDB_REVALIDATE_SECONDS,
      section: 'popular',
    }).then((response) => response.results.map(mapMovieOverviewItem)),
  ['home-popular-movies'],
  { revalidate: HOME_TMDB_REVALIDATE_SECONDS }
);

const loadTopRatedMovies = unstable_cache(
  () =>
    getMovieListServer({
      params: { page: 1, ...topRatedMovieParams },
      revalidate: HOME_TMDB_REVALIDATE_SECONDS,
      section: 'top_rated',
    }).then((response) => response.results.map(mapMovieOverviewItem)),
  ['home-top-rated-movies'],
  { revalidate: HOME_TMDB_REVALIDATE_SECONDS }
);

const loadPopularTVShows = unstable_cache(
  () =>
    getTVShowByListType(
      'popular',
      { page: 1 },
      HOME_TMDB_REVALIDATE_SECONDS
    ).then((response) => response.results.map(mapTVShowOverviewItem)),
  ['home-popular-tv-shows'],
  { revalidate: HOME_TMDB_REVALIDATE_SECONDS }
);

const loadTopRatedTVShows = unstable_cache(
  () =>
    getTVShowByListType(
      'top_rated',
      { page: 1, ...topRatedTVParams },
      HOME_TMDB_REVALIDATE_SECONDS
    ).then((response) => response.results.map(mapTVShowOverviewItem)),
  ['home-top-rated-tv-shows'],
  { revalidate: HOME_TMDB_REVALIDATE_SECONDS }
);

export const loadHomeDiscoverySections = async (): Promise<
  Array<HomeDiscoverySection>
> =>
  Promise.all([
    loadSection(
      {
        mediaType: MediaType.Movie,
        seeAllHref: buildHref('/movies/popular'),
        title: HOME_SECTION_TITLES[0],
      },
      loadPopularMovies()
    ),
    loadSection(
      {
        mediaType: MediaType.Movie,
        seeAllHref: buildHref(
          '/movies/top_rated',
          topRatedMovieParams as Record<string, string>
        ),
        title: HOME_SECTION_TITLES[1],
      },
      loadTopRatedMovies()
    ),
    loadSection(
      {
        mediaType: MediaType.Tv,
        seeAllHref: buildHref('/tv/popular'),
        title: HOME_SECTION_TITLES[2],
      },
      loadPopularTVShows()
    ),
    loadSection(
      {
        mediaType: MediaType.Tv,
        seeAllHref: buildHref(
          '/tv/top_rated',
          topRatedTVParams as Record<string, string>
        ),
        title: HOME_SECTION_TITLES[3],
      },
      loadTopRatedTVShows()
    ),
  ]);
