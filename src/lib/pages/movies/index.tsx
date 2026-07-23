'use client';

import {
  Button,
  Field,
  Grid,
  NativeSelect,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import {
  removeMovieFromLibrary,
  updateMovieLibraryStatus,
} from 'lib/features/library/actions';
import {
  groupMovieLibraryItems,
  removeMovieLibraryItem,
  restoreMovieLibraryItem,
  updateMovieLibraryItemStatus,
} from 'lib/features/library/movie-library-state';
import type { MovieLibraryItem } from 'lib/features/library/types';
import { MediaType, type MovieWatchStatus, WatchStatus } from 'lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type MovieMutationState = {
  message?: string;
  pending: boolean;
  tone?: 'error' | 'success';
};

const discoverMoviesHref = '/search?type=movie';
const statusLabels: Record<MovieWatchStatus, string> = {
  [WatchStatus.Planned]: 'Planned to Watch',
  [WatchStatus.Watched]: 'Finished',
};

const DiscoverMoviesButton = () => (
  <Button asChild size="sm">
    <Link href={discoverMoviesHref}>Discover Movies</Link>
  </Button>
);

const MovieLibraryCard = ({
  item,
  mutation,
  onRemove,
  onStatusChange,
}: {
  item: MovieLibraryItem;
  mutation?: MovieMutationState;
  onRemove: (item: MovieLibraryItem) => void;
  onStatusChange: (item: MovieLibraryItem, status: MovieWatchStatus) => void;
}) => (
  <PosterCard
    actions={
      <Stack gap={2}>
        <Field.Root disabled={mutation?.pending}>
          <Field.Label fontSize="xs">Library status</Field.Label>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              aria-label={`Library status for ${item.title}`}
              minHeight="44px"
              onChange={(event) =>
                onStatusChange(item, event.target.value as MovieWatchStatus)
              }
              value={item.status}
            >
              <option value={WatchStatus.Planned}>Planned to Watch</option>
              <option value={WatchStatus.Watched}>Finished</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        <Button
          disabled={mutation?.pending}
          loading={mutation?.pending}
          minHeight="44px"
          onClick={() => onRemove(item)}
          size="xs"
          variant="outline"
        >
          Remove from library
        </Button>
        {mutation?.message ? (
          <Text
            color={mutation.tone === 'error' ? 'red.400' : 'green.400'}
            fontSize="xs"
            role={mutation.tone === 'error' ? 'alert' : 'status'}
          >
            {mutation.message}
          </Text>
        ) : null}
      </Stack>
    }
    id={item.tmdbId}
    imageUrl={item.posterPath}
    layout="grid"
    mediaType={MediaType.Movie}
    name={item.title}
    prefetch={false}
    status={statusLabels[item.status]}
  />
);

const MovieLibrarySection = ({
  description,
  items,
  mutations,
  onRemove,
  onStatusChange,
  title,
}: {
  description: string;
  items: Array<MovieLibraryItem>;
  mutations: Record<number, MovieMutationState>;
  onRemove: (item: MovieLibraryItem) => void;
  onStatusChange: (item: MovieLibraryItem, status: MovieWatchStatus) => void;
  title: string;
}) => (
  <Stack as="section" gap={5}>
    <SectionHeading description={description} title={title} />
    {items.length > 0 ? (
      <Grid
        columnGap={{ base: 3, md: 5 }}
        rowGap={{ base: 8, md: 10 }}
        templateColumns={{
          base: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(5, minmax(0, 1fr))',
          xl: 'repeat(7, minmax(0, 1fr))',
        }}
      >
        {items.map((item) => (
          <MovieLibraryCard
            item={item}
            key={item.id}
            mutation={mutations[item.tmdbId]}
            onRemove={onRemove}
            onStatusChange={onStatusChange}
          />
        ))}
      </Grid>
    ) : (
      <StatePanel
        action={<DiscoverMoviesButton />}
        message={`No ${title.toLowerCase()} movies yet. Discover a movie to add to your library.`}
      />
    )}
  </Stack>
);

export const MoviesPage = ({
  initialItems,
}: {
  initialItems: Array<MovieLibraryItem>;
}) => {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [mutations, setMutations] = useState<
    Record<number, MovieMutationState>
  >({});
  const [pageMessage, setPageMessage] = useState<MovieMutationState>();

  const setMutation = (tmdbId: number, mutation: MovieMutationState) =>
    setMutations((current) => ({ ...current, [tmdbId]: mutation }));

  const handleStatusChange = async (
    item: MovieLibraryItem,
    nextStatus: MovieWatchStatus
  ) => {
    if (item.status === nextStatus) {
      return;
    }

    const previousStatus = item.status;
    setPageMessage(undefined);
    setMutation(item.tmdbId, { pending: true });
    setItems((current) =>
      updateMovieLibraryItemStatus(current, item.tmdbId, nextStatus)
    );

    const result = await updateMovieLibraryStatus({
      status: nextStatus,
      tmdbId: item.tmdbId,
    }).catch(() => ({
      message: 'We could not save that movie status. Please try again.',
      status: 'error' as const,
      watchStatus: null,
    }));

    if (result.status === 'error' || !result.watchStatus) {
      setItems((current) =>
        updateMovieLibraryItemStatus(current, item.tmdbId, previousStatus)
      );
      setMutation(item.tmdbId, {
        message: result.message,
        pending: false,
        tone: 'error',
      });
      return;
    }

    const confirmedStatus = result.watchStatus;
    setItems((current) =>
      updateMovieLibraryItemStatus(current, item.tmdbId, confirmedStatus)
    );
    setMutation(item.tmdbId, {
      message: result.message,
      pending: false,
      tone: 'success',
    });
    router.refresh();
  };

  const handleRemove = async (item: MovieLibraryItem) => {
    setPageMessage({
      message: `Removing ${item.title} from your library...`,
      pending: true,
    });
    setMutation(item.tmdbId, { pending: true });
    setItems((current) => removeMovieLibraryItem(current, item.tmdbId));

    const result = await removeMovieFromLibrary({
      tmdbId: item.tmdbId,
    }).catch(() => ({
      message: 'We could not remove that movie. Please try again.',
      status: 'error' as const,
      watchStatus: null,
    }));

    if (result.status === 'error') {
      setItems((current) => restoreMovieLibraryItem(current, item));
      setMutation(item.tmdbId, {
        message: result.message,
        pending: false,
        tone: 'error',
      });
      setPageMessage({
        message: result.message,
        pending: false,
        tone: 'error',
      });
      return;
    }

    setMutations((current) => {
      const next = { ...current };
      delete next[item.tmdbId];
      return next;
    });
    setPageMessage({
      message: `${item.title} was removed from your library.`,
      pending: false,
      tone: 'success',
    });
    router.refresh();
  };

  const { finished: finishedItems, planned: plannedItems } =
    groupMovieLibraryItems(items);

  return (
    <PageShell>
      <PageHeading
        subtitle="Keep your movie library organized with two simple statuses."
        title="Movies"
      />
      {pageMessage?.message ? (
        <Text
          color={pageMessage.tone === 'error' ? 'red.400' : 'green.400'}
          fontSize="sm"
          role={pageMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {pageMessage.message}
        </Text>
      ) : null}
      <MovieLibrarySection
        description="Movies you want to watch."
        items={plannedItems}
        mutations={mutations}
        onRemove={handleRemove}
        onStatusChange={handleStatusChange}
        title="Planned to Watch"
      />
      <MovieLibrarySection
        description="Movies you have completed."
        items={finishedItems}
        mutations={mutations}
        onRemove={handleRemove}
        onStatusChange={handleStatusChange}
        title="Finished"
      />
      <Stack as="section" gap={4}>
        <SectionHeading
          description="Find another movie to add to your library."
          title="Discover Movies"
        />
        <DiscoverMoviesButton />
      </Stack>
    </PageShell>
  );
};
