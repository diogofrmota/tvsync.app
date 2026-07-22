import { getPublicProfileData } from 'lib/features/profile';
import { PublicProfilePage } from 'lib/pages/profile/public-profile';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  if (!username) {
    return {};
  }

  const decodedUsername = decodeURIComponent(username);
  const data = await getPublicProfileData(decodedUsername);

  if (!data) {
    return {
      title: 'Profile | TVSync',
      description: 'View a public TVSync profile.',
    };
  }

  const displayName = data.profile.display_name || data.profile.username;
  const description =
    data.profile.bio ||
    `See ${displayName}'s public watch statistics and favourites on TvSync.`;

  return {
    title: `${displayName} (@${data.profile.username}) | TVSync`,
    description,
    openGraph: {
      title: `${displayName} (@${data.profile.username}) | TVSync`,
      description,
      url: `/profile/${data.profile.username}`,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  if (!username) {
    notFound();
  }

  const data = await getPublicProfileData(decodeURIComponent(username));

  if (!data) {
    notFound();
  }

  return <PublicProfilePage data={data} />;
}
