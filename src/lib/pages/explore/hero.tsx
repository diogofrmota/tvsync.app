import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Text,
} from '@chakra-ui/react';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import { FiPlay, FiStar } from 'react-icons/fi';

const BACKDROP_IMAGE_URL = 'https://image.tmdb.org/t/p/w1280';

export type ExploreHeroItem = {
  backdropPath: string;
  id: number;
  mediaType: MediaType.Movie | MediaType.Tv;
  overview: string;
  title: string;
  voteAverage: number;
  year: string;
};

const detailHref = (item: ExploreHeroItem): Route =>
  (item.mediaType === MediaType.Movie
    ? `/movie/${item.id}`
    : `/tv/show/${item.id}`) as Route;

export const ExploreHero = ({ item }: { item: ExploreHeroItem }) => {
  const mediaLabel = item.mediaType === MediaType.Movie ? 'Movie' : 'TV Show';

  return (
    <Box
      aria-label={`Featured: ${item.title}`}
      as="section"
      borderColor="border"
      borderRadius="2xl"
      borderWidth="1px"
      minHeight={{ base: '22rem', md: '28rem' }}
      overflow="hidden"
      position="relative"
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
        minHeight={{ base: '22rem', md: '28rem' }}
        padding={{ base: 5, md: 8 }}
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
