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
import { TvCastsWrapper } from 'lib/pages/tv/detail/components/casts-wrapper';
import { EpisodeTracker } from 'lib/pages/tv/detail/components/episode-tracker';
import { TvTrailer } from 'lib/pages/tv/detail/components/trailer';
import type { ImdbRating } from 'lib/services/omdb/types';
import type { MediaReview } from 'lib/services/tmdb/reviews';
import type { TVCreditsResponse } from 'lib/services/tmdb/tv/credits/types';
import type { TvShowDetail } from 'lib/services/tmdb/tv/detail/types';
import type { TvVideo } from 'lib/services/tmdb/tv/videos/types';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

export type TvShowDetailPageProps = {
  creditsData: TVCreditsResponse;
  data: TvShowDetail;
  imdbRating: ImdbRating | null;
  isAuthenticated: boolean;
  reviews: Array<MediaReview>;
  trailer: TvVideo | null;
};

const getReleaseYear = (date: string) => {
  const year = date ? new Date(date).getUTCFullYear() : Number.NaN;

  return Number.isFinite(year) ? String(year) : 'Unavailable';
};

const TvShowDetailPage = ({
  creditsData: credits,
  data: show,
  imdbRating,
  isAuthenticated,
  reviews,
  trailer,
}: TvShowDetailPageProps) => {
  const title = show.name || show.original_name || 'Untitled TV show';
  // A show's credits list directors episode by episode, so the same person can
  // appear repeatedly; many shows credit no director at series level at all,
  // and for those the creators are the equivalent name to lead the credits.
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
  const hasDirectors = directors.length > 0;
  const crewTitle = hasDirectors ? 'Director' : 'Creator';
  const crew = hasDirectors
    ? directors
    : show.created_by
        .filter((creator) => creator.name.trim())
        .map((creator) => ({
          id: creator.id,
          name: creator.name,
          profilePath: creator.profile_path,
          role: 'Creator',
        }));

  return (
    <PageShell>
      <Stack gap={{ base: 8, md: 10 }} paddingX={{ base: 4, md: 0 }}>
        {/* The header stays compact — a small poster beside the title and the
            facts — so the episodes come next, without scrolling. */}
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

            {/* The score sits directly under the title, on its own line, so it
                reads as part of the heading rather than as one more fact. */}
            <MediaRatingPanel
              imdbRating={imdbRating}
              voteAverage={show.vote_average}
              voteCount={show.vote_count}
            />

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
          </Stack>
        </Grid>

        {/* The same one row of actions the movie page carries: add the show,
            then the heart, the finished toggle, and the X that removes it. */}
        {isAuthenticated ? (
          <Box as="section">
            <MediaDetailActions
              addLabel="Add TV Show"
              mediaType={MediaType.Tv}
              tmdbId={show.id}
            />
          </Box>
        ) : (
          <Stack alignItems="flex-start" as="section" gap={3}>
            <Text>
              Log in or register to add this TV Show to your library, track
              episode progress, mark it as a favourite or rate it.
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

        {/* Episodes are the point of a show page, so the seen toggles follow
            the actions: the current season slides left to right and every
            season opens in place below it. */}
        <EpisodeTracker seasons={show.seasons} showId={show.id} />

        {isAuthenticated ? (
          <Box as="section">
            <Heading fontSize="xl" marginBottom={3}>
              Rating
            </Heading>
            <RatingInput
              showAverage={false}
              showReview
              target={{ mediaType: MediaType.Tv, tmdbId: show.id }}
            />
          </Box>
        ) : null}

        <Box as="section">
          <Heading fontSize="xl" marginBottom={2}>
            Description
          </Heading>
          <Text color={show.overview ? undefined : 'fg.muted'}>
            {show.overview || 'No description is available from TMDB.'}
          </Text>
        </Box>

        <TvTrailer trailer={trailer} />

        {/* The director leads the people on the page, in the cast's own
            format, and falls back to the creators when TMDB credits no
            series-level director. */}
        <MediaCrewSection
          emptyMessage="No director information is available from TMDB."
          people={crew}
          title={crewTitle}
        />

        <TvCastsWrapper credits={credits} />

        <MediaReviews
          reviews={reviews}
          seeAllHref={`/tv/show/${show.id}/reviews` as Route}
        />
      </Stack>
    </PageShell>
  );
};

export default TvShowDetailPage;
