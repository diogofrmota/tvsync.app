import 'server-only';

import type { MediaCardEntry } from 'lib/components/shared/media-item';
import type { CuratedListRail } from 'lib/pages/media/curated-lists';
import { MediaType } from 'lib/types';
import { revalidateTag, unstable_cache } from 'next/cache';

import { SELECT_PUBLIC_CURATED_LISTS_QUERY } from './admin-curated-list-queries';
import { getDatabaseSql } from './core.server';

export const CURATED_LISTS_TAG = 'curated-lists';

/**
 * Every visitor sees the same published lists, so this read is cached for the
 * whole app rather than per request. The window is short and every dashboard
 * mutation busts the tag, so an edit is live within a second while a steady
 * state costs about one query per five minutes no matter the traffic.
 */
const CURATED_LISTS_REVALIDATE_SECONDS = 300;

const toText = (value: unknown) => (typeof value === 'string' ? value : '');

const toPositiveInteger = (value: unknown) => {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

const mapItems = (value: unknown): Array<MediaCardEntry> => {
  const rows = Array.isArray(value) ? value : [];

  return rows.flatMap((row) => {
    if (!(row && typeof row === 'object')) {
      return [];
    }

    const item = row as Record<string, unknown>;
    const mediaType = toText(item.media_type);
    const id = toPositiveInteger(item.tmdb_id);

    if (
      !(id && (mediaType === MediaType.Movie || mediaType === MediaType.Tv))
    ) {
      return [];
    }

    return [
      {
        id,
        mediaType,
        posterPath: toText(item.poster_path) || null,
        title: toText(item.title),
      },
    ];
  });
};

const readPublicCuratedLists = async (): Promise<Array<CuratedListRail>> => {
  const sql = getDatabaseSql();
  const rows = (await sql.query(SELECT_PUBLIC_CURATED_LISTS_QUERY)) as Array<
    Record<string, unknown>
  >;

  return rows.map((row) => ({
    description: toText(row.description),
    id: toText(row.id),
    items: mapItems(row.items),
    name: toText(row.name),
    position: toPositiveInteger(row.position),
    showOnExplore: row.show_on_explore === true,
    showOnHome: row.show_on_home === true,
  }));
};

const cachedPublicCuratedLists = unstable_cache(
  readPublicCuratedLists,
  ['public-curated-lists'],
  {
    revalidate: CURATED_LISTS_REVALIDATE_SECONDS,
    tags: [CURATED_LISTS_TAG],
  }
);

/**
 * The published curated lists. Discovery must survive a database outage, so a
 * failed read degrades to no curated rails — the shared discovery rails still
 * render — instead of failing the page. Failures are deliberately not cached.
 */
export const loadPublicCuratedLists = (): Promise<Array<CuratedListRail>> =>
  cachedPublicCuratedLists().catch((error) => {
    console.error('Failed to load curated lists:', error);

    return [] as Array<CuratedListRail>;
  });

/** One published list by id, for its "See All" page. */
export const findPublicCuratedList = async (
  id: string
): Promise<CuratedListRail | null> => {
  const lists = await loadPublicCuratedLists();

  return lists.find((list) => list.id === id) ?? null;
};

export const revalidateCuratedLists = () => {
  revalidateTag(CURATED_LISTS_TAG, 'max');
};
