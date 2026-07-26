import type { MediaCardEntry } from 'lib/components/shared/media-item';
import type { DiscoverySurface } from 'lib/pages/media/discovery-rails';

/**
 * An operator-curated list as the public surfaces see it. Unlike the shared
 * discovery rails, a curated list is a fixed set of titles stored in Neon, so
 * rendering one costs no TMDB request at all: the poster and title are captured
 * when the admin adds the entry.
 */
export type CuratedListRail = {
  description: string;
  id: string;
  /** Mixed by nature: one list can hold both movies and TV shows. */
  items: Array<MediaCardEntry>;
  name: string;
  position: number;
  showOnExplore: boolean;
  showOnHome: boolean;
};

/** Where a curated list's "See All" opens. */
export const curatedListHref = (id: string) => `/lists/${id}` as const;

/**
 * The published lists one surface shows, in the admin-configured order. An
 * empty list is dropped rather than rendered as an empty shelf, so publishing a
 * list before filling it never leaves a bare heading on Home.
 */
export const selectCuratedListRails = (
  rails: ReadonlyArray<CuratedListRail>,
  surface: DiscoverySurface
): Array<CuratedListRail> =>
  rails
    .filter(
      (rail) =>
        rail.items.length > 0 &&
        (surface === 'home' ? rail.showOnHome : rail.showOnExplore)
    )
    .toSorted(
      (first, second) =>
        first.position - second.position ||
        first.name.localeCompare(second.name)
    );
