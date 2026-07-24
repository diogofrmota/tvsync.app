import { Grid, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react';
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
import Hero from 'lib/pages/home/Hero';

export type { HomeDiscoverySection } from 'lib/pages/home/config';

const heroFeatureKeys = ['feature-a', 'feature-b', 'feature-c', 'feature-d'];

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
    <Stack gap={{ base: 10, md: 14 }}>
      <Stack
        align="center"
        gap={6}
        marginX="auto"
        maxWidth="46rem"
        width="full"
      >
        <Skeleton borderRadius="full" height="2rem" width="16rem" />
        <Stack align="center" gap={3} width="full">
          <Skeleton
            height={{ base: '2.5rem', md: '3.75rem' }}
            width="min(38rem, 100%)"
          />
          <Skeleton
            height={{ base: '2.5rem', md: '3.75rem' }}
            width="min(30rem, 80%)"
          />
        </Stack>
        <Skeleton height="1.5rem" width="min(32rem, 90%)" />
        <Stack
          direction={{ base: 'column', sm: 'row' }}
          gap={3}
          width={{ base: 'full', sm: 'auto' }}
        >
          <Skeleton
            borderRadius="full"
            height="3rem"
            width={{ base: 'full', sm: '12rem' }}
          />
          <Skeleton
            borderRadius="full"
            height="3rem"
            width={{ base: 'full', sm: '8rem' }}
          />
        </Stack>
      </Stack>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={{ base: 3, md: 4 }}>
        {heroFeatureKeys.map((key) => (
          <Skeleton borderRadius="xl" height="10rem" key={key} />
        ))}
      </SimpleGrid>
    </Stack>
    {HOME_SECTION_TITLES.map((title) => (
      <Stack gap={5} key={title}>
        <SectionHeading title={title} />
        <SectionLoading count={HOME_PREVIEW_ITEM_COUNT} />
      </Stack>
    ))}
  </PageShell>
);
