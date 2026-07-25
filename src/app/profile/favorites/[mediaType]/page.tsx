import { getOwnProfileFavorites } from 'lib/features/profile/profile-favorites.server';
import { ProfileFavoritesPage } from 'lib/pages/profile/favorites';
import { requireOwnProfile } from 'lib/pages/profile/route-guards.server';
import { MediaType } from 'lib/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'The complete list of titles you marked as favourites.',
  title: 'TvSync | Your Favourites',
};

const favoriteSections = {
  movies: {
    mediaType: MediaType.Movie,
    title: '❤️ Favourite Movies',
  },
  'tv-shows': {
    mediaType: MediaType.Tv,
    title: '❤️ Favourite TV Shows',
  },
} as const;

type FavoriteSectionKey = keyof typeof favoriteSections;

const isFavoriteSectionKey = (value: string): value is FavoriteSectionKey =>
  Object.hasOwn(favoriteSections, value);

export default async function Page({
  params,
}: {
  params: Promise<{ mediaType: string }>;
}) {
  const { mediaType } = await params;

  if (!isFavoriteSectionKey(mediaType)) {
    notFound();
  }

  const section = favoriteSections[mediaType];
  await requireOwnProfile(`/profile/favorites/${mediaType}`);
  const favorites = await getOwnProfileFavorites().catch(() => []);

  return (
    <ProfileFavoritesPage
      items={favorites.filter((item) => item.mediaType === section.mediaType)}
      mediaType={section.mediaType}
      title={section.title}
    />
  );
}
