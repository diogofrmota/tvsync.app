import { SimpleGrid, Skeleton, Stack } from '@chakra-ui/react';
import { MediaRail, MediaRailLoading } from 'lib/components/shared/MediaRail';
import { PageShell } from 'lib/components/shared/PageShell';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import {
  HOME_PREVIEW_ITEM_COUNT,
  HOME_SECTION_TITLES,
  type HomeDiscoverySection,
} from 'lib/pages/home/config';
import Hero from 'lib/pages/home/Hero';
import type { ReactNode } from 'react';

export type { HomeDiscoverySection } from 'lib/pages/home/config';

const heroFeatureKeys = ['feature-a', 'feature-b', 'feature-c', 'feature-d'];

// Returns null when the rail itself should render; anything else replaces it.
const discoveryFallback = (section: HomeDiscoverySection): ReactNode => {
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

  // A section that came back a title or two short still previews fine; the
  // complete list is one click away behind "See All". Only a failed or empty
  // section replaces the rail.
  return null;
};

const DiscoverySection = ({ section }: { section: HomeDiscoverySection }) => (
  <MediaRail
    fallback={discoveryFallback(section)}
    itemLimit={HOME_PREVIEW_ITEM_COUNT}
    items={section.items}
    mediaType={section.mediaType}
    seeAllHref={section.seeAllHref}
    title={section.title}
  />
);

export const Home = ({
  discoverySections,
}: {
  discoverySections: Array<HomeDiscoverySection>;
}) => (
  <PageShell>
    <Hero />
    {discoverySections.map((section) => (
      <DiscoverySection key={section.key} section={section} />
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
        <MediaRailLoading count={HOME_PREVIEW_ITEM_COUNT} />
      </Stack>
    ))}
  </PageShell>
);
