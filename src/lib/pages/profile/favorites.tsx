import { Button } from '@chakra-ui/react';
import { MediaGrid } from 'lib/components/shared/MediaGrid';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import type { ProfileFavoriteItem } from 'lib/features/profile/profile-favorites.server';
import type { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

/** The complete favourites list behind the profile favourite rails. */
export const ProfileFavoritesPage = ({
  backHref = '/profile',
  items,
  mediaType,
  subtitle = 'Titles you marked as favourites.',
  title,
}: {
  backHref?: string;
  items: Array<ProfileFavoriteItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  subtitle?: string;
  title: string;
}) => (
  <PageShell>
    <PageHeading
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={backHref as Route}>Back to Profile</Link>
        </Button>
      }
      subtitle={subtitle}
      title={title}
    />
    {items.length > 0 ? (
      <MediaGrid items={items} mediaType={mediaType} />
    ) : (
      <StatePanel
        message="Open a movie or TV show and use the heart to add it here."
        title="No favourites yet"
      />
    )}
  </PageShell>
);
