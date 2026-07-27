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

export const getProfileStatCards = (
  statistics: ProfileStatistics
): Array<ProfileStatCard> => [
  { label: 'TV Shows Finished', value: statistics.tvShowsWatched },
  { label: 'Movies Finished', value: statistics.moviesWatched },
  {
    // Titles TMDB has no runtime for are simply not counted. The total never
    // announces how incomplete it is — that is bookkeeping, not a statistic.
    label: 'Total Watch Time',
    value: formatWatchTime(
      statistics.tvMinutesWatched + statistics.movieMinutesWatched
    ),
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
