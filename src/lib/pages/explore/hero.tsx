'use client';

import {
  Badge,
  Box,
  Button,
  chakra,
  Flex,
  Heading,
  HStack,
  IconButton,
  Text,
} from '@chakra-ui/react';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlay, FiStar } from 'react-icons/fi';

const BACKDROP_IMAGE_URL = 'https://image.tmdb.org/t/p/w1280';

/** The featured area is a slideshow, so the loader shapes this many titles. */
export const EXPLORE_HERO_SLIDE_COUNT = 10;
const AUTO_ADVANCE_MS = 5000;

export type ExploreHeroItem = {
  backdropPath: string;
  id: number;
  mediaType: MediaType.Movie | MediaType.Tv;
  overview: string;
  title: string;
  voteAverage: number;
  year: string;
};

const heroMinHeight = { base: '22rem', md: '28rem' } as const;

const detailHref = (item: ExploreHeroItem): Route =>
  (item.mediaType === MediaType.Movie
    ? `/movie/${item.id}`
    : `/tv/show/${item.id}`) as Route;

const HeroSlide = ({
  isActive,
  item,
}: {
  isActive: boolean;
  item: ExploreHeroItem;
}) => {
  const mediaLabel = item.mediaType === MediaType.Movie ? 'Movie' : 'TV Show';

  return (
    <Box
      aria-hidden={isActive ? undefined : true}
      aria-label={item.title}
      aria-roledescription="slide"
      flex="0 0 100%"
      minWidth="100%"
      pointerEvents={isActive ? undefined : 'none'}
      position="relative"
      role="group"
    >
      <Box
        backgroundImage={`url(${BACKDROP_IMAGE_URL}${item.backdropPath})`}
        backgroundPosition="center 20%"
        backgroundSize="cover"
        inset={0}
        position="absolute"
      />
      <Box
        background="linear-gradient(to top, rgba(9,9,11,0.94) 6%, rgba(9,9,11,0.7) 42%, rgba(9,9,11,0.25) 100%)"
        inset={0}
        position="absolute"
      />
      <Flex
        direction="column"
        gap={4}
        justify="flex-end"
        minHeight={heroMinHeight}
        padding={{ base: 5, md: 8 }}
        paddingBottom={{ base: 12, md: 8 }}
        position="relative"
      >
        <HStack color="gray.100" gap={3} wrap="wrap">
          <Badge
            background="gold.400"
            color="gray.900"
            fontWeight="700"
            textTransform="uppercase"
          >
            {mediaLabel}
          </Badge>
          {item.voteAverage > 0 ? (
            <HStack color="gold.300" gap={1}>
              <FiStar aria-hidden fill="currentColor" />
              <Text color="gray.100" fontSize="sm" fontWeight="600">
                {item.voteAverage.toFixed(1)}
              </Text>
            </HStack>
          ) : null}
          {item.year ? (
            <Text color="gray.300" fontSize="sm">
              {item.year}
            </Text>
          ) : null}
        </HStack>

        <Heading
          as="h2"
          color="white"
          fontSize={{ base: '3xl', md: '5xl' }}
          fontWeight="700"
          lineHeight="1.05"
          maxWidth="40rem"
        >
          {item.title}
        </Heading>

        {item.overview ? (
          <Text
            color="gray.200"
            fontSize={{ base: 'sm', md: 'md' }}
            lineClamp={3}
            maxWidth="38rem"
          >
            {item.overview}
          </Text>
        ) : null}

        <Button
          alignSelf="flex-start"
          asChild
          background="white"
          color="gray.900"
          fontWeight="700"
          size={{ base: 'md', md: 'lg' }}
          tabIndex={isActive ? undefined : -1}
        >
          <Link href={detailHref(item)}>
            <FiPlay aria-hidden fill="currentColor" />
            View details
          </Link>
        </Button>
      </Flex>
    </Box>
  );
};

const HeroControl = ({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <IconButton
    _hover={{ background: 'rgba(9,9,11,0.85)' }}
    aria-label={label}
    background="rgba(9,9,11,0.6)"
    borderColor="whiteAlpha.400"
    borderWidth="1px"
    color="white"
    onClick={onClick}
    rounded="full"
    size="sm"
    variant="outline"
  >
    {children}
  </IconButton>
);

/**
 * Featured titles rotate every five seconds and can also be moved by hand with
 * the arrows or the slide dots. Manual navigation restarts the timer so a
 * chosen slide is never cut short.
 */
export const ExploreHero = ({ items }: { items: Array<ExploreHeroItem> }) => {
  const slides = items.slice(0, EXPLORE_HERO_SLIDE_COUNT);
  const slideCount = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(((index % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIndex restarts the countdown so a hand-picked slide gets its full five seconds.
  useEffect(() => {
    if (slideCount < 2) {
      return;
    }

    const timer = setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [activeIndex, slideCount]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <Box
      aria-label="Featured movies and TV shows"
      aria-roledescription="carousel"
      as="section"
      borderColor="border"
      borderRadius="2xl"
      borderWidth="1px"
      minHeight={heroMinHeight}
      overflow="hidden"
      position="relative"
    >
      <Flex
        transform={`translateX(-${activeIndex * 100}%)`}
        transitionDuration="slower"
        transitionProperty="transform"
        transitionTimingFunction="ease-out"
      >
        {slides.map((item, index) => (
          <HeroSlide
            isActive={index === activeIndex}
            item={item}
            key={`${item.mediaType}-${item.id}`}
          />
        ))}
      </Flex>

      {slideCount > 1 ? (
        <Flex
          align="center"
          bottom={{ base: 3, md: 5 }}
          gap={2}
          justify="flex-end"
          paddingX={{ base: 5, md: 8 }}
          position="absolute"
          right={0}
          width="full"
        >
          <Flex gap={1.5} marginRight={2}>
            {slides.map((item, index) => (
              <chakra.button
                aria-current={index === activeIndex}
                aria-label={`Show featured title ${index + 1}: ${item.title}`}
                background={
                  index === activeIndex ? 'gold.400' : 'whiteAlpha.500'
                }
                borderRadius="full"
                height="0.5rem"
                key={`dot-${item.mediaType}-${item.id}`}
                onClick={() => goTo(index)}
                transitionDuration="fast"
                transitionProperty="background, width"
                transitionTimingFunction="ease-out"
                type="button"
                width={index === activeIndex ? '1.5rem' : '0.5rem'}
              />
            ))}
          </Flex>
          <HeroControl
            label="Previous featured title"
            onClick={() => goTo(activeIndex - 1)}
          >
            <FiChevronLeft aria-hidden />
          </HeroControl>
          <HeroControl
            label="Next featured title"
            onClick={() => goTo(activeIndex + 1)}
          >
            <FiChevronRight aria-hidden />
          </HeroControl>
        </Flex>
      ) : null}
    </Box>
  );
};
