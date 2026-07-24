import { MEDIA_RAIL_ITEM_LIMIT } from 'lib/components/shared/MediaRail';
import type { MediaOverviewItem } from 'lib/pages/media/overview';
import type { MediaType } from 'lib/types';
import type { Route } from 'next';

// Home previews the same number of titles per horizontally scrollable rail as
// Explore and the Movies/TV overviews.
export const HOME_PREVIEW_ITEM_COUNT = MEDIA_RAIL_ITEM_LIMIT;

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
