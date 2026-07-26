import 'server-only';

import { MediaGrid } from 'lib/components/shared/MediaGrid';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import type { CuratedListRail } from 'lib/pages/media/curated-lists';
import { MediaType } from 'lib/types';

/**
 * The complete curated list behind a rail's "See All". Every title is already
 * stored, so this route renders one grid without a single TMDB request and
 * without a pager, exactly like the other "See All" lists.
 */
export const CuratedListPage = ({ list }: { list: CuratedListRail }) => (
  <PageShell>
    <PageHeading
      subtitle={
        list.description ||
        `${list.items.length} ${list.items.length === 1 ? 'title' : 'titles'} picked by TvSync.`
      }
      title={list.name}
    />
    <MediaGrid items={list.items} mediaType={MediaType.Movie} />
  </PageShell>
);
