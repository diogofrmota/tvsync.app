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
import { ImdbRatingPanel } from 'lib/components/shared/ImdbRating';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterImage from 'lib/components/shared/PosterImage';
import { TvDetailLibraryControl } from 'lib/features/library/tv-detail-library-control';
import { FavoriteButton } from 'lib/features/profile/favorite-button';
import { RatingInput } from 'lib/features/reviews';
import { TvProgressSummary } from 'lib/features/tracking';
import { TvCastsWrapper } from 'lib/pages/tv/detail/components/casts-wrapper';
import { SeasonsList } from 'lib/pages/tv/detail/components/seasons-list';
import { TvTrailer } from 'lib/pages/tv/detail/components/trailer';
import type { ImdbRating } from 'lib/services/omdb/types';
import type { TVCreditsResponse } from 'lib/services/tmdb/tv/credits/types';
import type { TvShowDetail } from 'lib/services/tmdb/tv/detail/types';
import type { TvVideo } from 'lib/services/tmdb/tv/videos/types';
import { MediaType } from 'lib/types';
import Link from 'next/link';

export type TvShowDetailPageProps = {
  creditsData: TVCreditsResponse;
  data: TvShowDetail;
  imdbId: string | null;
  imdbRating: ImdbRating | null;
  isAuthenticated: boolean;
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
  imdbRating,
  isAuthenticated,
  trailer,
}: TvShowDetailPageProps) => {
  const title = show.name || show.original_name || 'Untitled TV show';

  return (
    <PageShell>
      <Stack gap={{ base: 8, md: 10 }} paddingX={{ base: 4, md: 0 }}>
        {/* The header stays compact — a small poster beside the title, the
            facts, and the personal controls — so the seasons and their
            episodes are reachable without scrolling the page. */}
        <Grid
          alignItems="start"
          gap={{ base: 4, md: 8 }}
          templateColumns={{
            base: '7.5rem minmax(0, 1fr)',
            md: '13rem minmax(0, 1fr)',
          }}
        >
          <AspectRatio ratio={2 / 3} width="full">
            <PosterImage alt={`${title} poster`} src={show.poster_path} />
          </AspectRatio>

          <Stack gap={3}>
            <Heading as="h1" fontSize={{ base: 'xl', md: '3xl' }}>
              {title}
            </Heading>
            <Flex gap={2} wrap="wrap">
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

            <ImdbRatingPanel imdbId={imdbId} rating={imdbRating} />
          </Stack>
        </Grid>

        <Box
          as="section"
          borderColor="border"
          borderRadius="md"
          borderWidth="1px"
          padding={{ base: 4, md: 5 }}
        >
          <Heading fontSize="lg" marginBottom={3}>
            Your TV show
          </Heading>
          {isAuthenticated ? (
            <Grid
              alignItems="start"
              gap={{ base: 4, md: 6 }}
              templateColumns={{
                base: 'minmax(0, 1fr)',
                md: 'repeat(2, minmax(0, 1fr))',
              }}
            >
              <Stack gap={4}>
                <TvDetailLibraryControl tmdbId={show.id} />
                <Stack gap={2}>
                  <FavoriteButton mediaType={MediaType.Tv} tmdbId={show.id} />
                </Stack>
              </Stack>
              <Stack gap={4}>
                <TvProgressSummary tmdbShowId={show.id} />
                <RatingInput
                  showAverage={false}
                  showReview
                  target={{ mediaType: MediaType.Tv, tmdbId: show.id }}
                />
              </Stack>
            </Grid>
          ) : (
            <Stack alignItems="flex-start" gap={3}>
              <Text>
                Log in or register to add this TV show to your library, choose
                its status, track episode progress, mark it as a favourite, or
                rate it.
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

        <SeasonsList seasons={show.seasons} showId={show.id} />

        <Box as="section">
          <Heading fontSize="xl" marginBottom={2}>
            Description
          </Heading>
          <Text color={show.overview ? undefined : 'fg.muted'}>
            {show.overview || 'No description is available from TMDB.'}
          </Text>
        </Box>

        <TvTrailer trailer={trailer} />

        <TvCastsWrapper credits={credits} />
      </Stack>
    </PageShell>
  );
};

export default TvShowDetailPage;
