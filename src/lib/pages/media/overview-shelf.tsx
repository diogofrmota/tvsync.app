'use client';

import { AspectRatio, Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import MotionBox from 'lib/components/MotionBox';
import PosterCard from 'lib/components/shared/PosterCard';
import type { MediaType } from 'lib/types';
import Link from 'next/link';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

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

const firstPageCardCount = 7;
const pagedCardCount = 6;
const finalStepIndex = 2;

const ActionTileFrame = ({ children }: { children: ReactNode }) => (
  <Stack gap={2} minWidth={0} textAlign="center">
    <AspectRatio borderRadius="md" overflow="hidden" ratio={3.6 / 5}>
      {children}
    </AspectRatio>
    <Text
      color="gray.100"
      fontSize={{ base: 'xs', md: 'sm' }}
      fontWeight="500"
      lineClamp={2}
      minHeight={{ base: '2rem', md: '2.5rem' }}
    >
      &nbsp;
    </Text>
  </Stack>
);

const ActionButtonTile = ({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
}) => (
  <ActionTileFrame>
    <Box
      _hover={{ background: 'gray.100', borderColor: 'white' }}
      alignItems="center"
      aria-label={ariaLabel}
      as="button"
      background="white"
      borderColor="white"
      borderWidth={1}
      color="black"
      cursor="pointer"
      display="flex"
      fontSize={{ base: '6xl', md: '7xl' }}
      justifyContent="center"
      lineHeight={1}
      onClick={onClick}
    >
      {children}
    </Box>
  </ActionTileFrame>
);

const PreviousTile = ({ onClick }: { onClick: () => void }) => (
  <ActionButtonTile ariaLabel="Show previous titles" onClick={onClick}>
    <FiChevronLeft aria-hidden />
  </ActionButtonTile>
);

const NextTile = ({ onClick }: { onClick: () => void }) => (
  <ActionButtonTile ariaLabel="Show more titles" onClick={onClick}>
    <FiChevronRight aria-hidden />
  </ActionButtonTile>
);

const BrowseAllTile = ({
  href,
}: {
  href: ComponentProps<typeof Link>['href'];
}) => (
  <ActionTileFrame>
    <Box
      _hover={{ background: 'gray.100', borderColor: 'white' }}
      alignItems="center"
      asChild
      background="white"
      borderColor="white"
      borderWidth={1}
      color="black"
      display="flex"
      justifyContent="center"
      textAlign="center"
    >
      <Link aria-label="Browse all titles" href={href}>
        <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700">
          Browse All
        </Text>
      </Link>
    </Box>
  </ActionTileFrame>
);

const getVisibleRange = (pageIndex: number) => {
  if (pageIndex === 0) {
    return { count: firstPageCardCount, start: 0 };
  }

  return {
    count: pagedCardCount,
    start: firstPageCardCount + (pageIndex - 1) * pagedCardCount,
  };
};

export const OverviewShelf = ({
  items,
  mediaType,
  seeAllHref,
}: OverviewShelfProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageDirection, setPageDirection] = useState<1 | -1>(1);
  const prefersReducedMotion = useReducedMotion();
  const slideDistance = prefersReducedMotion ? 0 : 56;
  const visibleRange = getVisibleRange(pageIndex);
  const visibleItems = items.slice(
    visibleRange.start,
    visibleRange.start + visibleRange.count
  );
  const nextRange = getVisibleRange(pageIndex + 1);
  const hasNextPage =
    pageIndex < finalStepIndex && items.length > nextRange.start;
  const showNextTile = hasNextPage && pageIndex < finalStepIndex;
  const showPreviousTile = pageIndex > 0;

  const showNextPage = () => {
    setPageDirection(1);
    setPageIndex((current) => Math.min(current + 1, finalStepIndex));
  };

  const showPreviousPage = () => {
    setPageDirection(-1);
    setPageIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <AnimatePresence initial={false} mode="wait">
      <MotionBox
        animate={{
          opacity: 1,
          transition: { duration: prefersReducedMotion ? 0.15 : 0.3 },
          x: 0,
        }}
        exit={{ opacity: 0, x: -slideDistance * pageDirection }}
        initial={{ opacity: 0, x: slideDistance * pageDirection }}
        key={pageIndex}
      >
        <SimpleGrid
          columnGap={{ base: 4, md: 5, xl: 6 }}
          columns={{ base: 3, md: 6, xl: 9 }}
          rowGap={{ base: 7, md: 8 }}
        >
          {showPreviousTile ? (
            <PreviousTile onClick={showPreviousPage} />
          ) : null}
          {visibleItems.map((item) => (
            <PosterCard
              id={item.id}
              imageUrl={item.posterPath}
              key={`${mediaType}-${item.id}`}
              layout="grid"
              mediaType={mediaType}
              name={item.title}
              prefetch={false}
            />
          ))}
          {showNextTile ? (
            <NextTile onClick={showNextPage} />
          ) : (
            <BrowseAllTile href={seeAllHref} />
          )}
        </SimpleGrid>
      </MotionBox>
    </AnimatePresence>
  );
};
