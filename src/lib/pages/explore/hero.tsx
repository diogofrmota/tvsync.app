'use client';

import {
  AspectRatio,
  Badge,
  Box,
  Button,
  chakra,
  Flex,
  Heading,
  HStack,
  IconButton,
  Stack,
  Text,
} from '@chakra-ui/react';
import PosterImage from 'lib/components/shared/PosterImage';
import { IMAGE_URL_ORIGINAL } from 'lib/components/shared/tmdb-image-urls';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlay } from 'react-icons/fi';

/** The featured area is a slideshow, so the loader shapes this many titles. */
export const EXPLORE_HERO_SLIDE_COUNT = 10;
const AUTO_ADVANCE_MS = 5000;

export type ExploreHeroSlide = {
  backdropPath: string | null;
  id: number;
  /** IMDb title id, present whenever the title can be opened on IMDb. */
  imdbId: string | null;
  /** Genuine IMDb score out of 10, or null when OMDb has none for the title. */
  imdbRating: number | null;
  mediaType: MediaType.Movie | MediaType.Tv;
  overview: string;
  posterPath: string | null;
  title: string;
  trailerUrl: string | null;
  voteAverage: number;
  year: string;
};

const heroMinHeight = { base: '26rem', md: '24rem' } as const;

const detailHref = (slide: ExploreHeroSlide): Route =>
  (slide.mediaType === MediaType.Movie
    ? `/movie/${slide.id}`
    : `/tv/show/${slide.id}`) as Route;

/**
 * The star always sits next to the genuine IMDb score when OMDb has one. TMDB's
 * own score is the labeled fallback, never relabeled as IMDb.
 */
const SlideRating = ({ slide }: { slide: ExploreHeroSlide }) => {
  const isImdb = slide.imdbRating !== null;
  const value = isImdb ? slide.imdbRating : slide.voteAverage;

  if (value === null || value <= 0) {
    return null;
  }

  const source = isImdb ? 'IMDb' : 'TMDB';
  const rating = (
    <HStack
      aria-label={`${source} rating ${value.toFixed(1)} out of 10`}
      gap={1.5}
    >
      <Text aria-hidden fontSize="lg">
        ⭐
      </Text>
      <Text color="white" fontSize="lg" fontWeight="700">
        {value.toFixed(1)}
      </Text>
      <Text color="gray.300" fontSize="sm">
        {`${source} rating`}
      </Text>
    </HStack>
  );

  return isImdb && slide.imdbId ? (
    <Box
      _hover={{ color: 'gold.300' }}
      asChild
      transitionDuration="fast"
      transitionProperty="color"
      transitionTimingFunction="ease-out"
      width="fit-content"
    >
      <a
        href={`https://www.imdb.com/title/${slide.imdbId}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {rating}
      </a>
    </Box>
  ) : (
    rating
  );
};

const HeroSlide = ({
  isActive,
  slide,
}: {
  isActive: boolean;
  slide: ExploreHeroSlide;
}) => {
  const mediaLabel = slide.mediaType === MediaType.Movie ? 'Movie' : 'TV Show';
  const inactiveTabIndex = isActive ? undefined : -1;

  return (
    <Box
      aria-hidden={isActive ? undefined : true}
      aria-label={slide.title}
      aria-roledescription="slide"
      flex="0 0 100%"
      minWidth="100%"
      position="relative"
      role="group"
    >
      {slide.backdropPath ? (
        <Box
          backgroundImage={`url(${IMAGE_URL_ORIGINAL}${slide.backdropPath})`}
          backgroundPosition="center 20%"
          backgroundSize="cover"
          inset={0}
          position="absolute"
        />
      ) : null}
      <Box
        background="linear-gradient(to top, rgba(9,9,11,0.96) 10%, rgba(9,9,11,0.82) 55%, rgba(9,9,11,0.55) 100%)"
        inset={0}
        position="absolute"
      />

      <Flex
        align={{ base: 'flex-start', sm: 'center' }}
        gap={{ base: 4, md: 7 }}
        minHeight={heroMinHeight}
        padding={{ base: 5, md: 8 }}
        paddingBottom={{ base: 14, md: 8 }}
        position="relative"
      >
        <AspectRatio
          flexShrink={0}
          ratio={2 / 3}
          width={{ base: '6.5rem', sm: '9rem', md: '11rem' }}
        >
          <PosterImage
            alt={`${slide.title} poster`}
            src={slide.posterPath}
            tabIndex={inactiveTabIndex}
          />
        </AspectRatio>

        <Stack gap={{ base: 3, md: 4 }} minWidth={0}>
          <HStack color="gray.100" gap={3} wrap="wrap">
            <Badge
              background="gold.400"
              color="gray.900"
              fontWeight="700"
              textTransform="uppercase"
            >
              {mediaLabel}
            </Badge>
            {slide.year ? (
              <Text color="gray.300" fontSize="sm">
                {slide.year}
              </Text>
            ) : null}
          </HStack>

          <Heading
            as="h2"
            color="white"
            fontSize={{ base: '2xl', md: '4xl' }}
            fontWeight="700"
            lineHeight="1.1"
            maxWidth="40rem"
          >
            {slide.title}
          </Heading>

          <SlideRating slide={slide} />

          {slide.overview ? (
            <Text
              color="gray.200"
              display={{ base: 'none', sm: 'block' }}
              fontSize={{ base: 'sm', md: 'md' }}
              lineClamp={3}
              maxWidth="38rem"
            >
              {slide.overview}
            </Text>
          ) : null}

          <Flex gap={3} wrap="wrap">
            <Button
              asChild
              background="white"
              color="gray.900"
              fontWeight="700"
              size={{ base: 'sm', md: 'md' }}
            >
              <Link href={detailHref(slide)} tabIndex={inactiveTabIndex}>
                View details
              </Link>
            </Button>
            {slide.trailerUrl ? (
              <Button
                asChild
                borderColor="whiteAlpha.500"
                color="white"
                fontWeight="700"
                size={{ base: 'sm', md: 'md' }}
                variant="outline"
              >
                <a
                  href={slide.trailerUrl}
                  rel="noopener noreferrer"
                  tabIndex={inactiveTabIndex}
                  target="_blank"
                >
                  <FiPlay aria-hidden fill="currentColor" />
                  Watch trailer
                </a>
              </Button>
            ) : null}
          </Flex>
        </Stack>
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
export const ExploreHero = ({
  slides: allSlides,
}: {
  slides: Array<ExploreHeroSlide>;
}) => {
  const slides = allSlides.slice(0, EXPLORE_HERO_SLIDE_COUNT);
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
        {slides.map((slide, index) => (
          <HeroSlide
            isActive={index === activeIndex}
            key={`${slide.mediaType}-${slide.id}`}
            slide={slide}
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
            {slides.map((slide, index) => (
              <chakra.button
                aria-current={index === activeIndex}
                aria-label={`Show featured title ${index + 1}: ${slide.title}`}
                background={
                  index === activeIndex ? 'gold.400' : 'whiteAlpha.500'
                }
                borderRadius="full"
                height="0.5rem"
                key={`dot-${slide.mediaType}-${slide.id}`}
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
