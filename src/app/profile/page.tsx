import { getOwnProfileFavorites } from 'lib/features/profile/profile-favorites.server';
import { getOwnProfileStatistics } from 'lib/features/profile/profile-statistics.server';
import { ProfileAccessIssue, ProfilePage } from 'lib/pages/profile';
import { authOptions } from 'lib/services/auth/index.server';
import { getAuthSessionIssue } from 'lib/services/auth/session-error.server';
import { getDatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import { getFollowStateForProfile } from 'lib/services/database/social.server';
import { getOwnProfile } from 'lib/services/database/tracking.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description:
    'View your TvSync profile, activity, favourites, and statistics.',
  title: 'Your Profile | TvSync',
};

export default async function Page() {
  let session: Session | null = null;

  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    return <ProfileAccessIssue issue={getAuthSessionIssue(error)} />;
  }

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile' as Route);
  }

  try {
    const profile = await getOwnProfile();

    if (!profile) {
      return (
        <ProfileAccessIssue
          issue={{
            description:
              'Your authenticated account does not have a profile record. Sign in again or contact support before tracking activity.',
            title: 'Profile data is missing',
          }}
        />
      );
    }

    const [statistics, favorites, followState] = await Promise.all([
      getOwnProfileStatistics(),
      getOwnProfileFavorites(),
      getFollowStateForProfile(profile.user_id),
    ]);

    return (
      <ProfilePage
        favorites={favorites}
        followCounts={{
          follower_count: followState.follower_count,
          following_count: followState.following_count,
        }}
        profile={profile}
        statistics={statistics}
      />
    );
  } catch (error) {
    const issue = getDatabaseAvailabilityIssue(error);

    if (!issue) {
      throw error;
    }

    return <ProfileAccessIssue issue={issue} />;
  }
}
