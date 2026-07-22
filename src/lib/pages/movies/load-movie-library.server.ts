import 'server-only';

import type { MovieLibraryItem } from 'lib/features/library/types';
import { listOwnMediaByType } from 'lib/services/database/tracking.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { MediaType, type MovieWatchStatus } from 'lib/types';

export const loadOwnMovieLibraryItems = async () => {
  const rows = await listOwnMediaByType(MediaType.Movie);
  const items = await Promise.all(
    rows.map(async (row): Promise<MovieLibraryItem | null> => {
      try {
        const detail = await getMovieDetailServer(row.tmdb_id);

        return {
          dateAdded: row.date_added,
          id: row.id,
          posterPath: detail.poster_path,
          status: row.watch_status as MovieWatchStatus,
          title: detail.title,
          tmdbId: row.tmdb_id,
        };
      } catch {
        return null;
      }
    })
  );

  return items.filter((item) => item !== null);
};
