import { Button, Stack } from '@chakra-ui/react';
import { MediaRail } from 'lib/components/shared/MediaRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import { CreateCustomListForm } from 'lib/features/lists/create-list-form';
import {
  type CustomListWithItems,
  getCustomListHref,
} from 'lib/features/lists/types';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

/** Every personalized list the user owns, each in the shared rail. */
export const ProfileListsPage = ({
  lists,
}: {
  lists: Array<CustomListWithItems>;
}) => (
  <PageShell>
    <PageHeading
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={'/profile' as Route}>Back to Profile</Link>
        </Button>
      }
      subtitle="Collections you created from your library."
      title="Personalized Lists"
    />
    <CreateCustomListForm />
    <Stack gap={{ base: 8, md: 12 }}>
      {lists.length > 0 ? (
        lists.map((list) => (
          <MediaRail
            description={list.description || undefined}
            fallback={
              list.items.length === 0 ? (
                <StatePanel message="This list is empty. Open it to add titles from your library." />
              ) : null
            }
            items={list.items}
            key={list.id}
            mediaType={MediaType.Movie}
            seeAllHref={getCustomListHref(list.id) as Route}
            title={list.name}
          />
        ))
      ) : (
        <StatePanel message="You have not created a personalized list yet. Name one above to get started." />
      )}
    </Stack>
  </PageShell>
);
