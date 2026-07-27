'use client';

import { Button, Grid, Stack, Text } from '@chakra-ui/react';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import { groupTvLibraryItems } from 'lib/features/library/tv-library-state';
import type { TvLibraryItem } from 'lib/features/library/types';
import { MediaType, WatchStatus } from 'lib/types';
import Link from 'next/link';

type TvSectionKey = 'completed' | 'planned' | 'watching';

const discoverTvShowsHref = '/explore?type=tv';

const emptyMessages: Record<TvSectionKey, string> = {
  completed: 'No finished TV shows yet.',
  planned: 'Discover TV shows to add to your watchlist.',
  watching: 'No TV shows in progress.',
};

const DiscoverTvShowsButton = ({ label = 'Discover TV Shows' }) => (
  <Button asChild size="sm">
    <Link href={discoverTvShowsHref}>{label}</Link>
  </Button>
);

/**
 * A started show always shows a visible sliver of bar, even when its rounded
 * percentage is still zero on a very long series.
 */
const MINIMUM_VISIBLE_PROGRESS = 2;

const getPosterProgress = (item: TvLibraryItem) => {
  if (item.status === WatchStatus.Completed) {
    return 100;
  }

  if (item.watchedEpisodeCount === 0) {
    return 0;
  }

  return Math.max(item.progressPercent, MINIMUM_VISIBLE_PROGRESS);
};

/**
 * The library already groups shows by status, so the poster carries progress
 * on its own: the bar fills while the show is in progress and turns green
 * across the full width once every available episode is watched.
 */
const TvLibraryCard = ({ item }: { item: TvLibraryItem }) => (
  <PosterCard
    id={item.tmdbId}
    imageUrl={item.posterPath}
    layout="grid"
    libraryBadges={false}
    mediaType={MediaType.Tv}
    name={item.title}
    prefetch={false}
    progress={getPosterProgress(item)}
  />
);

const TvLibrarySection = ({
  items,
  sectionKey,
  title,
}: {
  items: Array<TvLibraryItem>;
  sectionKey: TvSectionKey;
  title: string;
}) => (
  <Stack as="section" gap={5}>
    <SectionHeading title={title} />
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
          <TvLibraryCard item={item} key={item.id} />
        ))}
      </Grid>
    ) : (
      <StatePanel message={emptyMessages[sectionKey]} />
    )}
  </Stack>
);

export const TvShowsPage = ({
  initialItems,
}: {
  initialItems: Array<TvLibraryItem>;
}) => {
  const groupedItems = groupTvLibraryItems(initialItems);

  return (
    <PageShell>
      <TvLibrarySection
        items={groupedItems[WatchStatus.Watching]}
        sectionKey="watching"
        title="Watching"
      />
      <TvLibrarySection
        items={groupedItems[WatchStatus.Planned]}
        sectionKey="planned"
        title="Planned to Watch"
      />
      <TvLibrarySection
        items={groupedItems[WatchStatus.Completed]}
        sectionKey="completed"
        title="Finished"
      />
      <Stack alignItems="center" as="section" gap={4} textAlign="center">
        <Text color="fg">Find new TV Shows to binge</Text>
        <DiscoverTvShowsButton />
      </Stack>
    </PageShell>
  );
};
