'use client';

import {
  AspectRatio,
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  Text,
} from '@chakra-ui/react';
import PosterImage from 'lib/components/shared/PosterImage';
import { SeasonProgressControls } from 'lib/features/tracking';
import type { Season } from 'lib/services/tmdb/tv/detail/types';
import type { Route } from 'next';
import Link from 'next/link';

type SeasonsListProps = {
  seasons: Array<Season>;
  showId: number;
};

const formatEpisodeCount = (count: number) =>
  count === 1 ? '1 episode' : `${count} episodes`;

const getSeasonYear = (airDate: string) => {
  const year = airDate ? new Date(airDate).getUTCFullYear() : Number.NaN;

  return Number.isFinite(year) ? String(year) : 'Release year unavailable';
};

export const SeasonsList = ({ seasons, showId }: SeasonsListProps) => {
  const visibleSeasons = seasons
    .filter((season) => season.season_number > 0)
    .toSorted((left, right) => left.season_number - right.season_number);
  const specialsSeason = seasons.find((season) => season.season_number === 0);

  return (
    <Grid as="section" gap={4}>
      <Heading fontSize={{ base: 'xl', md: '2xl' }}>Seasons</Heading>

      {visibleSeasons.length > 0 ? (
        <Grid gap={4} templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}>
          {visibleSeasons.map((season) => (
            <Box
              borderColor="whiteAlpha.300"
              borderRadius={8}
              borderWidth="1px"
              key={`${season.id}-${season.season_number}`}
              overflow="hidden"
              padding={3}
            >
              <Link
                href={
                  `/tv/show/${showId}/season/${season.season_number}` as Route
                }
                prefetch={false}
              >
                <Grid gap={4} templateColumns="72px minmax(0, 1fr)">
                  <AspectRatio ratio={3.6 / 5} width="72px">
                    <PosterImage
                      alt={`${season.name || `Season ${season.season_number}`} poster`}
                      borderRadius={8}
                      src={season.poster_path}
                      width="72px"
                    />
                  </AspectRatio>

                  <Grid alignContent="start" gap={2}>
                    <Flex alignItems="center" gap={2} wrap="wrap">
                      <Heading fontSize="md">{season.name}</Heading>
                      <Badge variant="outline">
                        Season {season.season_number}
                      </Badge>
                    </Flex>

                    <Text color="gray.400" fontSize="sm">
                      {getSeasonYear(season.air_date)} ·{' '}
                      {season.episode_count > 0
                        ? formatEpisodeCount(season.episode_count)
                        : 'Episode count unavailable'}
                    </Text>

                    {season.overview ? (
                      <Text fontSize="sm" lineClamp={3}>
                        {season.overview}
                      </Text>
                    ) : (
                      <Text color="gray.400" fontSize="sm">
                        No overview is available for this season.
                      </Text>
                    )}
                  </Grid>
                </Grid>
              </Link>

              {season.episode_count > 0 ? (
                <Box marginTop={3}>
                  <SeasonProgressControls
                    episodeCount={season.episode_count}
                    seasonNumber={season.season_number}
                    tmdbShowId={showId}
                  />
                </Box>
              ) : null}
            </Box>
          ))}
        </Grid>
      ) : (
        <Text color="gray.400">
          TMDB does not have season information for this show yet.
        </Text>
      )}

      {specialsSeason ? (
        <Text color="fg.muted" fontSize="sm">
          Specials are tracked on their own season page and are not counted
          toward overall show progress.
        </Text>
      ) : null}
    </Grid>
  );
};
