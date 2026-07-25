'use client';

import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import {
  getTvProgressSummary,
  type TvProgressSummaryResult,
} from 'lib/features/tracking/actions';
import { useEffect, useState } from 'react';

type TvProgressSummaryProps = {
  tmdbShowId: number;
};

const emptySummary: TvProgressSummaryResult = {
  lastWatchedAt: null,
  nextEpisode: null,
  progressPercent: 0,
  status: 'removed',
  totalEpisodeCount: 0,
  watchedEpisodeCount: 0,
  watchedSeasonCount: 0,
};

/**
 * Overall progress as one compact block in the show header: the same yellow bar
 * the posters use, the watched count, and the next episode to play.
 */
export const TvProgressSummary = ({ tmdbShowId }: TvProgressSummaryProps) => {
  const [summary, setSummary] = useState<TvProgressSummaryResult>(emptySummary);

  useEffect(() => {
    let isMounted = true;

    getTvProgressSummary(tmdbShowId).then((result) => {
      if (isMounted) {
        setSummary(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [tmdbShowId]);

  if (summary.status === 'login_required') {
    return null;
  }

  const nextEpisode = summary.nextEpisode
    ? `S${summary.nextEpisode.seasonNumber} E${summary.nextEpisode.episodeNumber} - ${summary.nextEpisode.name}`
    : 'All available episodes watched';
  const isComplete =
    summary.totalEpisodeCount > 0 &&
    summary.watchedEpisodeCount >= summary.totalEpisodeCount;

  return (
    <Stack gap={2}>
      <Flex align="baseline" gap={2} justify="space-between" wrap="wrap">
        <Text fontSize="sm" fontWeight="600">
          Your TV progress
        </Text>
        <Text color="fg.muted" fontSize="sm">
          Watched: {summary.watchedEpisodeCount} / {summary.totalEpisodeCount}{' '}
          episodes · Progress: {summary.progressPercent}%
        </Text>
      </Flex>
      <Box background="bg.muted" borderRadius="full" height="6px" width="full">
        <Box
          background={isComplete ? 'green.400' : 'gold.400'}
          borderRadius="full"
          height="full"
          transitionDuration="moderate"
          transitionProperty="width, background"
          transitionTimingFunction="ease-out"
          width={`${Math.max(0, Math.min(summary.progressPercent, 100))}%`}
        />
      </Box>
      <Text color="fg.muted" fontSize="sm">
        Next: {nextEpisode}
        {summary.lastWatchedAt
          ? ` · Last watched ${new Date(summary.lastWatchedAt).toLocaleDateString()}`
          : ''}
      </Text>
    </Stack>
  );
};
