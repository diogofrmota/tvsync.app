import { getPublicProfileData } from 'lib/features/profile';
import { ProfileFavoritesPage } from 'lib/pages/profile/favorites';
import { MediaType } from 'lib/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Public favourite movies and TV shows on TvSync.',
  title: 'TvSync | Favourites',
};

const favoriteSections = {
  movies: { mediaType: MediaType.Movie, title: '❤️ Favourite Movies' },
  'tv-shows': { mediaType: MediaType.Tv, title: '❤️ Favourite TV Shows' },
} as const;

type FavoriteSectionKey = keyof typeof favoriteSections;

const isFavoriteSectionKey = (value: string): value is FavoriteSectionKey =>
  Object.hasOwn(favoriteSections, value);

export default async function Page({
  params,
}: {
  params: Promise<{ mediaType: string; username: string }>;
}) {
  const { mediaType, username } = await params;

  if (!(username && isFavoriteSectionKey(mediaType))) {
    notFound();
  }

  const section = favoriteSections[mediaType];
  const data = await getPublicProfileData(decodeURIComponent(username));

  if (!data) {
    notFound();
  }

  return (
    <ProfileFavoritesPage
      backHref={`/profile/${data.profile.username}`}
      items={data.favorites.filter(
        (item) => item.mediaType === section.mediaType
      )}
      mediaType={section.mediaType}
      subtitle={`Favourites shared by @${data.profile.username}.`}
      title={section.title}
    />
  );
}
