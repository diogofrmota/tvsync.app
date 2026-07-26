import { Button } from '@chakra-ui/react';
import { MediaReviews } from 'lib/components/shared/MediaReviews';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import type { MediaReview } from 'lib/services/tmdb/reviews';
import type { Route } from 'next';
import Link from 'next/link';

/**
 * The "See All" destination behind the Reviews section on a movie or TV show
 * detail page: one complete list of the TMDB member reviews that page previews,
 * with a link back to the title itself.
 */
export const MediaReviewsPage = ({
  backHref,
  backLabel,
  reviews,
  title,
}: {
  backHref: Route;
  backLabel: string;
  reviews: Array<MediaReview>;
  title: string;
}) => (
  <PageShell>
    <PageHeading
      actions={
        <Button
          _hover={{ background: 'gray.100', color: 'gray.900' }}
          asChild
          background="white"
          color="gray.900"
          variant="outline"
        >
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      }
      subtitle={`Every review TMDB members have published for ${title}.`}
      title="Reviews"
    />
    <MediaReviews reviews={reviews} showAll />
  </PageShell>
);
