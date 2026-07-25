import { Button, Stack } from '@chakra-ui/react';
import GridContainer from 'lib/components/shared/GridContainer';
import type { MediaCardEntry } from 'lib/components/shared/media-item';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import { getMediaLibraryKey } from 'lib/features/library/media-library-keys';
import { CustomListEditor } from 'lib/features/lists/list-editor';
import {
  AddLibraryTitleToListForm,
  RemoveListItemButton,
} from 'lib/features/lists/list-item-controls';
import type { CustomListWithItems } from 'lib/features/lists/types';
import type { Route } from 'next';
import Link from 'next/link';

/** One personalized list: its titles, plus the controls that maintain it. */
export const ProfileListDetailPage = ({
  libraryOptions,
  list,
}: {
  libraryOptions: Array<MediaCardEntry>;
  list: CustomListWithItems;
}) => (
  <PageShell>
    <PageHeading
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={'/profile/lists' as Route}>Back to Lists</Link>
        </Button>
      }
      subtitle={list.description || `${list.itemCount} saved titles.`}
      title={list.name}
    />

    <Stack as="section" gap={5}>
      <SectionHeading title="Titles" />
      <AddLibraryTitleToListForm listId={list.id} options={libraryOptions} />
      {list.items.length > 0 ? (
        <GridContainer>
          {list.items.map((item) => (
            <PosterCard
              actions={
                <RemoveListItemButton
                  listId={list.id}
                  mediaType={item.mediaType}
                  title={item.title}
                  tmdbId={item.id}
                />
              }
              id={item.id}
              imageUrl={item.posterPath}
              key={getMediaLibraryKey({
                mediaType: item.mediaType,
                tmdbId: item.id,
              })}
              layout="grid"
              mediaType={item.mediaType}
              name={item.title}
              prefetch={false}
            />
          ))}
        </GridContainer>
      ) : (
        <StatePanel message="This list is empty. Add a title from your library above." />
      )}
    </Stack>

    <Stack as="section" gap={5}>
      <SectionHeading title="List Settings" />
      <CustomListEditor list={list} />
    </Stack>
  </PageShell>
);
