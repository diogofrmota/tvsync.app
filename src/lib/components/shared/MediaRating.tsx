import { Box, Flex, Text } from '@chakra-ui/react';
import type { ImdbRating } from 'lib/services/omdb/types';
import { FiStar } from 'react-icons/fi';

/**
 * The rating shown directly under a movie or TV show title: one star and one
 * score, with nothing else beside it — no vote count, no source label, no age
 * certificate, and no outbound rating link.
 *
 * The displayed number is the genuine IMDb score whenever OMDb returns one and
 * the TMDB member score otherwise. Because the panel prints no label, the
 * accessible name still names the source, so a TMDB score is never announced
 * as an IMDb one.
 */
export const MediaRatingPanel = ({
  imdbRating,
  voteAverage,
  voteCount,
}: {
  imdbRating: ImdbRating | null;
  voteAverage: number;
  voteCount: number;
}) => {
  const hasTmdbScore = voteCount > 0 && voteAverage > 0;
  const score = imdbRating?.rating ?? (hasTmdbScore ? voteAverage : null);
  const source = imdbRating ? 'IMDb' : 'TMDB';

  if (score === null) {
    return (
      <Text color="fg.muted" fontSize="sm">
        No rating yet
      </Text>
    );
  }

  return (
    <Flex
      align="center"
      aria-label={`${source} rating ${score.toFixed(1)} out of 10`}
      gap={2}
    >
      {/* The icon is a child of a styled span rather than Chakra's icon
          wrapper: this panel renders inside Server Components, and a component
          handed to a Chakra client component as a prop cannot be serialized
          across that boundary. */}
      <Box aria-hidden as="span" color="gold.400" display="inline-flex">
        <FiStar fill="currentColor" />
      </Box>
      <Text fontSize="lg" fontWeight="700">
        {score.toFixed(1)}
      </Text>
    </Flex>
  );
};
