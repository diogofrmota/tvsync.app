import type { ProfileFavoriteItem } from 'lib/features/profile/profile-favorites.server';
import { getOwnProfileFavorites } from 'lib/features/profile/profile-favorites.server';
import type { ProfileStatistics } from 'lib/features/profile/profile-statistics';
import { getOwnProfileStatistics } from 'lib/features/profile/profile-statistics.server';
import { ProfileAccessIssue, ProfilePage } from 'lib/pages/profile';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { AuthSessionIssue } from 'lib/services/auth/session-error.server';
import {
  getAuthSessionIssue,
  getProfileAccessIssue,
} from 'lib/services/auth/session-error.server';
import { getDatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import type { FollowState } from 'lib/services/database/social.server';
import { getFollowStateForProfile } from 'lib/services/database/social.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import { getOwnProfile } from 'lib/services/database/tracking.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description:
    'View your TvSync profile, activity, favourites, and statistics.',
  title: 'TvSync | Your Profile',
};

const EMPTY_STATISTICS: ProfileStatistics = {
  episodesWatched: 0,
  missingMovieRuntimeCount: 0,
  missingTvRuntimeCount: 0,
  movieMinutesWatched: 0,
  moviesWatched: 0,
  tvMinutesWatched: 0,
  tvShowsWatched: 0,
};

const EMPTY_FOLLOW_STATE: FollowState = {
  follower_count: 0,
  following_count: 0,
  is_following: false,
};

const UNEXPECTED_PROFILE_ISSUE: AuthSessionIssue = {
  description:
    'TvSync hit an unexpected error while loading your profile. Please try again in a moment. If this keeps happening, sign out and sign back in.',
  title: 'Your profile could not be loaded',
};

// Turn any failure from loading the core profile record into a friendly,
// actionable panel instead of escalating to the app-wide error boundary.
const resolveProfileIssue = (error: unknown): AuthSessionIssue =>
  getDatabaseAvailabilityIssue(error) ??
  getProfileAccessIssue(error) ??
  UNEXPECTED_PROFILE_ISSUE;

// Secondary profile data (stats, favourites, follow counts) should never take
// the whole page down; degrade to a safe default and log for diagnostics.
const withFallback = async <Value,>(
  load: () => Promise<Value>,
  fallback: Value,
  label: string
): Promise<Value> => {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load profile ${label}:`, error);
    return fallback;
  }
};

export default async function Page() {
  let session: Session | null = null;

  try {
    session = await getAuthSession();
  } catch (error) {
    return <ProfileAccessIssue issue={getAuthSessionIssue(error)} />;
  }

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile' as Route);
  }

  let profile: OwnProfile | null;

  try {
    profile = await getOwnProfile();
  } catch (error) {
    return <ProfileAccessIssue issue={resolveProfileIssue(error)} />;
  }

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

  const ownProfile = profile;
  const [statistics, favorites, followState] = await Promise.all([
    withFallback<ProfileStatistics>(
      getOwnProfileStatistics,
      EMPTY_STATISTICS,
      'statistics'
    ),
    withFallback<Array<ProfileFavoriteItem>>(
      getOwnProfileFavorites,
      [],
      'favourites'
    ),
    withFallback<FollowState>(
      () => getFollowStateForProfile(ownProfile.user_id),
      EMPTY_FOLLOW_STATE,
      'follow counts'
    ),
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
}
