import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import PosterImage from 'lib/components/shared/PosterImage';
import SliderContainer from 'lib/components/shared/SliderContainer';
import { TvDetailLibraryControl } from 'lib/features/library/tv-detail-library-control';
import { FavoriteButton } from 'lib/features/profile/favorite-button';
import { RatingInput } from 'lib/features/reviews';
import { TvProgressSummary } from 'lib/features/tracking';
import { TvCastsWrapper } from 'lib/pages/tv/detail/components/casts-wrapper';
import { SeasonsList } from 'lib/pages/tv/detail/components/seasons-list';
import { TvStreamingAvailability } from 'lib/pages/tv/detail/components/streaming-availability';
import { TvTrailer } from 'lib/pages/tv/detail/components/trailer';
import type { TVCreditsResponse } from 'lib/services/tmdb/tv/credits/types';
import type { TvShowDetail } from 'lib/services/tmdb/tv/detail/types';
import type { TVShowListResponse } from 'lib/services/tmdb/tv/list/types';
import type { TvWatchProviderRegion } from 'lib/services/tmdb/tv/providers/types';
import type { TvVideo } from 'lib/services/tmdb/tv/videos/types';
import { MediaType } from 'lib/types';
import Link from 'next/link';

export type TvShowDetailPageProps = {
  creditsData: TVCreditsResponse;
  data: TvShowDetail;
  imdbId: string | null;
  isAuthenticated: boolean;
  similarData: TVShowListResponse;
  streamingProviders: TvWatchProviderRegion | null;
  streamingRegion: string;
  trailer: TvVideo | null;
};

const getReleaseYear = (date: string) => {
  const year = date ? new Date(date).getUTCFullYear() : Number.NaN;

  return Number.isFinite(year) ? String(year) : 'Unavailable';
};

const TvShowDetailPage = ({
  creditsData: credits,
  data: show,
  imdbId,
  isAuthenticated,
  similarData,
  streamingProviders,
  streamingRegion,
  trailer,
}: TvShowDetailPageProps) => {
  const similarShows = similarData.results
    .filter((similarShow) => similarShow.id > 0)
    .slice(0, 12);
  const title = show.name || show.original_name || 'Untitled TV show';

  return (
    <PageShell>
      <Stack gap={{ base: 10, md: 14 }} paddingX={{ base: 4, md: 0 }}>
        <Grid
          alignItems="start"
          gap={{ base: 8, md: 12 }}
          templateColumns={{
            base: 'minmax(0, 1fr)',
            md: '18rem minmax(0, 1fr)',
          }}
        >
          <AspectRatio
            justifySelf={{ base: 'center', md: 'stretch' }}
            maxWidth={{ base: '18rem', md: 'none' }}
            ratio={2 / 3}
            width="full"
          >
            <PosterImage alt={`${title} poster`} src={show.poster_path} />
          </AspectRatio>

          <Stack gap={5}>
            <Box>
              <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }}>
                {title}
              </Heading>
              <Flex gap={2} marginTop={3} wrap="wrap">
                <Badge variant="outline">
                  Release year: {getReleaseYear(show.first_air_date)}
                </Badge>
                <Badge variant="outline">
                  Seasons:{' '}
                  {show.number_of_seasons > 0
                    ? show.number_of_seasons
                    : 'Unavailable'}
                </Badge>
                <Badge variant="outline">
                  Episodes:{' '}
                  {show.number_of_episodes > 0
                    ? show.number_of_episodes
                    : 'Unavailable'}
                </Badge>
                <Badge variant="outline">
                  Status: {show.status || 'Unavailable'}
                </Badge>
              </Flex>
            </Box>

            {show.genres.length > 0 ? (
              <Flex gap={2} wrap="wrap">
                {show.genres.map((genre) => (
                  <Badge key={genre.id} variant="subtle">
                    {genre.name}
                  </Badge>
                ))}
              </Flex>
            ) : (
              <Text color="fg.muted">Genres unavailable</Text>
            )}

            <Box>
              <Text fontWeight="600">IMDb rating</Text>
              <Text color="fg.muted">
                Unavailable — TMDB provides the IMDb title identifier, but not a
                genuine IMDb rating value.
              </Text>
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

            <Box>
              <Heading fontSize="xl" marginBottom={2}>
                Description
              </Heading>
              <Text color={show.overview ? undefined : 'fg.muted'}>
                {show.overview || 'No description is available from TMDB.'}
              </Text>
            </Box>

            <Box as="section">
              <Heading fontSize="xl" marginBottom={3}>
                Your TV show
              </Heading>
              {isAuthenticated ? (
                <Grid gap={5}>
                  <TvDetailLibraryControl tmdbId={show.id} />
                  <TvProgressSummary tmdbShowId={show.id} />
                  <FavoriteButton mediaType={MediaType.Tv} tmdbId={show.id} />
                  <RatingInput
                    showAverage={false}
                    target={{ mediaType: MediaType.Tv, tmdbId: show.id }}
                  />
                </Grid>
              ) : (
                <Stack
                  alignItems="flex-start"
                  borderWidth="1px"
                  gap={3}
                  padding={4}
                >
                  <Text>
                    Log in or register to add this TV show to your library,
                    choose its status, track episode progress, mark it as a
                    favourite, or rate it.
                  </Text>
                  <Flex gap={3} wrap="wrap">
                    <Button asChild>
                      <Link href={`/login?callbackUrl=/tv/show/${show.id}`}>
                        Login
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/register">Register</Link>
                    </Button>
                  </Flex>
                </Stack>
              )}
            </Box>
          </Stack>
        </Grid>

        <TvTrailer trailer={trailer} />

        <TvCastsWrapper credits={credits} />

        <TvStreamingAvailability
          providers={streamingProviders}
          region={streamingRegion}
        />

        <SeasonsList seasons={show.seasons} showId={show.id} />

        <Box as="section">
          {similarShows.length > 0 ? (
            <SliderContainer sectionTitle="Similar TV shows">
              {similarShows.map((similarShow, index) => (
                <PosterCard
                  id={similarShow.id}
                  imageUrl={similarShow.poster_path}
                  isLastItem={index === similarShows.length - 1}
                  key={similarShow.id}
                  layout="flex"
                  mediaType={MediaType.Tv}
                  name={similarShow.name}
                  prefetch={false}
                />
              ))}
            </SliderContainer>
          ) : (
            <Stack gap={2}>
              <Heading fontSize={{ base: 'xl', md: '2xl' }}>
                Similar TV shows
              </Heading>
              <Text color="fg.muted">
                TMDB does not list similar TV shows for this title yet.
              </Text>
            </Stack>
          )}
        </Box>
      </Stack>
    </PageShell>
  );
};

export default TvShowDetailPage;
