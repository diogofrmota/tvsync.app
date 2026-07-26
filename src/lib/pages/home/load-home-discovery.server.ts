import 'server-only';

import type { HomeDiscoverySection } from 'lib/pages/home/config';
import { loadDiscoveryRails } from 'lib/pages/media/discovery-rails.server';

/**
 * Home reads the shared discovery rails, so every list it shows is byte for
 * byte the list Explore shows under the same name. Which lists appear here, and
 * in what order, is admin-configured rather than fixed in code.
 */
export const loadHomeDiscoverySections = (): Promise<
  Array<HomeDiscoverySection>
> => loadDiscoveryRails('home');
