import { AspectRatio, Box, Flex, Stack, Text } from '@chakra-ui/react';
import PosterCard from 'lib/components/shared/PosterCard';
import type { MediaType } from 'lib/types';
import Link from 'next/link';
import type { ComponentProps } from 'react';

type MediaOverviewItem = {
  id: number;
  posterPath: string | null;
  title: string;
};

type OverviewShelfProps = {
  items: Array<MediaOverviewItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: ComponentProps<typeof Link>['href'];
};

const maxShelfItems = 15;

const BrowseAllTile = ({
  href,
}: {
  href: ComponentProps<typeof Link>['href'];
}) => (
  <Stack
    flex="0 0 auto"
    gap={2}
    minWidth={0}
    textAlign="center"
    width={{ base: '7rem', sm: '8rem', md: '9rem' }}
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
        <Link aria-label="Browse all titles" href={href}>
          <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700">
            Browse All
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

export const OverviewShelf = ({
  items,
  mediaType,
  seeAllHref,
}: OverviewShelfProps) => {
  const visibleItems = items.slice(0, maxShelfItems);

  return (
    <Flex
      css={{ scrollbarWidth: 'thin' }}
      overflowX="auto"
      paddingBottom={2}
      scrollSnapType="x proximity"
    >
      <Flex alignItems="flex-start" flexWrap="nowrap" gap={{ base: 4, md: 5 }}>
        {visibleItems.map((item) => (
          <Box key={`${mediaType}-${item.id}`} scrollSnapAlign="start">
            <PosterCard
              id={item.id}
              imageUrl={item.posterPath}
              layout="flex"
              mediaType={mediaType}
              name={item.title}
              prefetch={false}
            />
          </Box>
        ))}
        <BrowseAllTile href={seeAllHref} />
      </Flex>
    </Flex>
  );
};
