'use client';

import { Button, Grid, Stack, Text } from '@chakra-ui/react';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import { groupTvLibraryItems } from 'lib/features/library/tv-library-state';
import type {
  TvLibraryItem,
  TvLibrarySectionStatus,
} from 'lib/features/library/types';
import { MediaType, WatchStatus } from 'lib/types';
import Link from 'next/link';

type TvSectionKey = 'completed' | 'planned' | 'watching';

const discoverTvShowsHref = '/explore?type=tv';

const statusLabels: Record<TvLibrarySectionStatus, string> = {
  [WatchStatus.Completed]: 'Finished',
  [WatchStatus.Planned]: 'Planned to Watch',
  [WatchStatus.Watching]: 'Watching',
};
const emptyMessages: Record<TvSectionKey, string> = {
  completed:
    'No finished TV shows yet. Discover TV shows to start tracking them.',
  planned:
    'No TV shows planned to watch yet. Discover TV shows to build your watchlist.',
  watching: 'No TV shows in progress yet. Discover TV shows to start watching.',
};

const DiscoverTvShowsButton = ({ label = 'Discover TV Shows' }) => (
  <Button asChild size="sm">
    <Link href={discoverTvShowsHref}>{label}</Link>
  </Button>
);

const TvLibraryCard = ({ item }: { item: TvLibraryItem }) => (
  <PosterCard
    actions={
      <Text fontSize="xs">
        {item.watchedEpisodeCount} / {item.totalEpisodeCount} episodes watched
      </Text>
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
      <PageHeading title="TV Shows" />
      <Stack alignItems="center" as="section" gap={4} textAlign="center">
        <Text color="fg">Find new TV Shows to binge</Text>
        <DiscoverTvShowsButton />
      </Stack>
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
    </PageShell>
  );
};
