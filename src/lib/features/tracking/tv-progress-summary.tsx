'use client';

import { Box, Grid, Heading, Progress, Text } from '@chakra-ui/react';
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

  return (
    <Box
      borderColor="whiteAlpha.300"
      borderRadius={8}
      borderWidth="1px"
      padding={4}
    >
      <Grid gap={3}>
        <Heading fontSize="md" fontWeight="500">
          Your TV progress
        </Heading>
        <Text color="gray.200" fontSize="sm">
          Watched: {summary.watchedEpisodeCount} / {summary.totalEpisodeCount}{' '}
          episodes
        </Text>
        <Text color="gray.200" fontSize="sm">
          Next: {nextEpisode}
        </Text>
        <Progress.Root value={summary.progressPercent}>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        <Text color="gray.300" fontSize="sm">
          Progress: {summary.progressPercent}%
          {summary.lastWatchedAt
            ? ` - Last watched ${new Date(summary.lastWatchedAt).toLocaleDateString()}`
            : ''}
        </Text>
      </Grid>
    </Box>
  );
};
