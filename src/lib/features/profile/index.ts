import 'server-only';

import {
  getPublicProfileFavorites,
  type ProfileFavoriteItem,
} from 'lib/features/profile/profile-favorites.server';
import type { ProfileStatistics } from 'lib/features/profile/profile-statistics';
import { getPublicProfileStatistics } from 'lib/features/profile/profile-statistics.server';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { FollowState } from 'lib/services/database/social.server';
import { getFollowStateForProfile } from 'lib/services/database/social.server';
import type { PublicProfile } from 'lib/services/database/tracking.server';
import { getPublicProfileByUsername } from 'lib/services/database/tracking.server';

export type PublicProfileData = {
  favorites: Array<ProfileFavoriteItem>;
  followState: FollowState;
  isAuthenticated: boolean;
  isOwnProfile: boolean;
  profile: Pick<PublicProfile, 'bio' | 'display_name' | 'username'>;
  statistics: ProfileStatistics;
};

export const getPublicProfileData = async (
  username: string
): Promise<PublicProfileData | null> => {
  if (!username.trim()) {
    return null;
  }

  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    return null;
  }

  const [followState, favorites, statistics, session] = await Promise.all([
    getFollowStateForProfile(profile.user_id),
    getPublicProfileFavorites(profile.username),
    getPublicProfileStatistics(profile.username),
    getAuthSession(),
  ]);

  return {
    favorites,
    followState,
    isAuthenticated: Boolean(session?.user),
    isOwnProfile: session?.user?.id === profile.user_id,
    profile: {
      bio: profile.bio,
      display_name: profile.display_name,
      username: profile.username,
    },
    statistics,
  };
};
