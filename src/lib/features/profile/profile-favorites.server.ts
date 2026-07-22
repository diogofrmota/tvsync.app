import 'server-only';

import type { FavoriteMediaRow } from 'lib/services/database/profile.server';
import {
  listOwnFavorites,
  listPublicFavorites,
} from 'lib/services/database/profile.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { MediaType, type TrackableMediaType } from 'lib/types';

export type ProfileFavoriteItem = {
  id: number;
  mediaType: TrackableMediaType;
  name: string;
  posterPath: string | null;
};

const hydrateFavorite = async (
  row: FavoriteMediaRow
): Promise<ProfileFavoriteItem> => {
  try {
    if (row.media_type === MediaType.Movie) {
      const movie = await getMovieDetailServer(row.tmdb_id);

      return {
        id: row.tmdb_id,
        mediaType: MediaType.Movie,
        name: movie.title || movie.original_title || `Movie ${row.tmdb_id}`,
        posterPath: movie.poster_path,
      };
    }

    const show = await getTvShowDetail(row.tmdb_id);

    return {
      id: row.tmdb_id,
      mediaType: MediaType.Tv,
      name: show.name || show.original_name || `TV show ${row.tmdb_id}`,
      posterPath: show.poster_path,
    };
  } catch {
    return {
      id: row.tmdb_id,
      mediaType: row.media_type,
      name:
        row.media_type === MediaType.Movie
          ? `Movie ${row.tmdb_id}`
          : `TV show ${row.tmdb_id}`,
      posterPath: null,
    };
  }
};

const hydrateFavorites = async (rows: Array<FavoriteMediaRow>) =>
  Promise.all(rows.map(hydrateFavorite));

export const getOwnProfileFavorites = async () =>
  hydrateFavorites(await listOwnFavorites());

export const getPublicProfileFavorites = async (username: string) =>
  hydrateFavorites(await listPublicFavorites(username));
