'use server';

import {
  normalizeUsername,
  validateUsername,
} from 'lib/services/auth/security';
import {
  followPublicProfile,
  unfollowProfile,
} from 'lib/services/database/social.server';

export type SocialActionState = {
  error?: string;
  isFollowing?: boolean;
  success?: string;
};

const getFollowErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.startsWith('Unauthorized:')) {
    return 'Sign in to follow profiles.';
  }

  if (
    error instanceof Error &&
    error.message === 'This public profile is unavailable.'
  ) {
    return error.message;
  }

  return 'This profile could not be followed.';
};

export const followProfileAction = async (
  username: string
): Promise<SocialActionState> => {
  const normalizedUsername = normalizeUsername(username);

  if (validateUsername(normalizedUsername)) {
    return { error: 'This public profile is unavailable.' };
  }

  try {
    await followPublicProfile(normalizedUsername);

    return { isFollowing: true, success: 'Followed.' };
  } catch (error) {
    return { error: getFollowErrorMessage(error) };
  }
};

export const unfollowProfileAction = async (
  username: string
): Promise<SocialActionState> => {
  const normalizedUsername = normalizeUsername(username);

  if (validateUsername(normalizedUsername)) {
    return { error: 'This profile could not be unfollowed.' };
  }

  try {
    await unfollowProfile(normalizedUsername);

    return { isFollowing: false, success: 'Unfollowed.' };
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message.startsWith('Unauthorized:')
          ? 'Sign in to manage follows.'
          : 'This profile could not be unfollowed.',
    };
  }
};
