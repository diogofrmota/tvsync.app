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
  removeTvShowFromLibrary,
  updateTvLibraryStatus,
} from 'lib/features/library/actions';
import {
  getOptimisticTvLibraryProjection,
  groupTvLibraryItems,
  removeTvLibraryItem,
  restoreTvLibraryItem,
  updateTvLibraryItemFromProjection,
} from 'lib/features/library/tv-library-state';
import type {
  TvLibraryItem,
  TvLibrarySectionStatus,
} from 'lib/features/library/types';
import { MediaType, WatchStatus } from 'lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const discoverTvShowsHref = '/search?type=tv';

const statusLabels: Record<TvLibrarySectionStatus, string> = {
  [WatchStatus.Completed]: 'Finished',
  [WatchStatus.Planned]: 'Planned to Watch',
  [WatchStatus.Watching]: 'Watching',
};

type TvMutationState = {
  message?: string;
  pending: boolean;
  tone?: 'error' | 'success';
};

const DiscoverTvShowsButton = ({ label = 'Discover TV Shows' }) => (
  <Button asChild size="sm">
    <Link href={discoverTvShowsHref}>{label}</Link>
  </Button>
);

const TvLibraryCard = ({
  item,
  mutation,
  onRemove,
  onStatusChange,
}: {
  item: TvLibraryItem;
  mutation?: TvMutationState;
  onRemove: (item: TvLibraryItem) => void;
  onStatusChange: (item: TvLibraryItem, status: TvLibrarySectionStatus) => void;
}) => (
  <PosterCard
    actions={
      <Stack gap={2}>
        <Field.Root disabled={mutation?.pending}>
          <Field.Label fontSize="xs">Library status</Field.Label>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              aria-label={`Status for ${item.title}`}
              onChange={(event) =>
                onStatusChange(
                  item,
                  event.target.value as TvLibrarySectionStatus
                )
              }
              value={item.status}
            >
              <option value={WatchStatus.Watching}>Watching</option>
              <option value={WatchStatus.Planned}>Planned to Watch</option>
              <option value={WatchStatus.Completed}>Finished</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        <Text fontSize="xs">
          {item.watchedEpisodeCount} / {item.totalEpisodeCount} episodes watched
        </Text>
        <Button
          disabled={mutation?.pending}
          minHeight="44px"
          onClick={() => onRemove(item)}
          size="xs"
          variant="outline"
        >
          Remove from library
        </Button>
        {mutation?.message ? (
          <Text
            color={mutation.tone === 'error' ? 'red.500' : 'green.600'}
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
    mediaType={MediaType.Tv}
    name={item.title}
    prefetch={false}
    progress={item.progressPercent}
    status={statusLabels[item.status]}
  />
);

const TvLibrarySection = ({
  description,
  items,
  mutations,
  onRemove,
  onStatusChange,
  title,
}: {
  description: string;
  items: Array<TvLibraryItem>;
  mutations: Record<number, TvMutationState>;
  onRemove: (item: TvLibraryItem) => void;
  onStatusChange: (item: TvLibraryItem, status: TvLibrarySectionStatus) => void;
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
          <TvLibraryCard
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
        action={<DiscoverTvShowsButton />}
        message={`No ${title.toLowerCase()} TV shows yet. Discover a TV show to add to your library.`}
      />
    )}
  </Stack>
);

export const TvShowsPage = ({
  initialItems,
}: {
  initialItems: Array<TvLibraryItem>;
}) => {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [mutations, setMutations] = useState<Record<number, TvMutationState>>(
    {}
  );
  const [pageMessage, setPageMessage] = useState<TvMutationState>();

  const setMutation = (tmdbId: number, mutation: TvMutationState) =>
    setMutations((current) => ({ ...current, [tmdbId]: mutation }));

  const handleStatusChange = async (
    item: TvLibraryItem,
    nextStatus: TvLibrarySectionStatus
  ) => {
    if (item.status === nextStatus) {
      return;
    }

    const previousItem = item;
    const optimisticProjection = getOptimisticTvLibraryProjection(
      item,
      nextStatus
    );
    setPageMessage(undefined);
    setMutation(item.tmdbId, { pending: true });
    setItems((current) =>
      updateTvLibraryItemFromProjection(
        current,
        item.tmdbId,
        nextStatus,
        optimisticProjection
      )
    );

    const result = await updateTvLibraryStatus({
      status: nextStatus,
      tmdbId: item.tmdbId,
    }).catch(() => ({
      message: 'We could not save that TV show status. Please try again.',
      progressPercent: 0,
      status: 'error' as const,
      totalEpisodeCount: 0,
      watchedEpisodeCount: 0,
      watchStatus: null,
    }));

    if (result.status === 'error' || !result.watchStatus) {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.tmdbId === previousItem.tmdbId
            ? previousItem
            : currentItem
        )
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
      updateTvLibraryItemFromProjection(current, item.tmdbId, nextStatus, {
        progressPercent: result.progressPercent,
        status: confirmedStatus,
        totalEpisodeCount: result.totalEpisodeCount,
        watchedEpisodeCount: result.watchedEpisodeCount,
      })
    );
    setMutation(item.tmdbId, {
      message: result.message,
      pending: false,
      tone: 'success',
    });
    router.refresh();
  };

  const handleRemove = async (item: TvLibraryItem) => {
    setPageMessage({
      message: `Removing ${item.title} from your library...`,
      pending: true,
    });
    setMutation(item.tmdbId, { pending: true });
    setItems((current) => removeTvLibraryItem(current, item.tmdbId));

    const result = await removeTvShowFromLibrary({
      tmdbId: item.tmdbId,
    }).catch(() => ({
      message: 'We could not remove that TV show. Please try again.',
      status: 'error' as const,
    }));

    if (result.status === 'error') {
      setItems((current) => restoreTvLibraryItem(current, item));
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

  const groupedItems = groupTvLibraryItems(items);

  return (
    <PageShell>
      <PageHeading
        subtitle="Track every TV show from the first episode to the finish."
        title="TV Shows"
      />
      {pageMessage?.message ? (
        <Text
          color={pageMessage.tone === 'error' ? 'red.500' : 'green.600'}
          fontSize="sm"
          role={pageMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {pageMessage.message}
        </Text>
      ) : null}
      <TvLibrarySection
        description="TV shows with at least one watched episode that are not fully completed."
        items={groupedItems[WatchStatus.Watching]}
        mutations={mutations}
        onRemove={handleRemove}
        onStatusChange={handleStatusChange}
        title="Watching"
      />
      <TvLibrarySection
        description="TV shows you want to watch."
        items={groupedItems[WatchStatus.Planned]}
        mutations={mutations}
        onRemove={handleRemove}
        onStatusChange={handleStatusChange}
        title="Planned to Watch"
      />
      <TvLibrarySection
        description="TV shows for which you have watched all available episodes."
        items={groupedItems[WatchStatus.Completed]}
        mutations={mutations}
        onRemove={handleRemove}
        onStatusChange={handleStatusChange}
        title="Finished"
      />
      <Stack as="section" gap={4}>
        <SectionHeading
          description="Find another TV show to add to your library."
          title="Discover TV Shows"
        />
        <DiscoverTvShowsButton />
      </Stack>
    </PageShell>
  );
};
