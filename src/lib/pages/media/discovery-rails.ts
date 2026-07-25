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

/** Home shows the shared lists on their own, below the signed-out hero. */
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
  items: Array<MediaOverviewItem>;
  key: DiscoveryRailKey;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: Route;
  title: string;
};

export const discoveryRailTitles = (
  keys: ReadonlyArray<DiscoveryRailKey>
): Array<string> => keys.map((key) => DISCOVERY_RAIL_TITLES[key]);
