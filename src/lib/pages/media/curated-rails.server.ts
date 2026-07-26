import 'server-only';

import {
  type CuratedListRail,
  selectCuratedListRails,
} from 'lib/pages/media/curated-lists';
import type { DiscoverySurface } from 'lib/pages/media/discovery-rails';
import { loadPublicCuratedLists } from 'lib/services/database/curated-lists.server';

/**
 * The published curated lists one surface shows. They are stored rather than
 * fetched, so a curated rail adds no TMDB request to the page — only the one
 * cached Neon read that serves the whole audience.
 */
export const loadCuratedRails = async (
  surface: DiscoverySurface
): Promise<Array<CuratedListRail>> =>
  selectCuratedListRails(await loadPublicCuratedLists(), surface);
