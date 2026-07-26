import { Button, Stack } from '@chakra-ui/react';
import {
  type ProfileStatCard,
  ProfileStatRail,
} from 'lib/components/profile/ProfileStatRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import {
  formatWatchTime,
  type ProfileStatistics,
} from 'lib/features/profile/profile-statistics';
import type { Route } from 'next';
import Link from 'next/link';

const runtimeDetail = (missingCount: number) =>
  missingCount > 0
    ? `Partial total: ${missingCount} ${
        missingCount === 1 ? 'runtime is' : 'runtimes are'
      } unavailable.`
    : undefined;

export const getProfileStatCards = (
  statistics: ProfileStatistics
): Array<ProfileStatCard> => [
  { label: 'TV Shows Finished', value: statistics.tvShowsWatched },
  { label: 'Movies Finished', value: statistics.moviesWatched },
  { label: 'Episodes Watched', value: statistics.episodesWatched },
  {
    detail: runtimeDetail(statistics.missingTvRuntimeCount),
    label: 'Time in TV Shows',
    value: formatWatchTime(statistics.tvMinutesWatched),
  },
  {
    detail: runtimeDetail(statistics.missingMovieRuntimeCount),
    label: 'Time in Movies',
    value: formatWatchTime(statistics.movieMinutesWatched),
  },
  { label: 'Number of Reviews', value: statistics.reviewsWritten },
];

/**
 * The "See All" destination for the profile Statistics section: every counter
 * the app tracks, with the follower comparison as the closing action.
 */
export const ProfileStatisticsPage = ({
  statistics,
  username,
}: {
  statistics: ProfileStatistics;
  username: string;
}) => (
  <PageShell>
    <PageHeading
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={'/profile' as Route}>Back to Profile</Link>
        </Button>
      }
      subtitle="Everything you have tracked on TvSync."
      title="Statistics"
    />
    <ProfileStatRail cards={getProfileStatCards(statistics)} />
    <Stack align="center" as="section" gap={3}>
      <Button asChild>
        <Link
          href={`/profile/${username}/following?compare=statistics` as Route}
        >
          Compare with Following
        </Link>
      </Button>
    </Stack>
  </PageShell>
);
