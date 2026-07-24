'use client';

import { Button, Grid, Stack, Text } from '@chakra-ui/react';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import { groupMovieLibraryItems } from 'lib/features/library/movie-library-state';
import type { MovieLibraryItem } from 'lib/features/library/types';
import { MediaType, type MovieWatchStatus, WatchStatus } from 'lib/types';
import Link from 'next/link';

type MovieSectionKey = 'finished' | 'planned';

const discoverMoviesHref = '/explore?type=movie';
const statusLabels: Record<MovieWatchStatus, string> = {
  [WatchStatus.Planned]: 'Planned to Watch',
  [WatchStatus.Watched]: 'Finished',
};
const emptyMessages: Record<MovieSectionKey, string> = {
  finished: 'No finished movies yet.',
  planned: 'Discover new movies to add to your watchlist.',
};

const DiscoverMoviesButton = () => (
  <Button asChild size="sm">
    <Link href={discoverMoviesHref}>Discover Movies</Link>
  </Button>
);

const MovieLibraryCard = ({ item }: { item: MovieLibraryItem }) => (
  <PosterCard
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
  items,
  sectionKey,
  title,
}: {
  items: Array<MovieLibraryItem>;
  sectionKey: MovieSectionKey;
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
          <MovieLibraryCard item={item} key={item.id} />
        ))}
      </Grid>
    ) : (
      <StatePanel message={emptyMessages[sectionKey]} />
    )}
  </Stack>
);

export const MoviesPage = ({
  initialItems,
}: {
  initialItems: Array<MovieLibraryItem>;
}) => {
  const { finished: finishedItems, planned: plannedItems } =
    groupMovieLibraryItems(initialItems);

  return (
    <PageShell>
      <PageHeading title="Movies" />
      <MovieLibrarySection
        items={plannedItems}
        sectionKey="planned"
        title="Planned to Watch"
      />
      <MovieLibrarySection
        items={finishedItems}
        sectionKey="finished"
        title="Finished"
      />
      <Stack alignItems="center" as="section" gap={4} textAlign="center">
        <Text color="fg">Add new movies to your library</Text>
        <DiscoverMoviesButton />
      </Stack>
    </PageShell>
  );
};
