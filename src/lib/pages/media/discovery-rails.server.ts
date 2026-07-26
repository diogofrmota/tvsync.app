import 'server-only';

import { MEDIA_RAIL_ITEM_LIMIT } from 'lib/components/shared/MediaRail';
import {
  DISCOVERY_RAIL_TITLES,
  type DiscoveryListSetting,
  type DiscoveryRail,
  type DiscoveryRailKey,
  type DiscoverySurface,
  discoveryListCacheTag,
  selectDiscoveryListSettings,
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
import { loadDiscoveryListSettings } from 'lib/services/database/discovery-lists.server';
import type { TmdbCacheOptions } from 'lib/services/tmdb/constants';
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
 * cached per list rather than per page, which is what keeps Home and Explore
 * showing the same lists instead of two independently ranked snapshots.
 *
 * Every list is identical for every visitor, so the cache is what makes the app
 * affordable at scale: one TMDB request per list per refresh window serves the
 * whole audience. That window, and the manual "fetch now", come from the
 * admin-managed rows in `discovery_list_settings`.
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

const HOUR_IN_SECONDS = 3600;

/**
 * Tagging the underlying TMDB reads is what makes "fetch now" immediate: the
 * dashboard purges the tag, which drops the cached response at the fetch layer
 * as well as the list layer instead of waiting the window out.
 */
export const discoveryListCacheOptions = (input: {
  key: DiscoveryRailKey;
  revalidateSeconds: number;
}): TmdbCacheOptions => ({
  revalidateSeconds: input.revalidateSeconds,
  tags: [discoveryListCacheTag(input.key)],
});

type RailCache = {
  epoch: number;
  key: DiscoveryRailKey;
  revalidateSeconds: number;
};

const railCacheFromSetting = (setting: DiscoveryListSetting): RailCache => ({
  epoch: setting.cacheEpoch,
  key: setting.key,
  revalidateSeconds: setting.refreshIntervalHours * HOUR_IN_SECONDS,
});

/**
 * Caches one list's raw TMDB response. The cache epoch and the refresh window
 * are both part of the key, so forcing a refetch or shortening the cadence
 * applies on the next read instead of whenever the previous entry happened to
 * expire.
 */
const cachedListResults = <Item>(
  cache: RailCache,
  name: string,
  load: (options: TmdbCacheOptions) => Promise<Array<Item>>
) =>
  unstable_cache(
    () =>
      load(
        discoveryListCacheOptions({
          key: cache.key,
          revalidateSeconds: cache.revalidateSeconds,
        })
      ),
    [name, String(cache.epoch), String(cache.revalidateSeconds)],
    {
      revalidate: cache.revalidateSeconds,
      tags: [discoveryListCacheTag(cache.key)],
    }
  )();

/**
 * Trending is cached raw because Explore also builds its featured slideshow
 * from it; sharing the cached response keeps the hero and the trending rails on
 * the same snapshot for one request.
 */
const loadTrendingMovieResults = (cache: RailCache) =>
  cachedListResults(cache, 'discovery-trending-movies', (options) =>
    getTrendingMoviesServer({ page: 1 }, 'week', options).then(
      (response) => response.results
    )
  );

const loadTrendingTVShowResults = (cache: RailCache) =>
  cachedListResults(cache, 'discovery-trending-tv-shows', (options) =>
    getTrendingTVShowsServer({ page: 1 }, 'week', options).then(
      (response) => response.results
    )
  );

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

const buildMovieHref = (
  section: 'popular' | 'top_rated' | 'trending_week' | 'upcoming',
  params: Record<string, number | string> = {}
) => buildMediaOverviewHref({ basePath: '/movies', listType: section, params });

const buildTVShowHref = (
  listType: 'popular' | 'top_rated' | 'trending_week',
  params: Record<string, number | string> = {}
) => buildMediaOverviewHref({ basePath: '/tv', listType, params });

type DiscoveryRailDefinition = Omit<
  DiscoveryRail,
  'error' | 'itemLimit' | 'items' | 'key'
> & {
  load: (cache: RailCache) => Promise<Array<MediaOverviewItem>>;
};

const railDefinitions: Record<DiscoveryRailKey, DiscoveryRailDefinition> = {
  popular_movies: {
    load: async (cache) =>
      shapeMovies(
        await cachedListResults(cache, 'discovery-popular-movies', (options) =>
          getMovieListServer({
            cache: options,
            params: { page: 1, ...popularMovieParams },
            section: 'popular',
          }).then((response) => response.results)
        ),
        qualityFilterFromParams(popularMovieParams)
      ),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('popular', popularMovieParams),
    title: DISCOVERY_RAIL_TITLES.popular_movies,
  },
  popular_tv_shows: {
    load: async (cache) =>
      shapeShows(
        await cachedListResults(
          cache,
          'discovery-popular-tv-shows',
          (options) =>
            getDiscoverTVShowsServer(
              { page: 1, ...popularTVShowParams },
              options
            ).then((response) => response.results)
        ),
        qualityFilterFromParams(popularTVShowParams)
      ),
    mediaType: MediaType.Tv,
    seeAllHref: buildTVShowHref('popular', popularTVShowParams),
    title: DISCOVERY_RAIL_TITLES.popular_tv_shows,
  },
  top_rated_movies: {
    load: async (cache) =>
      shapeMovies(
        await cachedListResults(
          cache,
          'discovery-top-rated-movies',
          (options) =>
            getMovieListServer({
              cache: options,
              params: { page: 1, ...topRatedMovieParams },
              section: 'top_rated',
            }).then((response) => response.results)
        ),
        qualityFilterFromParams(topRatedMovieParams)
      ),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('top_rated', topRatedMovieParams),
    title: DISCOVERY_RAIL_TITLES.top_rated_movies,
  },
  top_rated_tv_shows: {
    load: async (cache) =>
      shapeShows(
        await cachedListResults(
          cache,
          'discovery-top-rated-tv-shows',
          (options) =>
            getDiscoverTVShowsServer(
              { page: 1, ...topRatedTVShowParams },
              options
            ).then((response) => response.results)
        ),
        qualityFilterFromParams(topRatedTVShowParams)
      ),
    mediaType: MediaType.Tv,
    seeAllHref: buildTVShowHref('top_rated', topRatedTVShowParams),
    title: DISCOVERY_RAIL_TITLES.top_rated_tv_shows,
  },
  trending_movies: {
    load: async (cache) =>
      shapeMovies(await loadTrendingMovieResults(cache), trendingMovieQuality),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('trending_week', {
      'vote_average.gte': trendingMovieQuality.minVoteAverage,
      'vote_count.gte': trendingMovieQuality.minVoteCount,
    }),
    title: DISCOVERY_RAIL_TITLES.trending_movies,
  },
  trending_tv_shows: {
    load: async (cache) =>
      shapeShows(await loadTrendingTVShowResults(cache), trendingTVShowQuality),
    mediaType: MediaType.Tv,
    seeAllHref: buildTVShowHref('trending_week', {
      'vote_average.gte': trendingTVShowQuality.minVoteAverage,
      'vote_count.gte': trendingTVShowQuality.minVoteCount,
    }),
    title: DISCOVERY_RAIL_TITLES.trending_tv_shows,
  },
  upcoming_movies: {
    load: async (cache) =>
      shapeMovies(
        await cachedListResults(cache, 'discovery-upcoming-movies', (options) =>
          getMovieListServer({
            cache: options,
            params: { page: 1 },
            section: 'upcoming',
          }).then((response) => response.results)
        )
      ),
    mediaType: MediaType.Movie,
    seeAllHref: buildMovieHref('upcoming'),
    title: DISCOVERY_RAIL_TITLES.upcoming_movies,
  },
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to load TMDB data.';

const loadRail = async (
  setting: DiscoveryListSetting
): Promise<DiscoveryRail> => {
  const { load, ...definition } = railDefinitions[setting.key];
  // A rail previews at most the shared shelf size, and never more titles than
  // its "See All" page carries.
  const itemLimit = Math.min(setting.itemLimit, MEDIA_RAIL_ITEM_LIMIT);

  try {
    return {
      ...definition,
      itemLimit,
      items: (await load(railCacheFromSetting(setting))).slice(0, itemLimit),
      key: setting.key,
    };
  } catch (error) {
    return {
      ...definition,
      error: getErrorMessage(error),
      itemLimit,
      items: [],
      key: setting.key,
    };
  }
};

/**
 * Resolves the lists one surface shows, in the admin-configured order. A
 * section that came back short still previews fine — the complete list is one
 * click behind "See All" — so only a failed list carries an error and no rail
 * is topped up with an extra request.
 */
export const loadDiscoveryRails = async (
  surface: DiscoverySurface
): Promise<Array<DiscoveryRail>> => {
  const settings = selectDiscoveryListSettings(
    await loadDiscoveryListSettings(),
    surface
  );

  return Promise.all(settings.map(loadRail));
};

/**
 * The raw trending responses behind the Explore featured slideshow. They are
 * the same cached reads the trending rails use, so the hero can never feature a
 * different snapshot than the rail below it.
 */
export const loadTrendingDiscoveryResults = async (): Promise<{
  movies: Array<MovieListItemType>;
  shows: Array<TVShowItem>;
}> => {
  const settings = await loadDiscoveryListSettings();
  const settingByKey = new Map(
    settings.map((setting) => [setting.key, setting])
  );
  const movieSetting = settingByKey.get('trending_movies');
  const showSetting = settingByKey.get('trending_tv_shows');
  const [movies, shows] = await Promise.allSettled([
    movieSetting
      ? loadTrendingMovieResults(railCacheFromSetting(movieSetting))
      : Promise.resolve<Array<MovieListItemType>>([]),
    showSetting
      ? loadTrendingTVShowResults(railCacheFromSetting(showSetting))
      : Promise.resolve<Array<TVShowItem>>([]),
  ]);

  return {
    movies: movies.status === 'fulfilled' ? movies.value : [],
    shows: shows.status === 'fulfilled' ? shows.value : [],
  };
};

/**
 * The configured size and cache window for a managed list, read by its "See
 * All" page so the complete list matches the rail that links to it.
 */
export const loadDiscoveryListConfig = async (key: DiscoveryRailKey) => {
  const settings = await loadDiscoveryListSettings();
  const setting = settings.find((candidate) => candidate.key === key);

  return setting
    ? {
        itemLimit: setting.itemLimit,
        revalidateSeconds: setting.refreshIntervalHours * HOUR_IN_SECONDS,
      }
    : null;
};
