import 'server-only';

import { Stack } from '@chakra-ui/react';
import { CuratedListRail } from 'lib/components/shared/CuratedListRail';
import { MediaRail } from 'lib/components/shared/MediaRail';
import { PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import { ExploreHero } from 'lib/pages/explore/hero';
import { buildExploreHeroSlides } from 'lib/pages/explore/hero-slides.server';
import { loadCuratedRails } from 'lib/pages/media/curated-rails.server';
import {
  loadDiscoveryRails,
  loadTrendingDiscoveryResults,
} from 'lib/pages/media/discovery-rails.server';
import { MediaSearchBar } from 'lib/pages/media/media-search-bar';
import { MediaType } from 'lib/types';

export const ExploreDiscover = async () => {
  // Explore and Home resolve their lists from the same shared rails, so the
  // sections both pages carry show identical titles under identical names.
  const [rails, trending, curatedRails] = await Promise.all([
    loadDiscoveryRails('explore'),
    loadTrendingDiscoveryResults(),
    loadCuratedRails('explore'),
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
        <MediaSearchBar
          mediaType={MediaType.Movie}
          placeholder="Search shows, movies and users"
        />
        {heroSlides.length > 0 ? <ExploreHero slides={heroSlides} /> : null}
      </Stack>
      {/* The operator's own lists lead the rails, ahead of the algorithmic
          discovery sections. */}
      {curatedRails.map((rail) => (
        <CuratedListRail key={rail.id} rail={rail} />
      ))}
      {populatedRails.length > 0
        ? populatedRails.map((rail) => (
            <MediaRail
              itemLimit={rail.itemLimit}
              items={rail.items}
              key={rail.key}
              mediaType={rail.mediaType}
              seeAllHref={rail.seeAllHref}
              title={rail.title}
            />
          ))
        : // A curated rail still renders on its own, so the error panel is only
          // shown when the page would otherwise carry nothing at all.
          curatedRails.length === 0 && (
            <StatePanel
              message="Discovery is unavailable right now. Please try again shortly."
              title="Unable to load titles"
              tone="error"
            />
          )}
    </PageShell>
  );
};
