import 'server-only';

import {
  getAvailableRegularEpisodes,
  getTvLibraryProjection,
  getWatchedAvailableEpisodeKeys,
} from 'lib/features/library/tv-library-state';
import type { TvLibraryItem } from 'lib/features/library/types';
import {
  listOwnEpisodeProgressForTvLibrary,
  listOwnMediaByType,
} from 'lib/services/database/tracking.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, type TvWatchStatus } from 'lib/types';

export const loadOwnTvLibraryItems = async () => {
  const [rows, progressRows] = await Promise.all([
    listOwnMediaByType(MediaType.Tv),
    listOwnEpisodeProgressForTvLibrary(),
  ]);
  const progressByShow = new Map<number, typeof progressRows>();

  for (const progress of progressRows) {
    const showRows = progressByShow.get(progress.tmdb_show_id) ?? [];
    showRows.push(progress);
    progressByShow.set(progress.tmdb_show_id, showRows);
  }

  const items = await Promise.all(
    rows.map(async (row): Promise<TvLibraryItem | null> => {
      try {
        const detail = await getTvShowDetail(row.tmdb_id);
        const availableEpisodes = getAvailableRegularEpisodes(detail.seasons);
        const intentStatus = row.watch_status as TvWatchStatus;
        const projection = getTvLibraryProjection({
          availableEpisodes,
          intentStatus,
          watchedEpisodeKeys: getWatchedAvailableEpisodeKeys(
            availableEpisodes,
            progressByShow.get(row.tmdb_id) ?? []
          ),
        });

        return {
          ...projection,
          dateAdded: row.date_added,
          id: row.id,
          intentStatus,
          posterPath: detail.poster_path,
          title: detail.name,
          tmdbId: row.tmdb_id,
        };
      } catch {
        return null;
      }
    })
  );

  return items.filter((item) => item !== null);
};
