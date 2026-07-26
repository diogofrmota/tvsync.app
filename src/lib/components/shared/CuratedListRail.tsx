import { MediaRail } from 'lib/components/shared/MediaRail';
import {
  type CuratedListRail as CuratedListRailData,
  curatedListHref,
} from 'lib/pages/media/curated-lists';
import { MediaType } from 'lib/types';
import type { Route } from 'next';

/**
 * A curated list renders through the same shared rail as every discovery
 * section, so an editorial list is visually indistinguishable from the rest of
 * the page. Its titles carry their own media type because one list can hold
 * both movies and TV shows; the rail's own `mediaType` is only the fallback.
 */
export const CuratedListRail = ({ rail }: { rail: CuratedListRailData }) => (
  <MediaRail
    description={rail.description || undefined}
    items={rail.items}
    mediaType={MediaType.Movie}
    seeAllHref={curatedListHref(rail.id) as Route}
    title={rail.name}
  />
);
