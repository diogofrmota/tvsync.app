import type { MediaOverviewItem } from 'lib/pages/media/overview';
import type { MediaType } from 'lib/types';
import type { Route } from 'next';

export const HOME_PREVIEW_ITEM_COUNT = 9;

export const HOME_SECTION_TITLES = [
  'Popular Movies',
  'Highest-Rated Movies',
  'Popular TV Shows',
  'Highest-Rated TV Shows',
] as const;

export type HomeDiscoverySection = {
  error?: string;
  items: Array<MediaOverviewItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: Route;
  title: (typeof HOME_SECTION_TITLES)[number];
};
