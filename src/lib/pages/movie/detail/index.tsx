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
import { MovieDetailLibraryControl } from 'lib/features/library/movie-detail-library-control';
import { FavoriteButton } from 'lib/features/profile/favorite-button';
import { RatingInput } from 'lib/features/reviews';
import CastsWrapper from 'lib/pages/movie/detail/components/casts-wrapper';
import { GenreList } from 'lib/pages/movie/detail/components/genre-list';
import { MovieTrailer } from 'lib/pages/movie/detail/components/trailer';
import type { ImdbRating } from 'lib/services/omdb/types';
import type { MovieCreditsResponse } from 'lib/services/tmdb/movie/credits/types';
import type { MovieDetailResponse } from 'lib/services/tmdb/movie/detail/types';
import type { MovieVideo } from 'lib/services/tmdb/movie/videos/types';
import { MediaType } from 'lib/types';
import Link from 'next/link';

export type MovieDetailPageProps = {
  creditsData: MovieCreditsResponse;
  detailData: MovieDetailResponse;
  imdbRating: ImdbRating | null;
  isAuthenticated: boolean;
  trailer: MovieVideo | null;
};

const getReleaseYear = (releaseDate: string) => {
  const year = releaseDate
    ? new Date(releaseDate).getUTCFullYear()
    : Number.NaN;

  return Number.isFinite(year) ? String(year) : 'Unavailable';
};

export const MovieDetailPage = ({
  detailData: movie,
  creditsData: credits,
  imdbRating,
  isAuthenticated,
  trailer,
}: MovieDetailPageProps) => {
  const directors = credits.crew
    .filter((member) => member.job === 'Director')
    .map((member) => member.name)
    .filter(Boolean);
  const title = movie.title || movie.original_title || 'Untitled movie';

  return (
    <PageShell>
      <Stack gap={{ base: 8, md: 10 }} paddingX={{ base: 4, md: 0 }}>
        {/* The header stays compact — a small poster beside the title and the
            facts — so adding the movie to the library is the first thing on
            screen instead of a full-height poster. */}
        <Grid
          alignItems="start"
          gap={{ base: 4, md: 8 }}
          templateColumns={{
            base: '7.5rem minmax(0, 1fr)',
            md: '13rem minmax(0, 1fr)',
          }}
        >
          <AspectRatio ratio={2 / 3} width="full">
            <PosterImage alt={`${title} poster`} src={movie.poster_path} />
          </AspectRatio>

          <Stack gap={3}>
            <Heading as="h1" fontSize={{ base: 'xl', md: '3xl' }}>
              {title}
            </Heading>
            <Flex gap={2} wrap="wrap">
              <Badge variant="outline">
                Release year: {getReleaseYear(movie.release_date)}
              </Badge>
              <Badge variant="outline">
                Runtime:{' '}
                {movie.runtime && movie.runtime > 0
                  ? `${movie.runtime} min`
                  : 'Unavailable'}
              </Badge>
              <Badge variant="outline">
                Status: {movie.status || 'Unavailable'}
              </Badge>
            </Flex>

            {movie.genres.length > 0 ? (
              <GenreList data={movie} />
            ) : (
              <Text color="fg.muted">Genres unavailable</Text>
            )}

            <Text color={directors.length > 0 ? undefined : 'fg.muted'}>
              Director:{' '}
              {directors.length > 0 ? directors.join(', ') : 'Unavailable'}
            </Text>

            <ImdbRatingPanel
              imdbId={movie.imdb_id ?? null}
              rating={imdbRating}
            />
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
            Your movie
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
                <MovieDetailLibraryControl tmdbId={movie.id} />
                <Stack gap={2}>
                  <FavoriteButton
                    mediaType={MediaType.Movie}
                    tmdbId={movie.id}
                  />
                </Stack>
              </Stack>
              <RatingInput
                showAverage={false}
                showReview
                target={{ mediaType: MediaType.Movie, tmdbId: movie.id }}
              />
            </Grid>
          ) : (
            <Stack alignItems="flex-start" gap={3}>
              <Text>
                Log in or register to add this movie to your library, choose its
                status, mark it as a favourite, or rate it.
              </Text>
              <Flex gap={3} wrap="wrap">
                <Button asChild>
                  <Link href={`/login?callbackUrl=/movie/${movie.id}`}>
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

        <Box as="section">
          <Heading fontSize="xl" marginBottom={2}>
            Description
          </Heading>
          <Text color={movie.overview ? undefined : 'fg.muted'}>
            {movie.overview || 'No description is available from TMDB.'}
          </Text>
        </Box>

        <MovieTrailer trailer={trailer} />

        <CastsWrapper credits={credits} />
      </Stack>
    </PageShell>
  );
};
