import 'server-only';

import type { HomeDiscoverySection } from 'lib/pages/home/config';
import type { CuratedListRail } from 'lib/pages/media/curated-lists';
import { loadCuratedRails } from 'lib/pages/media/curated-rails.server';
import { loadDiscoveryRails } from 'lib/pages/media/discovery-rails.server';

/**
 * Home reads the shared discovery rails, so every list it shows is byte for
 * byte the list Explore shows under the same name. Which lists appear here, and
 * in what order, is admin-configured rather than fixed in code. The admin's own
 * curated lists are loaded alongside them and lead the page.
 */
export const loadHomeDiscoverySections = (): Promise<
  Array<HomeDiscoverySection>
> => loadDiscoveryRails('home');

export const loadHomeCuratedRails = (): Promise<Array<CuratedListRail>> =>
  loadCuratedRails('home');
