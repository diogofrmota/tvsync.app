import {
  AspectRatio,
  Badge,
  Button,
  Grid,
  Heading,
  Image,
  Text,
} from '@chakra-ui/react';
import { BionifiedParagraph } from 'lib/components/BionifiedParagraph';
import { PageShell } from 'lib/components/shared/PageShell';
import { IMAGE_URL_ORIGINAL } from 'lib/components/shared/PosterImage';
import { RatingInput } from 'lib/features/reviews';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import { EpisodeProgressPanel } from 'lib/pages/tv/episode/detail/components/episode-progress-panel';
import type { EpisodeNavigationTarget } from 'lib/services/tmdb/tv/episode/navigation';
import type { TVEpisodeDetailsResponse } from 'lib/services/tmdb/tv/episode/types';
import type { Route } from 'next';
import Link from 'next/link';

type NextEpisode = {
  episodeNumber: number;
  name: string;
  seasonNumber: number;
} | null;

type TVEpisodeDetailPageProps = {
  data: TVEpisodeDetailsResponse;
  initialNextEpisode: NextEpisode;
  initialWatched: boolean;
  next: EpisodeNavigationTarget | null;
  previous: EpisodeNavigationTarget | null;
  showName: string;
};

const formatEpisodeTitle = (data: TVEpisodeDetailsResponse) =>
  data.name || `Episode ${data.episode_number}`;

const formatRuntime = (runtime: number) =>
  runtime > 0 ? `${runtime} min` : 'Runtime unavailable';

const getEpisodeHref = (
  showId: number,
  seasonNumber: number,
  episodeNumber: number
) =>
  `/tv/show/${showId}/season/${seasonNumber}/episode/${episodeNumber}` as Route;

export const TVEpisodeDetailPage = ({
  data,
  initialNextEpisode,
  initialWatched,
  next,
  previous,
  showName,
}: TVEpisodeDetailPageProps) => {
  const title = formatEpisodeTitle(data);

  return (
    <PageShell>
      <Grid gridGap={[8, 16]}>
        <BackButton />

        <Grid gap={8}>
          <AspectRatio ratio={16 / 9} width="100%">
            <Image
              alt={
                data.still_path ? `${title} still` : 'Episode still unavailable'
              }
              borderRadius={8}
              objectFit="cover"
              src={
                data.still_path
                  ? `${IMAGE_URL_ORIGINAL}${data.still_path}`
                  : '/Movie Night-bro.svg'
              }
            />
          </AspectRatio>

          <Grid gap={4}>
            <Link href={`/tv/show/${data.show_id}` as Route} prefetch={false}>
              <Text
                color="gray.400"
                fontSize="sm"
                letterSpacing={0}
                textTransform="uppercase"
              >
                {showName}
              </Text>
            </Link>

            <Heading
              fontWeight="bold"
              letterSpacing={0}
              size="lg"
              textTransform="uppercase"
              wordBreak="break-word"
            >
              {title}
            </Heading>

            <Grid
              alignItems="center"
              gap={2}
              templateColumns={{ base: '1fr', md: 'repeat(4, max-content)' }}
            >
              <Badge variant="outline">Season {data.season_number}</Badge>
              <Badge variant="outline">Episode {data.episode_number}</Badge>
              <Text fontSize="xs" letterSpacing={0} textTransform="uppercase">
                {data.air_date || 'Air date unavailable'}
              </Text>
              <Text fontSize="xs" letterSpacing={0} textTransform="uppercase">
                {formatRuntime(data.runtime)}
              </Text>
            </Grid>

            <Grid gap={1}>
              <Text fontWeight="600">IMDb rating</Text>
              <Text color="fg.muted">
                Unavailable — TMDB does not provide a genuine IMDb episode
                rating value.
              </Text>
            </Grid>

            <EpisodeProgressPanel
              episodeNumber={data.episode_number}
              initialNextEpisode={initialNextEpisode}
              initialWatched={initialWatched}
              seasonNumber={data.season_number}
              showId={data.show_id}
              tmdbShowId={data.show_id}
            />

            <Grid
              alignItems="center"
              gap={3}
              templateColumns={{ base: '1fr', md: 'repeat(2, max-content)' }}
            >
              {previous ? (
                <Button asChild variant="outline">
                  <Link
                    href={getEpisodeHref(
                      data.show_id,
                      previous.seasonNumber,
                      previous.episodeNumber
                    )}
                  >
                    Previous Episode
                  </Link>
                </Button>
              ) : null}
              {next ? (
                <Button asChild variant="outline">
                  <Link
                    href={getEpisodeHref(
                      data.show_id,
                      next.seasonNumber,
                      next.episodeNumber
                    )}
                  >
                    Next Episode
                  </Link>
                </Button>
              ) : null}
            </Grid>

            <RatingInput
              label="Your episode rating"
              target={{
                episodeNumber: data.episode_number,
                mediaType: 'tv_episode',
                seasonNumber: data.season_number,
                tmdbId: data.show_id,
              }}
            />

            {data.overview ? (
              <BionifiedParagraph textAlign="justify">
                {data.overview}
              </BionifiedParagraph>
            ) : (
              <Text color="gray.400">
                No overview is available from TMDB for this episode yet.
              </Text>
            )}
          </Grid>
        </Grid>
      </Grid>
    </PageShell>
  );
};
