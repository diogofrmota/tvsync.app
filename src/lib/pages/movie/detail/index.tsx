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
import { MediaCrewSection } from 'lib/components/shared/MediaCrewSection';
import { MediaRatingPanel } from 'lib/components/shared/MediaRating';
import { MediaReviews } from 'lib/components/shared/MediaReviews';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterImage from 'lib/components/shared/PosterImage';
import { MediaDetailActions } from 'lib/features/library/media-detail-actions';
import { RatingInput } from 'lib/features/reviews';
import CastsWrapper from 'lib/pages/movie/detail/components/casts-wrapper';
import { GenreList } from 'lib/pages/movie/detail/components/genre-list';
import { MovieTrailer } from 'lib/pages/movie/detail/components/trailer';
import type { ImdbRating } from 'lib/services/omdb/types';
import type { MovieCreditsResponse } from 'lib/services/tmdb/movie/credits/types';
import type { MovieDetailResponse } from 'lib/services/tmdb/movie/detail/types';
import type { MovieVideo } from 'lib/services/tmdb/movie/videos/types';
import type { MediaReview } from 'lib/services/tmdb/reviews';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

export type MovieDetailPageProps = {
  creditsData: MovieCreditsResponse;
  detailData: MovieDetailResponse;
  imdbRating: ImdbRating | null;
  isAuthenticated: boolean;
  reviews: Array<MediaReview>;
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
  reviews,
  trailer,
}: MovieDetailPageProps) => {
  // TMDB credits a director once per unit of work, so the same person can come
  // back more than once on a co-directed or re-cut release.
  const directors = Array.from(
    new Map(
      credits.crew
        .filter((member) => member.job === 'Director' && member.name.trim())
        .map((member) => [
          member.id,
          {
            id: member.id,
            name: member.name,
            profilePath: member.profile_path,
            role: 'Director',
          },
        ])
    ).values()
  );
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

            {/* The score sits directly under the title, on its own line, so it
                reads as part of the heading rather than as one more fact. */}
            <MediaRatingPanel
              imdbRating={imdbRating}
              voteAverage={movie.vote_average}
              voteCount={movie.vote_count}
            />

            <Flex gap={2} wrap="wrap">
              <Badge variant="outline">
                Release year: {getReleaseYear(movie.release_date)}
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
          </Stack>
        </Grid>

        {/* One row of actions, no panel around it: adding the movie is a single
            button, and a saved movie carries the heart, the finished toggle,
            and the X that removes it again. */}
        {isAuthenticated ? (
          <Box as="section">
            <MediaDetailActions
              addLabel="Add Movie"
              mediaType={MediaType.Movie}
              tmdbId={movie.id}
            />
          </Box>
        ) : (
          <Stack alignItems="flex-start" as="section" gap={3}>
            <Text>
              Log in or register to add this movie to your library, mark it as a
              favourite or rate it.
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

        {isAuthenticated ? (
          <Box as="section">
            <Heading fontSize="xl" marginBottom={3}>
              Rating
            </Heading>
            <RatingInput
              showAverage={false}
              showReview
              target={{ mediaType: MediaType.Movie, tmdbId: movie.id }}
            />
          </Box>
        ) : null}

        <Box as="section">
          <Heading fontSize="xl" marginBottom={2}>
            Description
          </Heading>
          <Text color={movie.overview ? undefined : 'fg.muted'}>
            {movie.overview || 'No description is available from TMDB.'}
          </Text>
        </Box>

        <MovieTrailer trailer={trailer} />

        {/* The director leads the people on the page, in the cast's own
            format, so the credits read top-down from the one name that used to
            be a stray line in the header. */}
        <MediaCrewSection
          emptyMessage="No director information is available from TMDB."
          people={directors}
          title="Director"
        />

        <CastsWrapper credits={credits} />

        <MediaReviews
          reviews={reviews}
          seeAllHref={`/movie/${movie.id}/reviews` as Route}
        />
      </Stack>
    </PageShell>
  );
};
