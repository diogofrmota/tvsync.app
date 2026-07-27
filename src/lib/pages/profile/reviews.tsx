import { Button } from '@chakra-ui/react';
import { ProfileReviewList } from 'lib/components/profile/ProfileReviews';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import type { ProfileReviewItem } from 'lib/features/profile/profile-reviews.server';
import type { Route } from 'next';
import Link from 'next/link';

/**
 * The "See All" destination for the profile Reviews section: every review the
 * account has written, newest first, in the same poster-led card.
 */
export const ProfileReviewsPage = ({
  reviews,
}: {
  reviews: Array<ProfileReviewItem>;
}) => (
  <PageShell>
    <PageHeading
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={'/profile' as Route}>Back to Profile</Link>
        </Button>
      }
      subtitle="Every review you have written on TvSync."
      title="Reviews"
    />
    {reviews.length > 0 ? (
      <ProfileReviewList clamp={12} reviews={reviews} />
    ) : (
      <StatePanel message="You have not written a review yet. Rate a show or film and add a review from its page." />
    )}
  </PageShell>
);
