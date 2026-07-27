import { getOwnProfileReviews } from 'lib/features/profile/profile-reviews.server';
import { ProfileReviewsPage } from 'lib/pages/profile/reviews';
import { requireOwnProfile } from 'lib/pages/profile/route-guards.server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Every review you have written on TvSync.',
  title: 'TvSync | Your Reviews',
};

export default async function Page() {
  await requireOwnProfile('/profile/reviews');

  const reviews = await getOwnProfileReviews().catch(() => []);

  return <ProfileReviewsPage reviews={reviews} />;
}
