import 'server-only';

import { MEDIA_RAIL_ITEM_LIMIT } from 'lib/components/shared/MediaRail';
import type { MediaCardEntry } from 'lib/components/shared/media-item';
import {
  hydrateMediaCardItems,
  type MediaCardRef,
} from 'lib/features/library/media-card-hydration.server';
import { getMediaLibraryKey } from 'lib/features/library/media-library-keys';
import type {
  CustomListItemRow,
  CustomListRow,
} from 'lib/services/database/custom-lists.server';
import {
  getOwnCustomList,
  listOwnCustomListItems,
  listOwnCustomLists,
} from 'lib/services/database/custom-lists.server';

import type { CustomListSummary, CustomListWithItems } from './types';

const toSummary = (row: CustomListRow): CustomListSummary => ({
  createdAt: row.created_at,
  description: row.description,
  id: row.id,
  itemCount: row.item_count,
  name: row.name,
});

const toRef = (row: CustomListItemRow): MediaCardRef => ({
  mediaType: row.media_type,
  tmdbId: row.tmdb_id,
});

const groupItemsByList = (
  rows: Array<CustomListItemRow>,
  itemLimit: number
) => {
  const rowsByList = new Map<string, Array<CustomListItemRow>>();

  for (const row of rows) {
    const listRows = rowsByList.get(row.list_id) ?? [];

    if (listRows.length < itemLimit) {
      listRows.push(row);
    }

    rowsByList.set(row.list_id, listRows);
  }

  return rowsByList;
};

/**
 * Hydrates every distinct title once, even when the same movie sits in several
 * lists, so a profile with five personalized lists still costs one TMDB read
 * per unique title.
 */
const hydrateUniqueRefs = async (refs: Array<MediaCardRef>) => {
  const uniqueRefs = new Map<string, MediaCardRef>(
    refs.map((ref) => [getMediaLibraryKey(ref), ref])
  );
  const entries = await hydrateMediaCardItems(Array.from(uniqueRefs.values()));

  return new Map<string, MediaCardEntry>(
    entries.map((entry) => [
      getMediaLibraryKey({ mediaType: entry.mediaType, tmdbId: entry.id }),
      entry,
    ])
  );
};

export const loadOwnCustomLists = async ({
  itemLimit = MEDIA_RAIL_ITEM_LIMIT,
  listLimit,
}: {
  itemLimit?: number;
  listLimit?: number;
} = {}): Promise<Array<CustomListWithItems>> => {
  const listRows = await listOwnCustomLists(listLimit);

  if (listRows.length === 0) {
    return [];
  }

  const itemRows = await listOwnCustomListItems(listRows.map((row) => row.id));
  const rowsByList = groupItemsByList(itemRows, itemLimit);
  const entryByKey = await hydrateUniqueRefs(
    Array.from(rowsByList.values()).flat().map(toRef)
  );

  return listRows.map((row) => ({
    ...toSummary(row),
    items: (rowsByList.get(row.id) ?? []).flatMap((itemRow) => {
      const entry = entryByKey.get(getMediaLibraryKey(toRef(itemRow)));

      return entry ? [entry] : [];
    }),
  }));
};

export const loadOwnCustomList = async (
  listId: string,
  itemLimit = 200
): Promise<CustomListWithItems | null> => {
  const listRow = await getOwnCustomList(listId);

  if (!listRow) {
    return null;
  }

  const itemRows = await listOwnCustomListItems([listRow.id]);
  const entries = await hydrateMediaCardItems(
    itemRows.slice(0, itemLimit).map(toRef)
  );

  return { ...toSummary(listRow), items: entries };
};
