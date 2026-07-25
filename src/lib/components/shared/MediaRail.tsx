import {
  AspectRatio,
  Box,
  Flex,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading } from 'lib/components/shared/Section';
import type { MediaType } from 'lib/types';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Every list (signed-out Home, Explore, the Movies/TV overviews, and every
 * Profile section) previews the same number of titles in the same horizontally
 * scrollable rail, so the shelf size lives here instead of being restated per
 * page.
 */
export const MEDIA_RAIL_ITEM_LIMIT = 10;

type RailHref = ComponentProps<typeof Link>['href'];

type MediaShelfProps = {
  items: Array<MediaCardItem>;
  itemLimit?: number;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: RailHref;
};

type MediaRailProps = MediaShelfProps & {
  description?: string;
  /** Rendered instead of the shelf for empty, incomplete, or errored lists. */
  fallback?: ReactNode;
  title: string;
};

const railSkeletonKeys = [
  'rail-a',
  'rail-b',
  'rail-c',
  'rail-d',
  'rail-e',
  'rail-f',
  'rail-g',
  'rail-h',
  'rail-i',
  'rail-j',
];

const posterWidth = { base: '7rem', sm: '8rem', md: '9rem' } as const;

const SeeAllTile = ({ href }: { href: RailHref }) => (
  <Stack
    flex="0 0 auto"
    gap={2}
    minWidth={0}
    textAlign="center"
    width={posterWidth}
  >
    <AspectRatio ratio={2 / 3}>
      <Box
        _hover={{
          background: 'gold.400',
          borderColor: 'gold.400',
          color: 'gray.900',
          transform: 'translateY(-3px)',
        }}
        alignItems="center"
        asChild
        background="bg.surface"
        borderColor="border"
        borderRadius="md"
        borderWidth={1}
        color="gold.300"
        display="flex"
        justifyContent="center"
        transitionDuration="fast"
        transitionProperty="background, border-color, color, transform"
        transitionTimingFunction="ease-out"
      >
        <Link aria-label="See all titles" href={href}>
          <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700">
            See All
          </Text>
        </Link>
      </Box>
    </AspectRatio>
    <Text
      fontSize={{ base: 'xs', md: 'sm' }}
      minHeight={{ base: '2rem', md: '2.5rem' }}
    >
      &nbsp;
    </Text>
  </Stack>
);

const MediaShelf = ({
  items,
  itemLimit = MEDIA_RAIL_ITEM_LIMIT,
  mediaType,
  seeAllHref,
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
                mediaType={itemMediaType}
                name={item.title}
                prefetch={false}
              />
            </Box>
          );
        })}
        <SeeAllTile href={seeAllHref} />
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
        mediaType={mediaType}
        seeAllHref={seeAllHref}
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
