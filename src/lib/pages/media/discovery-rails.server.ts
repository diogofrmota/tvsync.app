import 'server-only';

import { MEDIA_RAIL_ITEM_LIMIT } from 'lib/components/shared/MediaRail';
import {
  DISCOVERY_RAIL_TITLES,
  type DiscoveryRail,
  type DiscoveryRailKey,
} from 'lib/pages/media/discovery-rails';
import {
  type MediaOverviewItem,
  mapMovieOverviewItem,
  mapTVShowOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import {
  buildMediaOverviewHref,
  type MediaQualityFilter,
  qualityFilterFromParams,
  takeMediaOverviewItems,
} from 'lib/pages/media/overview.server';
import { TMDB_REVALIDATE_SECONDS } from 'lib/services/tmdb/constants';
import {
  getMovieListServer,
  getTrendingMoviesServer,
} from 'lib/services/tmdb/movie/list/index.server';
import type {
  MovieListItemType,
  MovieListParams,
} from 'lib/services/tmdb/movie/list/types';
import {
  getDiscoverTVShowsServer,
  getTrendingTVShowsServer,
} from 'lib/services/tmdb/tv/list/index.server';
import type {
  TVShowItem,
  TVShowListParams,
} from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import { unstable_cache } from 'next/cache';

/**
 * One TMDB page is one rail: the API serves 20 titles per page and a rail shows
 * at most 20, so every section costs exactly one request. The responses are
 * cached per rail rather than per page, which is what keeps Home and Explore
 * showing the same lists instead of two independently ranked snapshots.
 */
const popularMovieParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6',
  'vote_count.gte': '1000',
} satisfies MovieListParams;

const topRatedMovieParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '10000',
} satisfies MovieListParams;

const popularTVShowParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6',
  'vote_count.gte': '500',
} satisfies TVShowListParams;

const topRatedTVShowParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '1500',
} satisfies TVShowListParams;

const trendingMovieQuality: MediaQualityFilter = {
  minVoteAverage: 5.5,
  minVoteCount: 300,
};

const trendingTVShowQuality: MediaQualityFilter = {
  minVoteAverage: 5.5,
  minVoteCount: 150,
};

const buildMovieHref = (
  section: 'popular' | 'top_rated' | 'trending_week' | 'upcoming',
  params: Record<string, number | string> = {}
) => buildMediaOverviewHref({ basePath: '/movies', listType: section, params });

const buildTVShowHref = (
  listType: 'popular' | 'top_rated' | 'trending_week',
  params: Record<string, number | string> = {}
) => buildMediaOverviewHref({ basePath: '/tv', listType, params });

const shapeMovies = (
  movies: Array<MovieListItemType>,
  filter?: MediaQualityFilter
) =>
  filter
    ? takeMediaOverviewItems(
        movies,
        filter,
        mapMovieOverviewItem,
        uniqueMediaOverviewItems
      )
    : uniqueMediaOverviewItems(movies.map(mapMovieOverviewItem)).filter(
        (item) => item.posterPath
      );

const shapeShows = (shows: Array<TVShowItem>, filter: MediaQualityFilter) =>
  takeMediaOverviewItems(
    shows,
    filter,
    mapTVShowOverviewItem,
    uniqueMediaOverviewItems
  );

/**
 * Trending is read raw because Explore also builds its featured slideshow from
 * it; sharing the cached response keeps the hero and the trending rails on the
 * same snapshot for one request.
 */
const loadTrendingMovieResults = unstable_cache(
  () =>
    getTrendingMoviesServer({ page: 1 }, 'week').then(
      (response) => response.results
    ),
  ['discovery-trending-movies'],
  { revalidate: TMDB_REVALIDATE_SECONDS.trending }
);

const loadTrendingTVShowResults = unstable_cache(
  () =>
    getTrendingTVShowsServer({ page: 1 }, 'week').then(
      (response) => response.results
    ),
  ['discovery-trending-tv-shows'],
  { revalidate: TMDB_REVALIDATE_SECONDS.trending }
);

const loadPopularMovieResults = unstable_cache(
  () =>
    getMovieListServer({
      params: { page: 1, ...popularMovieParams },
      section: 'popular',
    }).then((response) => response.results),
  ['discovery-popular-movies'],
  { revalidate: TMDB_REVALIDATE_SECONDS.list }
);

const loadTopRatedMovieResults = unstable_cache(
  () =>
    getMovieListServer({
      params: { page: 1, ...topRatedMovieParams },
      section: 'top_rated',
    }).then((response) => response.results),
  ['discovery-top-rated-movies'],
  { revalidate: TMDB_REVALIDATE_SECONDS.topRated }
);

const loadUpcomingMovieResults = unstable_cache(
  () =>
    getMovieListServer({ params: { page: 1 }, section: 'upcoming' }).then(
      (response) => response.results
    ),
  ['discovery-upcoming-movies'],
  { revalidate: TMDB_REVALIDATE_SECONDS.list }
);

const loadPopularTVShowResults = unstable_cache(
  () =>
    getDiscoverTVShowsServer({ page: 1, ...popularTVShowParams }).then(
      (response) => response.results
    ),
  ['discovery-popular-tv-shows'],
  { revalidate: TMDB_REVALIDATE_SECONDS.list }
);

const loadTopRatedTVShowResults = unstable_cache(
  () =>
    getDiscoverTVShowsServer({ page: 1, ...topRatedTVShowParams }).then(
      (response) => response.results
    ),
  ['discovery-top-rated-tv-shows'],
  { revalidate: TMDB_REVALIDATE_SECONDS.topRated }
);

type DiscoveryRailDefinition = Omit<
  DiscoveryRail,
  'error' | 'items' | 'key'
> & {
  load: () => Promise<Array<MediaOverviewItem>>;
};

const railDefinitions: Record<DiscoveryRailKey, DiscoveryRailDefinition> = {
  popular_movies: {
    load: async () =>
      shapeMovies(
        await loadPopularMovieResults(),
        qualityFilterFromParams(popularMovieParams)
      ),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('popular', popularMovieParams),
    title: DISCOVERY_RAIL_TITLES.popular_movies,
  },
  popular_tv_shows: {
    load: async () =>
      shapeShows(
        await loadPopularTVShowResults(),
        qualityFilterFromParams(popularTVShowParams)
      ),
    mediaType: MediaType.Tv,
    seeAllHref: buildTVShowHref('popular', popularTVShowParams),
    title: DISCOVERY_RAIL_TITLES.popular_tv_shows,
  },
  top_rated_movies: {
    load: async () =>
      shapeMovies(
        await loadTopRatedMovieResults(),
        qualityFilterFromParams(topRatedMovieParams)
      ),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('top_rated', topRatedMovieParams),
    title: DISCOVERY_RAIL_TITLES.top_rated_movies,
  },
  top_rated_tv_shows: {
    load: async () =>
      shapeShows(
        await loadTopRatedTVShowResults(),
        qualityFilterFromParams(topRatedTVShowParams)
      ),
    mediaType: MediaType.Tv,
    seeAllHref: buildTVShowHref('top_rated', topRatedTVShowParams),
    title: DISCOVERY_RAIL_TITLES.top_rated_tv_shows,
  },
  trending_movies: {
    load: async () =>
      shapeMovies(await loadTrendingMovieResults(), trendingMovieQuality),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('trending_week', {
      'vote_average.gte': trendingMovieQuality.minVoteAverage,
      'vote_count.gte': trendingMovieQuality.minVoteCount,
    }),
    title: DISCOVERY_RAIL_TITLES.trending_movies,
  },
  trending_tv_shows: {
    load: async () =>
      shapeShows(await loadTrendingTVShowResults(), trendingTVShowQuality),
    mediaType: MediaType.Tv,
    seeAllHref: buildTVShowHref('trending_week', {
      'vote_average.gte': trendingTVShowQuality.minVoteAverage,
      'vote_count.gte': trendingTVShowQuality.minVoteCount,
    }),
    title: DISCOVERY_RAIL_TITLES.trending_tv_shows,
  },
  upcoming_movies: {
    load: async () => shapeMovies(await loadUpcomingMovieResults()),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('upcoming'),
    title: DISCOVERY_RAIL_TITLES.upcoming_movies,
  },
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to load TMDB data.';

/**
 * Resolves the requested rails. A section that came back short still previews
 * fine — the complete list is one click behind "See All" — so only a failed
 * list carries an error and no rail is topped up with an extra request.
 */
export const loadDiscoveryRails = (
  keys: ReadonlyArray<DiscoveryRailKey>
): Promise<Array<DiscoveryRail>> =>
  Promise.all(
    keys.map(async (key): Promise<DiscoveryRail> => {
      const { load, ...definition } = railDefinitions[key];

      try {
        return {
          ...definition,
          items: (await load()).slice(0, MEDIA_RAIL_ITEM_LIMIT),
          key,
        };
      } catch (error) {
        return { ...definition, error: getErrorMessage(error), items: [], key };
      }
    })
  );

/**
 * The raw trending responses behind the Explore featured slideshow. They are
 * the same cached reads the trending rails use, so the hero can never feature a
 * different snapshot than the rail below it.
 */
export const loadTrendingDiscoveryResults = async (): Promise<{
  movies: Array<MovieListItemType>;
  shows: Array<TVShowItem>;
}> => {
  const [movies, shows] = await Promise.allSettled([
    loadTrendingMovieResults(),
    loadTrendingTVShowResults(),
  ]);

  return {
    movies: movies.status === 'fulfilled' ? movies.value : [],
    shows: shows.status === 'fulfilled' ? shows.value : [],
  };
};
