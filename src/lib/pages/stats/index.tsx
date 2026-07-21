import {
  Badge,
  Box,
  Grid,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import type { UserStatsData } from 'lib/features/stats';

type StatsPageProps = {
  data: UserStatsData;
};

const StatTile = ({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) => (
  <Box borderColor="border" borderRadius="md" borderWidth="1px" padding={5}>
    <Text color="fg.muted" fontSize="sm">
      {label}
    </Text>
    <Text fontSize="2xl" fontWeight="bold">
      {value}
    </Text>
  </Box>
);

export const StatsPage = ({ data }: StatsPageProps) => {
  const hasStats =
    data.totalEpisodesWatched > 0 ||
    data.totalMoviesWatched > 0 ||
    data.currentWatchingCount > 0;

  return (
    <Grid gap={8} marginX="auto" maxWidth="64rem" paddingX={8}>
      <Stack gap={2}>
        <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="500">
          Statistics
        </Heading>
        <Text color="white">
          A lightweight snapshot of your watch history from TVSync tracking.
        </Text>
      </Stack>

      {hasStats ? null : (
        <Box
          borderColor="border"
          borderRadius="md"
          borderStyle="dashed"
          borderWidth="1px"
          padding={6}
        >
          <Text color="fg.muted">
            Start tracking watched movies or episodes to build your statistics.
          </Text>
        </Box>
      )}

      <SimpleGrid columns={[1, 2, 4]} gap={4}>
        <StatTile label="Episodes watched" value={data.totalEpisodesWatched} />
        <StatTile label="Movies watched" value={data.totalMoviesWatched} />
        <StatTile label="Hours watched" value={data.totalHoursWatched} />
        <StatTile label="Completion rate" value={`${data.completionRate}%`} />
        <StatTile
          label="Shows completed this year"
          value={data.showsCompletedThisYear}
        />
        <StatTile
          label="Movies watched this month"
          value={data.moviesWatchedThisMonth}
        />
        <StatTile
          label="Currently watching"
          value={data.currentWatchingCount}
        />
        <StatTile
          label="Most watched actor"
          value={data.mostWatchedActor ?? 'Not enough data'}
        />
      </SimpleGrid>

      <SimpleGrid columns={[1, 2]} gap={6}>
        <Box
          borderColor="border"
          borderRadius="md"
          borderWidth="1px"
          padding={5}
        >
          <Heading as="h2" fontSize="md" marginBottom={3}>
            Favorite genres
          </Heading>
          {data.favoriteGenres.length > 0 ? (
            <HStack flexWrap="wrap" gap={2}>
              {data.favoriteGenres.map((genre) => (
                <Badge key={genre.name} textTransform="none" variant="surface">
                  {genre.name} ({genre.count})
                </Badge>
              ))}
            </HStack>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              Genres appear after tracked titles are hydrated from TMDB.
            </Text>
          )}
        </Box>
        <Box
          borderColor="border"
          borderRadius="md"
          borderWidth="1px"
          padding={5}
        >
          <Heading as="h2" fontSize="md" marginBottom={3}>
            People
          </Heading>
          <Stack gap={2}>
            <Text color="fg.muted" fontSize="sm">
              Most watched actor:{' '}
              <Text as="span" color="fg" fontWeight="semibold">
                {data.mostWatchedActor ?? 'Not enough data'}
              </Text>
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Most watched director or creator:{' '}
              <Text as="span" color="fg" fontWeight="semibold">
                {data.mostWatchedDirector ?? 'Not enough data'}
              </Text>
            </Text>
          </Stack>
        </Box>
      </SimpleGrid>
    </Grid>
  );
};
