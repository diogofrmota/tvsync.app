import { Button, Flex, Grid, Heading, Stack, Text } from '@chakra-ui/react';
import { MediaSearchBar } from 'lib/pages/media/media-search-bar';
import { OverviewShelf } from 'lib/pages/media/overview-shelf';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import type { MediaType } from 'lib/types';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export type MediaOverviewItem = {
  id: number;
  posterPath: string | null;
  title: string;
};

type MediaOverviewSection = {
  items: Array<MediaOverviewItem>;
  itemLimit?: number;
  seeAllHref: ComponentProps<typeof Link>['href'];
  title: string;
};

type MediaOverviewPageProps = {
  mediaType: MediaType.Movie | MediaType.Tv;
  searchPlaceholder: string;
  sections: Array<MediaOverviewSection>;
  subtitle: string;
  title: string;
};

const contentPaddingX = { base: 4, sm: 6, lg: 8 } as const;

export const mapMovieOverviewItem = (
  movie: MovieListItemType
): MediaOverviewItem => ({
  id: movie.id,
  posterPath: movie.poster_path,
  title: movie.title,
});

export const mapTVShowOverviewItem = (show: TVShowItem): MediaOverviewItem => ({
  id: show.id,
  posterPath: show.poster_path,
  title: show.name,
});

export const uniqueMediaOverviewItems = (
  items: Array<MediaOverviewItem>
): Array<MediaOverviewItem> =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());

const SectionHeading = ({
  seeAllHref,
  title,
}: {
  seeAllHref: ComponentProps<typeof Link>['href'];
  title: string;
}) => (
  <Flex align="center" gap={4} justify="space-between">
    <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="500">
      {title}
    </Heading>
    <Button
      asChild
      background="white"
      borderRadius="999px"
      color="black"
      fontWeight="700"
      paddingX={4}
      size="sm"
    >
      <Link href={seeAllHref}>See All</Link>
    </Button>
  </Flex>
);

const MediaSection = ({
  mediaType,
  section,
}: {
  mediaType: MediaType.Movie | MediaType.Tv;
  section: MediaOverviewSection;
}) => {
  const items = section.items.slice(0, section.itemLimit ?? 21);

  return (
    <Stack gap={5}>
      <SectionHeading seeAllHref={section.seeAllHref} title={section.title} />
      <OverviewShelf
        items={items}
        mediaType={mediaType}
        seeAllHref={section.seeAllHref}
      />
    </Stack>
  );
};

export const MediaOverviewPage = ({
  mediaType,
  searchPlaceholder,
  sections,
  subtitle,
  title,
}: MediaOverviewPageProps) => (
  <Grid
    gap={{ base: 9, md: 11 }}
    marginBottom={8}
    paddingBottom={{ base: 8, md: 12 }}
    paddingX={contentPaddingX}
    width="full"
  >
    <Grid
      alignItems="end"
      gap={{ base: 5, md: 8 }}
      templateColumns={{
        base: '1fr',
        md: 'minmax(0, 1fr) minmax(20rem, 36rem)',
      }}
    >
      <Stack gap={2} maxWidth="40rem">
        <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="500">
          {title}
        </Heading>
        <Text color="white">{subtitle}</Text>
      </Stack>
      <MediaSearchBar mediaType={mediaType} placeholder={searchPlaceholder} />
    </Grid>

    {sections.map((section) => (
      <MediaSection
        key={section.title}
        mediaType={mediaType}
        section={section}
      />
    ))}
  </Grid>
);
