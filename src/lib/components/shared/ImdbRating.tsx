import { Box, HStack, Text } from '@chakra-ui/react';
import type { ImdbRating } from 'lib/services/omdb/types';

/**
 * IMDb rating block shared by the movie and TV show detail pages. The value is
 * always the genuine IMDb score loaded from OMDb; TMDB vote data is never
 * displayed here, so an unavailable rating stays honestly unavailable.
 */
export const ImdbRatingPanel = ({
  imdbId,
  rating,
}: {
  imdbId: string | null;
  rating: ImdbRating | null;
}) => (
  <Box>
    <Text fontWeight="600">IMDb rating</Text>
    {rating ? (
      <HStack gap={2}>
        <Text fontSize="xl" fontWeight="700">
          {rating.rating.toFixed(1)}
        </Text>
        <Text color="fg.muted">/ 10</Text>
        {rating.voteCount ? (
          <Text color="fg.muted" fontSize="sm">
            {rating.voteCount.toLocaleString('en-US')} votes
          </Text>
        ) : null}
      </HStack>
    ) : (
      <Text color="fg.muted">
        Unavailable — no IMDb rating could be loaded for this title.
      </Text>
    )}
    {imdbId ? (
      <Text asChild fontSize="sm" marginTop={1}>
        <a
          href={`https://www.imdb.com/title/${imdbId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          View this title on IMDb
        </a>
      </Text>
    ) : null}
  </Box>
);
