import 'server-only';

import type { HomeDiscoverySection } from 'lib/pages/home/config';
import { HOME_DISCOVERY_RAIL_KEYS } from 'lib/pages/media/discovery-rails';
import { loadDiscoveryRails } from 'lib/pages/media/discovery-rails.server';

/**
 * Home reads the shared discovery rails, so every list it shows is byte for
 * byte the list Explore shows under the same name.
 */
export const loadHomeDiscoverySections = (): Promise<
  Array<HomeDiscoverySection>
> => loadDiscoveryRails(HOME_DISCOVERY_RAIL_KEYS);
