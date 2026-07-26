import type { MediaOverviewItem } from 'lib/pages/media/overview';
import type { MediaType } from 'lib/types';
import type { Route } from 'next';

/**
 * The discovery lists Home and Explore share. Both pages resolve their rails
 * from the same definitions and the same cached TMDB reads, so a list that
 * appears on both — "Popular Movies", "Highest-Rated TV Shows", and the rest —
 * carries the same name and the same titles in the same order. Only which rails
 * a page renders, and what surrounds them, differs.
 */
export type DiscoveryRailKey =
  | 'popular_movies'
  | 'popular_tv_shows'
  | 'top_rated_movies'
  | 'top_rated_tv_shows'
  | 'trending_movies'
  | 'trending_tv_shows'
  | 'upcoming_movies';

export const DISCOVERY_RAIL_TITLES = {
  popular_movies: 'Popular Movies',
  popular_tv_shows: 'Popular TV Shows',
  top_rated_movies: 'Highest-Rated Movies',
  top_rated_tv_shows: 'Highest-Rated TV Shows',
  trending_movies: 'Trending Movies This Week',
  trending_tv_shows: 'Trending TV Shows This Week',
  upcoming_movies: 'New & Upcoming Movies',
} as const satisfies Record<DiscoveryRailKey, string>;

/** Which page a list can be placed on. Both surfaces share one list catalogue. */
export type DiscoverySurface = 'explore' | 'home';

/**
 * Admin-managed configuration for one shared list. Every visitor sees the same
 * lists, so this is global rather than per user, which is exactly what lets a
 * single cached TMDB response serve the whole audience.
 */
export type DiscoveryListSetting = {
  active: boolean;
  /**
   * Part of the Data Cache key. Bumping it in the dashboard is the manual
   * "fetch now": the next read misses and repopulates from TMDB.
   */
  cacheEpoch: number;
  /** How many titles the "See All" page carries for this list. */
  itemLimit: number;
  key: DiscoveryRailKey;
  position: number;
  refreshIntervalHours: number;
  refreshedAt: string | null;
  showOnExplore: boolean;
  showOnHome: boolean;
};

export const DISCOVERY_LIST_ITEM_LIMIT = { max: 100, min: 5 } as const;
export const DISCOVERY_LIST_REFRESH_HOURS = { max: 720, min: 1 } as const;

/**
 * The shipped configuration, and the fallback whenever the settings table is
 * unreachable or has no row for a list yet. Discovery must keep rendering when
 * Neon is down, so the public pages never depend on a successful settings read.
 */
export const DEFAULT_DISCOVERY_LIST_SETTINGS = [
  {
    active: true,
    cacheEpoch: 0,
    itemLimit: 30,
    key: 'trending_movies',
    position: 0,
    refreshIntervalHours: 12,
    refreshedAt: null,
    showOnExplore: true,
    showOnHome: true,
  },
  {
    active: true,
    cacheEpoch: 0,
    itemLimit: 30,
    key: 'trending_tv_shows',
    position: 1,
    refreshIntervalHours: 12,
    refreshedAt: null,
    showOnExplore: true,
    showOnHome: true,
  },
  {
    active: true,
    cacheEpoch: 0,
    itemLimit: 30,
    key: 'upcoming_movies',
    position: 2,
    refreshIntervalHours: 24,
    refreshedAt: null,
    showOnExplore: true,
    showOnHome: false,
  },
  {
    active: true,
    cacheEpoch: 0,
    itemLimit: 30,
    key: 'popular_movies',
    position: 3,
    refreshIntervalHours: 24,
    refreshedAt: null,
    showOnExplore: true,
    showOnHome: true,
  },
  {
    active: true,
    cacheEpoch: 0,
    itemLimit: 30,
    key: 'popular_tv_shows',
    position: 4,
    refreshIntervalHours: 24,
    refreshedAt: null,
    showOnExplore: true,
    showOnHome: true,
  },
  {
    active: true,
    cacheEpoch: 0,
    itemLimit: 30,
    key: 'top_rated_movies',
    position: 5,
    refreshIntervalHours: 168,
    refreshedAt: null,
    showOnExplore: true,
    showOnHome: true,
  },
  {
    active: true,
    cacheEpoch: 0,
    itemLimit: 30,
    key: 'top_rated_tv_shows',
    position: 6,
    refreshIntervalHours: 168,
    refreshedAt: null,
    showOnExplore: true,
    showOnHome: true,
  },
] as const satisfies ReadonlyArray<DiscoveryListSetting>;

export const DISCOVERY_RAIL_KEYS = DEFAULT_DISCOVERY_LIST_SETTINGS.map(
  (setting) => setting.key
) as ReadonlyArray<DiscoveryRailKey>;

/**
 * The cache tag every read of one list carries. Purging it is the manual "fetch
 * now": the cached TMDB response is dropped at once instead of being served
 * until its window closes.
 */
export const discoveryListCacheTag = (key: DiscoveryRailKey) =>
  `discovery-list:${key}`;

export const isDiscoveryRailKey = (value: string): value is DiscoveryRailKey =>
  DISCOVERY_RAIL_KEYS.includes(value as DiscoveryRailKey);

/**
 * Selects and orders the lists one surface shows. A deselected list keeps its
 * row — and its limits — so it can be switched back on later without being
 * reconfigured from scratch.
 */
export const selectDiscoveryListSettings = (
  settings: ReadonlyArray<DiscoveryListSetting>,
  surface: DiscoverySurface
): Array<DiscoveryListSetting> =>
  settings
    .filter(
      (setting) =>
        setting.active &&
        (surface === 'home' ? setting.showOnHome : setting.showOnExplore)
    )
    .toSorted(
      (first, second) =>
        first.position - second.position || first.key.localeCompare(second.key)
    );

/**
 * Maps a "See All" route back to the list that links to it so the complete
 * list honours the same admin-configured size as its rail.
 */
export const discoveryRailKeyForList = (input: {
  isMovie: boolean;
  listType: string;
}): DiscoveryRailKey | null => {
  const movieKeys: Record<string, DiscoveryRailKey> = {
    popular: 'popular_movies',
    top_rated: 'top_rated_movies',
    trending_week: 'trending_movies',
    upcoming: 'upcoming_movies',
  };
  const tvKeys: Record<string, DiscoveryRailKey> = {
    popular: 'popular_tv_shows',
    top_rated: 'top_rated_tv_shows',
    trending_week: 'trending_tv_shows',
  };

  return (
    (input.isMovie ? movieKeys[input.listType] : tvKeys[input.listType]) ?? null
  );
};

/**
 * The shipped Home selection. Live placement comes from the settings above;
 * this stays as the loading skeleton's section list and the shape a fresh
 * database starts from.
 */
export const HOME_DISCOVERY_RAIL_KEYS = [
  'trending_movies',
  'trending_tv_shows',
  'popular_movies',
  'popular_tv_shows',
  'top_rated_movies',
  'top_rated_tv_shows',
] as const satisfies ReadonlyArray<DiscoveryRailKey>;

/** Explore adds the featured slideshow, search, and the upcoming rail. */
export const EXPLORE_DISCOVERY_RAIL_KEYS = [
  'trending_movies',
  'trending_tv_shows',
  'upcoming_movies',
  'popular_movies',
  'popular_tv_shows',
  'top_rated_movies',
  'top_rated_tv_shows',
] as const satisfies ReadonlyArray<DiscoveryRailKey>;

export type DiscoveryRail = {
  /** Set when TMDB could not serve the list; the page shows a state panel. */
  error?: string;
  /** The admin-configured preview size, capped at the shared shelf size. */
  itemLimit: number;
  items: Array<MediaOverviewItem>;
  key: DiscoveryRailKey;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: Route;
  title: string;
};

export const discoveryRailTitles = (
  keys: ReadonlyArray<DiscoveryRailKey>
): Array<string> => keys.map((key) => DISCOVERY_RAIL_TITLES[key]);
