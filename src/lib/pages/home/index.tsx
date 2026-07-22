import {
  Box,
  Button,
  Grid,
  Heading,
  List,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import {
  SectionHeading,
  SectionLoading,
  StatePanel,
} from 'lib/components/shared/Section';
import {
  HOME_PREVIEW_ITEM_COUNT,
  HOME_SECTION_TITLES,
  type HomeDiscoverySection,
} from 'lib/pages/home/config';
import Link from 'next/link';

export type { HomeDiscoverySection } from 'lib/pages/home/config';

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

const DiscoveryContent = ({ section }: { section: HomeDiscoverySection }) => {
  if (section.error) {
    return (
      <StatePanel
        message="This section could not be loaded from TMDB. Please try again shortly."
        title={`Unable to load ${section.title}`}
        tone="error"
      />
    );
  }

  if (section.items.length === 0) {
    return (
      <StatePanel
        message="There are no titles available in this list right now."
        title={`No ${section.title.toLowerCase()} available`}
      />
    );
  }

  if (section.items.length !== HOME_PREVIEW_ITEM_COUNT) {
    return (
      <StatePanel
        message="TMDB returned an incomplete preview. Please use See All to browse the complete list."
        title={`Unable to show all ${HOME_PREVIEW_ITEM_COUNT} titles`}
        tone="error"
      />
    );
  }

  return (
    <Grid
      aria-label={`${section.title} preview`}
      columnGap={{ base: 3, md: 4 }}
      rowGap={{ base: 7, md: 8 }}
      templateColumns={{
        base: 'repeat(3, minmax(0, 1fr))',
        md: 'repeat(6, minmax(0, 1fr))',
        lg: 'repeat(9, minmax(0, 1fr))',
      }}
    >
      {section.items.map((item) => (
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
  );
};

const DiscoverySection = ({ section }: { section: HomeDiscoverySection }) => (
  <Stack as="section" gap={5}>
    <SectionHeading seeAllHref={section.seeAllHref} title={section.title} />
    <DiscoveryContent section={section} />
  </Stack>
);

export const Home = ({
  discoverySections,
}: {
  discoverySections: Array<HomeDiscoverySection>;
}) => (
  <PageShell>
    <Hero />
    {discoverySections.map((section) => (
      <DiscoverySection key={section.title} section={section} />
    ))}
  </PageShell>
);

export const HomeLoading = () => (
  <PageShell>
    <Stack gap={5} maxWidth="48rem">
      <Skeleton height={{ base: '3rem', md: '4.5rem' }} width="14rem" />
      <Skeleton height="2rem" width="min(32rem, 100%)" />
      <Stack gap={2}>
        <Skeleton height="1rem" width="min(42rem, 100%)" />
        <Skeleton height="1rem" width="min(34rem, 90%)" />
      </Stack>
      <Box paddingLeft={5}>
        <Stack gap={2}>
          {benefits.map((benefit) => (
            <Skeleton height="1rem" key={benefit} width="18rem" />
          ))}
        </Stack>
      </Box>
      <Skeleton borderRadius="md" height="3rem" width="12rem" />
    </Stack>
    {HOME_SECTION_TITLES.map((title) => (
      <Stack gap={5} key={title}>
        <SectionHeading title={title} />
        <SectionLoading count={HOME_PREVIEW_ITEM_COUNT} />
      </Stack>
    ))}
  </PageShell>
);
