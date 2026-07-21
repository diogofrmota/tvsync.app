import 'server-only';

import {
  listOwnMedia,
  listOwnWatchlistItems,
} from 'lib/services/database/tracking.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType } from 'lib/types';

import type { WatchlistPageItem } from './index';

export const loadOwnWatchlistPageItems = async () => {
  const [savedItems, mediaRows] = await Promise.all([
    listOwnWatchlistItems(),
    listOwnMedia(),
  ]);
  const mediaStatusByKey = new Map(
    mediaRows.map((item) => [
      `${item.media_type}:${item.tmdb_id}`,
      item.watch_status,
    ])
  );
  const items = await Promise.all(
    savedItems.map(async (item): Promise<WatchlistPageItem | null> => {
      try {
        if (item.media_type === MediaType.Movie) {
          const detail = await getMovieDetailServer(item.tmdb_id);

          return {
            dateAdded: item.date_added,
            id: item.id,
            mediaType: MediaType.Movie,
            overview: detail.overview,
            posterPath: detail.poster_path,
            releaseDate: detail.release_date,
            status:
              mediaStatusByKey.get(`${MediaType.Movie}:${item.tmdb_id}`) ??
              null,
            title: detail.title,
            tmdbId: item.tmdb_id,
            voteAverage: detail.vote_average,
          };
        }

        const detail = await getTvShowDetail(item.tmdb_id);

        return {
          dateAdded: item.date_added,
          id: item.id,
          mediaType: MediaType.Tv,
          overview: detail.overview,
          posterPath: detail.poster_path,
          releaseDate: detail.first_air_date,
          status:
            mediaStatusByKey.get(`${MediaType.Tv}:${item.tmdb_id}`) ?? null,
          title: detail.name,
          tmdbId: item.tmdb_id,
          voteAverage: detail.vote_average,
        };
      } catch {
        return null;
      }
    })
  );

  return items.filter((item) => item !== null);
};
