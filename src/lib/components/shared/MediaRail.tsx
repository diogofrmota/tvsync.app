import { Box, Flex, Skeleton, Stack } from '@chakra-ui/react';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading } from 'lib/components/shared/Section';
import type { MediaType } from 'lib/types';
import type Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Every list (signed-out Home, Explore, the Movies/TV overviews, and every
 * Profile section) previews the same number of titles in the same horizontally
 * scrollable rail, so the shelf size lives here instead of being restated per
 * page. The rail stops at this many posters; the complete list is one click
 * away behind the "See All" action next to the section title.
 */
export const MEDIA_RAIL_ITEM_LIMIT = 20;

type RailHref = ComponentProps<typeof Link>['href'];

type MediaShelfProps = {
  items: Array<MediaCardItem>;
  itemLimit?: number;
  /** Own-library rails pass `false` so saved titles stay chip-free. */
  libraryBadges?: boolean;
  mediaType: MediaType.Movie | MediaType.Tv;
};

type MediaRailProps = MediaShelfProps & {
  description?: string;
  /** Rendered instead of the shelf for empty, incomplete, or errored lists. */
  fallback?: ReactNode;
  seeAllHref: RailHref;
  title: string;
};

const railSkeletonKeys = Array.from(
  { length: MEDIA_RAIL_ITEM_LIMIT },
  (_, index) => `rail-${index}`
);

const posterWidth = { base: '7rem', sm: '8rem', md: '9rem' } as const;

const MediaShelf = ({
  items,
  itemLimit = MEDIA_RAIL_ITEM_LIMIT,
  libraryBadges,
  mediaType,
}: MediaShelfProps) => {
  const visibleItems = items.slice(0, itemLimit);

  return (
    <Flex
      css={{ scrollbarWidth: 'thin' }}
      overflowX="auto"
      paddingBottom={2}
      scrollSnapType="x proximity"
    >
      <Flex alignItems="flex-start" flexWrap="nowrap" gap={{ base: 4, md: 5 }}>
        {visibleItems.map((item) => {
          const itemMediaType = item.mediaType ?? mediaType;

          return (
            <Box key={`${itemMediaType}-${item.id}`} scrollSnapAlign="start">
              <PosterCard
                id={item.id}
                imageUrl={item.posterPath}
                layout="flex"
                libraryBadges={libraryBadges}
                mediaType={itemMediaType}
                name={item.title}
                prefetch={false}
              />
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
};

/**
 * Section heading plus the horizontally scrollable poster shelf. This is the
 * single rail used by Home and Explore so both stay visually identical.
 */
export const MediaRail = ({
  description,
  fallback,
  items,
  itemLimit,
  libraryBadges,
  mediaType,
  seeAllHref,
  title,
}: MediaRailProps) => (
  <Stack as="section" gap={5}>
    <SectionHeading
      description={description}
      seeAllHref={seeAllHref}
      title={title}
    />
    {fallback ?? (
      <MediaShelf
        itemLimit={itemLimit}
        items={items}
        libraryBadges={libraryBadges}
        mediaType={mediaType}
      />
    )}
  </Stack>
);

export const MediaRailLoading = ({
  count = MEDIA_RAIL_ITEM_LIMIT,
}: {
  count?: number;
}) => (
  <Flex
    aria-label="Loading content"
    gap={{ base: 4, md: 5 }}
    overflow="hidden"
    paddingBottom={2}
    role="status"
  >
    {railSkeletonKeys.slice(0, count).map((key) => (
      <Stack flex="0 0 auto" gap={2} key={key} width={posterWidth}>
        <Skeleton aspectRatio={2 / 3} borderRadius="md" />
        <Skeleton height={{ base: '2rem', md: '2.5rem' }} />
      </Stack>
    ))}
  </Flex>
);
