import { loadOwnCustomLists } from 'lib/features/lists/custom-lists.server';
import { ProfileListsPage } from 'lib/pages/profile/lists';
import { requireOwnProfile } from 'lib/pages/profile/route-guards.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Personalized movie and TV show lists you created on TvSync.',
  title: 'TvSync | Personalized Lists',
};

export default async function Page() {
  await requireOwnProfile('/profile/lists');
  const lists = await loadOwnCustomLists().catch(() => []);

  return <ProfileListsPage lists={lists} />;
}
