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

// Popular rankings shuffle daily; top-rated ordering is effectively stable, so
// it only needs a weekly refresh. Fetching either more often just burns the
// shared TMDB rate budget without changing what visitors see.
const HOME_POPULAR_REVALIDATE_SECONDS = 86_400; // 24h
const HOME_TOP_RATED_REVALIDATE_SECONDS = 604_800; // 7d

/**
 * TMDB serves 20 titles per page, exactly the size of a rail, so a second page
 * is fetched to leave headroom for de-duplication. A page that fails is simply
 * dropped; the section only errors when every page fails.
 */
const HOME_PAGE_NUMBERS = [1, 2] as const;

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

const loadPreviewPages = async <Item>(
  loadPage: (page: number) => Promise<{ results: Array<Item> }>,
  mapItem: (item: Item) => MediaOverviewItem
): Promise<Array<MediaOverviewItem>> => {
  const responses = await Promise.allSettled(
    HOME_PAGE_NUMBERS.map((page) => loadPage(page))
  );
  const rejected = responses.filter(
    (response): response is PromiseRejectedResult =>
      response.status === 'rejected'
  );

  if (rejected.length === responses.length) {
    throw rejected[0]?.reason ?? new Error('Unable to load TMDB data.');
  }

  return responses.flatMap((response) =>
    response.status === 'fulfilled' ? response.value.results.map(mapItem) : []
  );
};

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
    loadPreviewPages(
      (page) => getMovieListServer({ params: { page }, section: 'popular' }),
      mapMovieOverviewItem
    ),
  ['home-popular-movies'],
  { revalidate: HOME_POPULAR_REVALIDATE_SECONDS }
);

const loadTopRatedMovies = unstable_cache(
  () =>
    loadPreviewPages(
      (page) =>
        getMovieListServer({
          params: { page, ...topRatedMovieParams },
          section: 'top_rated',
        }),
      mapMovieOverviewItem
    ),
  ['home-top-rated-movies'],
  { revalidate: HOME_TOP_RATED_REVALIDATE_SECONDS }
);

const loadPopularTVShows = unstable_cache(
  () =>
    loadPreviewPages(
      (page) => getTVShowByListType('popular', { page }),
      mapTVShowOverviewItem
    ),
  ['home-popular-tv-shows'],
  { revalidate: HOME_POPULAR_REVALIDATE_SECONDS }
);

const loadTopRatedTVShows = unstable_cache(
  () =>
    loadPreviewPages(
      (page) => getTVShowByListType('top_rated', { page, ...topRatedTVParams }),
      mapTVShowOverviewItem
    ),
  ['home-top-rated-tv-shows'],
  { revalidate: HOME_TOP_RATED_REVALIDATE_SECONDS }
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
