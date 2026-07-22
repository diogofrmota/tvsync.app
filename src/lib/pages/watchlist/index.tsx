'use client';

import { Button, Grid, Stack } from '@chakra-ui/react';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import { MediaStatusControl } from 'lib/features/tracking';
import { WatchlistButton } from 'lib/features/watchlist';
import { MediaType, type TrackableMediaType, WatchStatus } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

export type WatchlistPageItem = {
  dateAdded: string;
  id: string;
  mediaType: MediaType.Movie | MediaType.Tv;
  overview: string;
  posterPath: null | string;
  releaseDate: string;
  status: WatchStatus | null;
  title: string;
  tmdbId: number;
  voteAverage: number;
};
type WatchlistPageProps = {
  emptyDescription?: string;
  fixedMediaType?: TrackableMediaType;
  items: Array<WatchlistPageItem>;
  subtitle?: string;
  title?: string;
};
type LibrarySectionData = {
  description: string;
  items: Array<WatchlistPageItem>;
  title: string;
};

const statusLabels: Record<WatchStatus, string> = {
  [WatchStatus.Completed]: 'Finished',
  [WatchStatus.Dropped]: 'Dropped',
  [WatchStatus.Paused]: 'Paused',
  [WatchStatus.Planned]: 'Planned to Watch',
  [WatchStatus.Watched]: 'Finished',
  [WatchStatus.Watching]: 'Watching',
};

const LibraryCard = ({ item }: { item: WatchlistPageItem }) => (
  <PosterCard
    actions={
      <Stack gap={2}>
        <MediaStatusControl
          initialStatus={item.status}
          label="Library status"
          mediaType={item.mediaType}
          size="sm"
          tmdbId={item.tmdbId}
        />
        <WatchlistButton
          initialIsSaved
          mediaType={item.mediaType}
          size="xs"
          tmdbId={item.tmdbId}
        />
      </Stack>
    }
    id={item.tmdbId}
    imageUrl={item.posterPath}
    layout="grid"
    mediaType={item.mediaType}
    name={item.title}
    prefetch={false}
    status={item.status ? statusLabels[item.status] : 'Saved'}
  />
);

const LibrarySection = ({
  description,
  items,
  title,
}: {
  description: string;
  items: Array<WatchlistPageItem>;
  title: string;
}) => (
  <Stack as="section" gap={5}>
    <SectionHeading description={description} title={title} />
    {items.length ? (
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
          <LibraryCard item={item} key={item.id} />
        ))}
      </Grid>
    ) : (
      <StatePanel
        message={`No ${title.toLowerCase()} titles yet. Discover something new to add here.`}
      />
    )}
  </Stack>
);

export const WatchlistPage = ({
  emptyDescription = 'Search for movies and TV shows to build your library.',
  fixedMediaType,
  items,
  subtitle = 'Your saved titles, organized by status.',
  title = 'Library',
}: WatchlistPageProps) => {
  let sections: Array<LibrarySectionData>;
  if (fixedMediaType === MediaType.Movie) {
    sections = [
      {
        description: 'Movies you want to watch.',
        items: items.filter(
          (item) => item.status === WatchStatus.Planned || !item.status
        ),
        title: 'Planned to Watch',
      },
      {
        description: 'Movies you have completed.',
        items: items.filter(
          (item) =>
            item.status === WatchStatus.Watched ||
            item.status === WatchStatus.Completed
        ),
        title: 'Finished',
      },
    ];
  } else if (fixedMediaType === MediaType.Tv) {
    sections = [
      {
        description: 'TV shows you are currently watching.',
        items: items.filter((item) => item.status === WatchStatus.Watching),
        title: 'Watching',
      },
      {
        description: 'TV shows you want to watch.',
        items: items.filter(
          (item) => item.status === WatchStatus.Planned || !item.status
        ),
        title: 'Planned to Watch',
      },
      {
        description: 'TV shows you have completed.',
        items: items.filter((item) => item.status === WatchStatus.Completed),
        title: 'Finished',
      },
    ];
  } else {
    sections = [
      {
        description: 'Movies saved in your library.',
        items: items.filter((item) => item.mediaType === MediaType.Movie),
        title: 'Movies',
      },
      {
        description: 'TV shows saved in your library.',
        items: items.filter((item) => item.mediaType === MediaType.Tv),
        title: 'TV Shows',
      },
    ];
  }
  const discoverHref =
    `/search?type=${fixedMediaType ?? MediaType.Movie}` as Route;
  return (
    <PageShell>
      <PageHeading
        actions={
          <Button asChild>
            <Link href={discoverHref}>
              Discover {fixedMediaType === MediaType.Tv ? 'TV Shows' : 'Movies'}
            </Link>
          </Button>
        }
        subtitle={subtitle}
        title={title}
      />
      {items.length === 0 ? (
        <StatePanel
          action={
            <Button asChild size="sm">
              <Link href={discoverHref}>Discover titles</Link>
            </Button>
          }
          message={emptyDescription}
          title="Nothing saved yet"
        />
      ) : (
        sections.map((section) => (
          <LibrarySection key={section.title} {...section} />
        ))
      )}
    </PageShell>
  );
};
