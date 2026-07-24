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
import PosterImage from 'lib/components/shared/PosterImage';
import { MovieDetailLibraryControl } from 'lib/features/library/movie-detail-library-control';
import { FavoriteButton } from 'lib/features/profile/favorite-button';
import { RatingInput } from 'lib/features/reviews';
import CastsWrapper from 'lib/pages/movie/detail/components/casts-wrapper';
import { GenreList } from 'lib/pages/movie/detail/components/genre-list';
import { MovieTrailer } from 'lib/pages/movie/detail/components/trailer';
import type { MovieCreditsResponse } from 'lib/services/tmdb/movie/credits/types';
import type { MovieDetailResponse } from 'lib/services/tmdb/movie/detail/types';
import type { MovieVideo } from 'lib/services/tmdb/movie/videos/types';
import { MediaType } from 'lib/types';
import Link from 'next/link';

export type MovieDetailPageProps = {
  creditsData: MovieCreditsResponse;
  detailData: MovieDetailResponse;
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
            <PosterImage alt={`${title} poster`} src={movie.poster_path} />
          </AspectRatio>

          <Stack gap={5}>
            <Box>
              <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }}>
                {title}
              </Heading>
              <Flex gap={2} marginTop={3} wrap="wrap">
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
            </Box>

            {movie.genres.length > 0 ? (
              <GenreList data={movie} />
            ) : (
              <Text color="fg.muted">Genres unavailable</Text>
            )}

            <Box>
              <Text fontWeight="600">IMDb rating</Text>
              <Text color="fg.muted">
                Unavailable — TMDB provides the IMDb title identifier, but not a
                genuine IMDb rating value.
              </Text>
              {movie.imdb_id ? (
                <Text asChild fontSize="sm" marginTop={1}>
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
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
              <Text color={movie.overview ? undefined : 'fg.muted'}>
                {movie.overview || 'No description is available from TMDB.'}
              </Text>
            </Box>

            <Box as="section">
              <Heading fontSize="xl" marginBottom={3}>
                Your movie
              </Heading>
              {isAuthenticated ? (
                <Grid gap={5}>
                  <MovieDetailLibraryControl tmdbId={movie.id} />
                  <FavoriteButton
                    mediaType={MediaType.Movie}
                    tmdbId={movie.id}
                  />
                  <RatingInput
                    showAverage={false}
                    showReview
                    target={{ mediaType: MediaType.Movie, tmdbId: movie.id }}
                  />
                </Grid>
              ) : (
                <Stack
                  alignItems="flex-start"
                  background="bg.surface"
                  borderColor="border"
                  borderRadius="md"
                  borderWidth="1px"
                  gap={3}
                  padding={4}
                >
                  <Text>
                    Log in or register to add this movie to your library, choose
                    its status, mark it as a favourite, or rate it.
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
          </Stack>
        </Grid>

        <MovieTrailer trailer={trailer} />

        <Box as="section">
          <Heading fontSize={{ base: 'xl', md: '2xl' }} marginBottom={3}>
            Director
          </Heading>
          <Text color={directors.length > 0 ? undefined : 'fg.muted'}>
            {directors.length > 0 ? directors.join(', ') : 'Unavailable'}
          </Text>
        </Box>

        <CastsWrapper credits={credits} />
      </Stack>
    </PageShell>
  );
};
