import { getOwnProfileStatistics } from 'lib/features/profile/profile-statistics.server';
import { requireOwnProfile } from 'lib/pages/profile/route-guards.server';
import { ProfileStatisticsPage } from 'lib/pages/profile/statistics';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Every TvSync statistic tracked for your account.',
  title: 'TvSync | Your Statistics',
};

const EMPTY_STATISTICS = {
  episodesWatched: 0,
  missingMovieRuntimeCount: 0,
  missingTvRuntimeCount: 0,
  movieMinutesWatched: 0,
  moviesWatched: 0,
  reviewsWritten: 0,
  tvMinutesWatched: 0,
  tvShowsWatched: 0,
};

export default async function Page() {
  const profile = await requireOwnProfile('/profile/statistics');
  const statistics = await getOwnProfileStatistics().catch(
    () => EMPTY_STATISTICS
  );

  return (
    <ProfileStatisticsPage
      statistics={statistics}
      username={profile.username}
    />
  );
}
