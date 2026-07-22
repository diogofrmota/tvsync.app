import { Button, Grid, Heading, List, Stack, Text } from '@chakra-ui/react';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import {
  SectionHeading,
  SectionLoading,
  StatePanel,
} from 'lib/components/shared/Section';
import type { MediaOverviewItem } from 'lib/pages/media/overview';
import type { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

export type HomeDiscoverySection = {
  items: Array<MediaOverviewItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: Route;
  title: string;
};

const benefits = [
  'Track what you are watching',
  'Build your watchlist',
  'Discover new TV shows and movies',
  'Check what is popular',
  'View your personal statistics',
];

const Hero = () => (
  <Stack align="flex-start" gap={5} maxWidth="48rem">
    <Stack gap={3}>
      <Heading as="h1" fontSize={{ base: '4xl', md: '6xl' }} fontWeight="700">
        TvSync
      </Heading>
      <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="600">
        Track your TV shows and movies in one place.
      </Text>
      <Text _dark={{ color: 'gray.100' }} color="gray.600">
        TvSync focuses on a clean design and essential features, without
        unnecessary distractions.
      </Text>
      <Text>Join a community of TV show and movie lovers.</Text>
    </Stack>
    <List.Root gap={2} paddingLeft={5}>
      {benefits.map((benefit) => (
        <List.Item key={benefit}>{benefit}</List.Item>
      ))}
    </List.Root>
    <Button asChild size="lg">
      <Link href="/register">Create an Account</Link>
    </Button>
  </Stack>
);

const DiscoverySection = ({ section }: { section: HomeDiscoverySection }) => (
  <Stack as="section" gap={5}>
    <SectionHeading seeAllHref={section.seeAllHref} title={section.title} />
    {section.items.length > 0 ? (
      <Grid
        columnGap={{ base: 3, md: 4 }}
        rowGap={{ base: 7, md: 8 }}
        templateColumns={{
          base: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(6, minmax(0, 1fr))',
          xl: 'repeat(9, minmax(0, 1fr))',
        }}
      >
        {section.items.slice(0, 9).map((item) => (
          <PosterCard
            id={item.id}
            imageUrl={item.posterPath}
            key={`${section.mediaType}-${item.id}`}
            layout="grid"
            mediaType={section.mediaType}
            name={item.title}
            prefetch={false}
          />
        ))}
      </Grid>
    ) : (
      <StatePanel
        message="This section is unavailable right now. Please try again shortly."
        title={`Unable to load ${section.title}`}
        tone="error"
      />
    )}
  </Stack>
);

export const Home = ({
  discoverySections,
  discoveryError,
}: {
  discoverySections: Array<HomeDiscoverySection>;
  discoveryError?: string;
}) => (
  <PageShell>
    <Hero />
    {discoveryError ? (
      <StatePanel
        message="Movie and TV recommendations could not be loaded. Please try again shortly."
        title="Discovery is temporarily unavailable"
        tone="error"
      />
    ) : null}
    {discoverySections.map((section) => (
      <DiscoverySection key={section.title} section={section} />
    ))}
  </PageShell>
);

export const HomeLoading = () => (
  <PageShell>
    <Stack gap={4}>
      <SectionLoading count={3} />
    </Stack>
    <SectionLoading />
    <SectionLoading />
  </PageShell>
);
