'use client';

import { Button, Flex, Text } from '@chakra-ui/react';
import {
  getTvProgressSummary,
  setEpisodeWatched,
} from 'lib/features/tracking/actions';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

type NextEpisode = {
  episodeNumber: number;
  name: string;
  seasonNumber: number;
} | null;

type EpisodeProgressPanelProps = {
  episodeNumber: number;
  initialNextEpisode: NextEpisode;
  initialWatched: boolean;
  seasonNumber: number;
  showId: number;
  tmdbShowId: number;
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

const getEpisodeHref = (
  showId: number,
  seasonNumber: number,
  episodeNumber: number
) =>
  `/tv/show/${showId}/season/${seasonNumber}/episode/${episodeNumber}` as Route;

export const EpisodeProgressPanel = ({
  episodeNumber,
  initialNextEpisode,
  initialWatched,
  seasonNumber,
  showId,
  tmdbShowId,
}: EpisodeProgressPanelProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [watched, setWatched] = useState(initialWatched);
  const [nextEpisode, setNextEpisode] = useState(initialNextEpisode);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'error' | 'status';
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const previousWatched = watched;
    const previousNextEpisode = nextEpisode;
    const nextWatched = !watched;
    setWatched(nextWatched);
    setFeedback(null);

    startTransition(async () => {
      const result = await setEpisodeWatched({
        episodeNumber,
        seasonNumber,
        tmdbShowId,
        watched: nextWatched,
      });

      if (result.status === 'login_required') {
        setWatched(previousWatched);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setWatched(previousWatched);
        setNextEpisode(previousNextEpisode);
        setFeedback({
          message: 'Could not update this episode. Please try again.',
          tone: 'error',
        });
        return;
      }

      setWatched(result.watched);
      const summary = await getTvProgressSummary(tmdbShowId);
      if (summary.status === 'saved') {
        setNextEpisode(summary.nextEpisode);
      }
      setFeedback({
        message: result.watched ? 'Marked as watched.' : 'Marked as unwatched.',
        tone: 'status',
      });
      router.refresh();
    });
  };

  const isCurrentEpisodeNextUnwatched =
    nextEpisode?.seasonNumber === seasonNumber &&
    nextEpisode?.episodeNumber === episodeNumber;

  return (
    <Flex direction="column" gap={2}>
      <Flex align="center" gap={3} wrap="wrap">
        <Button loading={isPending} onClick={handleClick} size="md">
          {watched ? 'Mark as Unwatched' : 'Mark as Watched'}
        </Button>
        {isCurrentEpisodeNextUnwatched ? (
          <Text color="orange.300" fontSize="sm">
            This is your next unwatched episode.
          </Text>
        ) : null}
      </Flex>

      {feedback ? (
        <Text
          color={feedback.tone === 'error' ? 'red.400' : 'gray.300'}
          fontSize="sm"
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </Text>
      ) : null}

      {isCurrentEpisodeNextUnwatched ? null : (
        <Text color="gray.300" fontSize="sm">
          Next unwatched episode:{' '}
          {nextEpisode ? (
            <Link
              href={getEpisodeHref(
                showId,
                nextEpisode.seasonNumber,
                nextEpisode.episodeNumber
              )}
            >
              S{nextEpisode.seasonNumber} E{nextEpisode.episodeNumber} -{' '}
              {nextEpisode.name}
            </Link>
          ) : (
            'All available episodes watched'
          )}
        </Text>
      )}
    </Flex>
  );
};
