import { Box, Button, Flex, Heading, Stack } from '@chakra-ui/react';
import type { Route } from 'next';
import Link from 'next/link';

// TMDB movie genre ids are stable; discovery chips default to movies and land
// on the search/browse view where the media-type tabs let users switch to TV.
const genreChips = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 10_749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
] as const;

const genreHref = (genreId: number): Route =>
  `/explore?type=movie&genre=${genreId}&page=1` as Route;

export const GenreChips = () => (
  <Stack as="section" gap={4}>
    <Heading as="h2" fontSize={{ base: 'lg', md: 'xl' }} fontWeight="600">
      Browse by genre
    </Heading>
    <Box marginX={{ base: -4, sm: -6, lg: -8 }} overflowX="auto">
      <Flex
        gap={2}
        paddingBottom={1}
        paddingX={{ base: 4, sm: 6, lg: 8 }}
        wrap="nowrap"
      >
        {genreChips.map((genre) => (
          <Button
            asChild
            borderRadius="full"
            flexShrink={0}
            key={genre.id}
            size="sm"
            variant="outline"
          >
            <Link href={genreHref(genre.id)}>{genre.name}</Link>
          </Button>
        ))}
      </Flex>
    </Box>
  </Stack>
);
