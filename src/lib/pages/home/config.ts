import { MEDIA_RAIL_ITEM_LIMIT } from 'lib/components/shared/MediaRail';
import {
  type DiscoveryRail,
  discoveryRailTitles,
  HOME_DISCOVERY_RAIL_KEYS,
} from 'lib/pages/media/discovery-rails';

// Home previews the same number of titles per horizontally scrollable rail as
// Explore and the Movies/TV overviews.
export const HOME_PREVIEW_ITEM_COUNT = MEDIA_RAIL_ITEM_LIMIT;

// Home renders the shared discovery rails, so its section names are the shared
// rail names rather than a second list maintained here.
export const HOME_SECTION_TITLES = discoveryRailTitles(
  HOME_DISCOVERY_RAIL_KEYS
);

export type HomeDiscoverySection = DiscoveryRail;
