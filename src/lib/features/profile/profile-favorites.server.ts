import 'server-only';

import type { MediaCardEntry } from 'lib/components/shared/media-item';
import { hydrateMediaCardItems } from 'lib/features/library/media-card-hydration.server';
import type { FavoriteMediaRow } from 'lib/services/database/profile.server';
import {
  listOwnFavorites,
  listPublicFavorites,
} from 'lib/services/database/profile.server';

/** Favourites are poster card items, so they render in the shared rails. */
export type ProfileFavoriteItem = MediaCardEntry;

const hydrateFavorites = (rows: Array<FavoriteMediaRow>) =>
  hydrateMediaCardItems(
    rows.map((row) => ({ mediaType: row.media_type, tmdbId: row.tmdb_id }))
  );

export const getOwnProfileFavorites = async () =>
  hydrateFavorites(await listOwnFavorites());

export const getPublicProfileFavorites = async (username: string) =>
  hydrateFavorites(await listPublicFavorites(username));
