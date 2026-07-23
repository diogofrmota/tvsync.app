'use client';

import {
  AspectRatio,
  Badge,
  Button,
  Flex,
  Grid,
  Heading,
  Image,
  Progress,
  Text,
} from '@chakra-ui/react';
import { IMAGE_URL_ORIGINAL } from 'lib/components/shared/tmdb-image-urls';
import {
  setEpisodeWatched,
  setSeasonWatched,
} from 'lib/features/tracking/actions';
import type { TVSeasonEpisode } from 'lib/services/tmdb/tv/season/types';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

type SeasonEpisodeListProps = {
  episodes: Array<TVSeasonEpisode>;
  initialWatchedEpisodeNumbers: Array<number>;
  seasonNumber: number;
  showId: number;
};

const formatRuntime = (runtime: number) =>
  runtime > 0 ? `${runtime} min` : 'Runtime unavailable';

const isUnaired = (airDate: string) =>
  Boolean(airDate) && new Date(airDate) > new Date();

const getEpisodeHref = (
  showId: number,
  seasonNumber: number,
  episodeNumber: number
) =>
  `/tv/show/${showId}/season/${seasonNumber}/episode/${episodeNumber}` as Route;

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

export const SeasonEpisodeList = ({
  episodes,
  initialWatchedEpisodeNumbers,
  seasonNumber,
  showId,
}: SeasonEpisodeListProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [watchedEpisodeNumbers, setWatchedEpisodeNumbers] = useState(
    () => new Set(initialWatchedEpisodeNumbers)
  );
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'error' | 'status';
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const episodeCount = episodes.length;
  const watchedCount = watchedEpisodeNumbers.size;
  const progressPercent =
    episodeCount > 0 ? Math.round((watchedCount / episodeCount) * 100) : 0;

  const handleLoginRequired = (previous: Set<number>) => {
    setWatchedEpisodeNumbers(previous);
    router.push(getLoginHref(pathname, searchParams));
  };

  const handleSetWholeSeason = (watched: boolean) => {
    const previous = watchedEpisodeNumbers;
    const optimistic = watched
      ? new Set(episodes.map((episode) => episode.episode_number))
      : new Set<number>();
    setWatchedEpisodeNumbers(optimistic);
    setFeedback(null);

    startTransition(async () => {
      const result = await setSeasonWatched({
        seasonNumber,
        tmdbShowId: showId,
        watched,
      });

      if (result.status === 'login_required') {
        handleLoginRequired(previous);
        return;
      }

      if (result.status === 'error') {
        setWatchedEpisodeNumbers(previous);
        setFeedback({
          message: 'Could not update the season. Please try again.',
          tone: 'error',
        });
        return;
      }

      setWatchedEpisodeNumbers(new Set(result.watchedEpisodeNumbers));
      setFeedback({
        message: watched
          ? 'Season marked as watched.'
          : 'Season marked as unwatched.',
        tone: 'status',
      });
      router.refresh();
    });
  };

  const handleToggleEpisode = (episodeNumber: number) => {
    const previous = watchedEpisodeNumbers;
    const nextWatched = !previous.has(episodeNumber);
    const optimistic = new Set(previous);
    if (nextWatched) {
      optimistic.add(episodeNumber);
    } else {
      optimistic.delete(episodeNumber);
    }
    setWatchedEpisodeNumbers(optimistic);
    setFeedback(null);

    startTransition(async () => {
      const result = await setEpisodeWatched({
        episodeNumber,
        seasonNumber,
        tmdbShowId: showId,
        watched: nextWatched,
      });

      if (result.status === 'login_required') {
        handleLoginRequired(previous);
        return;
      }

      if (result.status === 'error') {
        setWatchedEpisodeNumbers(previous);
        setFeedback({
          message: 'Could not update the episode. Please try again.',
          tone: 'error',
        });
        return;
      }

      router.refresh();
    });
  };

  return (
    <Grid gap={4}>
      <Grid gap={2}>
        <Flex align="center" gap={3} wrap="wrap">
          <Text color="gray.300" fontSize="sm">
            {watchedCount} / {episodeCount} watched
          </Text>
          <Button
            disabled={episodeCount === 0}
            loading={isPending}
            onClick={() => handleSetWholeSeason(true)}
            size="sm"
          >
            Mark season watched
          </Button>
          <Button
            disabled={episodeCount === 0}
            loading={isPending}
            onClick={() => handleSetWholeSeason(false)}
            size="sm"
            variant="outline"
          >
            Mark season unwatched
          </Button>
        </Flex>
        <Progress.Root max={100} value={progressPercent}>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        {feedback ? (
          <Text
            color={feedback.tone === 'error' ? 'red.400' : 'gray.300'}
            fontSize="sm"
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </Text>
        ) : null}
      </Grid>

      {episodes.length > 0 ? (
        <Grid gap={4}>
          {episodes.map((episode) => {
            const watched = watchedEpisodeNumbers.has(episode.episode_number);

            return (
              <Grid
                _hover={{ borderColor: 'gray.400' }}
                borderColor="whiteAlpha.300"
                borderRadius={8}
                borderWidth="1px"
                key={episode.id}
                overflow="hidden"
                padding={3}
              >
                <Grid
                  gap={4}
                  templateColumns={{
                    base: '1fr',
                    md: '180px minmax(0, 1fr) auto',
                  }}
                >
                  <Link
                    href={getEpisodeHref(
                      showId,
                      seasonNumber,
                      episode.episode_number
                    )}
                    prefetch={false}
                  >
                    <AspectRatio ratio={16 / 9}>
                      <Image
                        alt={
                          episode.still_path
                            ? `${episode.name} still`
                            : 'Episode still unavailable'
                        }
                        borderRadius={8}
                        objectFit="cover"
                        src={
                          episode.still_path
                            ? `${IMAGE_URL_ORIGINAL}${episode.still_path}`
                            : '/Movie Night-bro.svg'
                        }
                      />
                    </AspectRatio>
                  </Link>

                  <Link
                    href={getEpisodeHref(
                      showId,
                      seasonNumber,
                      episode.episode_number
                    )}
                    prefetch={false}
                  >
                    <Grid alignContent="start" gap={2}>
                      <Flex align="center" gap={2} wrap="wrap">
                        <Heading fontSize="md">
                          {episode.episode_number}.{' '}
                          {episode.name || 'Untitled episode'}
                        </Heading>
                        {isUnaired(episode.air_date) ? (
                          <Badge colorPalette="gray" variant="outline">
                            Unaired
                          </Badge>
                        ) : null}
                      </Flex>
                      <Text color="gray.400" fontSize="sm">
                        {episode.air_date || 'Air date unavailable'} |{' '}
                        {formatRuntime(episode.runtime)}
                      </Text>
                      {episode.overview ? (
                        <Text fontSize="sm" lineClamp={3}>
                          {episode.overview}
                        </Text>
                      ) : (
                        <Text color="gray.400" fontSize="sm">
                          No overview is available for this episode.
                        </Text>
                      )}
                    </Grid>
                  </Link>

                  <Button
                    alignSelf="flex-start"
                    loading={isPending}
                    onClick={() => handleToggleEpisode(episode.episode_number)}
                    size="sm"
                    variant={watched ? 'outline' : 'solid'}
                  >
                    {watched ? 'Mark unwatched' : 'Mark watched'}
                  </Button>
                </Grid>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Text color="gray.400">
          TMDB does not have episode information for this season yet.
        </Text>
      )}
    </Grid>
  );
};
