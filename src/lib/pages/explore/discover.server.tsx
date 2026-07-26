import 'server-only';

import { Stack } from '@chakra-ui/react';
import { MediaRail } from 'lib/components/shared/MediaRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import { ExploreHero } from 'lib/pages/explore/hero';
import { buildExploreHeroSlides } from 'lib/pages/explore/hero-slides.server';
import {
  loadDiscoveryRails,
  loadTrendingDiscoveryResults,
} from 'lib/pages/media/discovery-rails.server';
import { MediaSearchBar } from 'lib/pages/media/media-search-bar';
import { MediaType } from 'lib/types';

export const ExploreDiscover = async () => {
  // Explore and Home resolve their lists from the same shared rails, so the
  // sections both pages carry show identical titles under identical names.
  const [rails, trending] = await Promise.all([
    loadDiscoveryRails('explore'),
    loadTrendingDiscoveryResults(),
  ]);

  const heroSlides = await buildExploreHeroSlides(
    trending.movies,
    trending.shows
  ).catch((error) => {
    console.error('Failed to build the featured slideshow:', error);
    return [];
  });
  const populatedRails = rails.filter((rail) => rail.items.length > 0);

  return (
    <PageShell>
      <Stack gap={{ base: 6, md: 8 }}>
        <PageHeading
          actions={
            <MediaSearchBar
              mediaType={MediaType.Movie}
              placeholder="Search movies and TV shows"
            />
          }
          subtitle="Discover trending titles, new releases and all-time highlights across movies and TV Shows."
          title="Explore"
        />
        {heroSlides.length > 0 ? <ExploreHero slides={heroSlides} /> : null}
      </Stack>
      {populatedRails.length > 0 ? (
        populatedRails.map((rail) => (
          <MediaRail
            itemLimit={rail.itemLimit}
            items={rail.items}
            key={rail.key}
            mediaType={rail.mediaType}
            seeAllHref={rail.seeAllHref}
            title={rail.title}
          />
        ))
      ) : (
        <StatePanel
          message="Discovery is unavailable right now. Please try again shortly."
          title="Unable to load titles"
          tone="error"
        />
      )}
    </PageShell>
  );
};
