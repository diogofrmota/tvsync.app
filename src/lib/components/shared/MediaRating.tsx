import { Badge, Flex, Icon, Text } from '@chakra-ui/react';
import type { ImdbRating } from 'lib/services/omdb/types';
import type { MediaCertification } from 'lib/services/tmdb/certification';
import { FiStar } from 'react-icons/fi';

/**
 * The rating block shared by the movie and TV show detail pages.
 *
 * TMDB does not publish IMDb scores, and OMDb (which does) is optional, so the
 * always-available TMDB member score leads and is labelled as such — it is
 * never presented as an IMDb value. The age certificate comes from
 * `/tv/{id}/content_ratings` and `/movie/{id}/release_dates`. A genuine IMDb
 * score is added only when OMDb actually returns one.
 */
export const MediaRatingPanel = ({
  certification,
  imdbId,
  imdbRating,
  voteAverage,
  voteCount,
}: {
  certification: MediaCertification | null;
  imdbId: string | null;
  imdbRating: ImdbRating | null;
  voteAverage: number;
  voteCount: number;
}) => {
  const hasTmdbScore = voteCount > 0 && voteAverage > 0;

  return (
    <Flex align="center" gap={3} wrap="wrap">
      {hasTmdbScore ? (
        <Flex align="center" gap={2}>
          <Icon aria-hidden as={FiStar} color="gold.400" fill="currentColor" />
          <Text fontSize="lg" fontWeight="700">
            {voteAverage.toFixed(1)}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            / 10 · TMDB
          </Text>
          <Text color="fg.muted" fontSize="sm">
            ({voteCount.toLocaleString('en-US')} votes)
          </Text>
        </Flex>
      ) : (
        <Text color="fg.muted" fontSize="sm">
          No TMDB score yet
        </Text>
      )}

      {certification ? (
        <Badge
          aria-label={`Content rating ${certification.certification} (${certification.region})`}
          variant="outline"
        >
          {certification.certification} · {certification.region}
        </Badge>
      ) : null}

      {imdbRating ? (
        <Text color="fg.muted" fontSize="sm">
          IMDb {imdbRating.rating.toFixed(1)} / 10
        </Text>
      ) : null}

      {imdbId ? (
        <Text asChild color="fg.muted" fontSize="sm">
          <a
            href={`https://www.imdb.com/title/${imdbId}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            View on IMDb
          </a>
        </Text>
      ) : null}
    </Flex>
  );
};
