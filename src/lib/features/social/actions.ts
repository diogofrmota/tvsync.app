'use server';

import {
  normalizeUsername,
  validateUsername,
} from 'lib/services/auth/security';
import {
  addReviewComment,
  deleteOwnReviewComment,
  followPublicProfile,
  setReviewLike,
  unfollowProfile,
} from 'lib/services/database/social.server';
import { MediaType } from 'lib/types';

export type SocialActionState = {
  error?: string;
  isFollowing?: boolean;
  success?: string;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const isTrackableMediaType = (value: string) =>
  value === MediaType.Movie || value === MediaType.Tv;

const readTextField = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
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

export const setReviewLikeAction = async (
  reviewId: string,
  liked: boolean,
  _tmdbId: number,
  _mediaType: MediaType.Movie | MediaType.Tv
): Promise<SocialActionState> => {
  try {
    await setReviewLike(reviewId, liked);

    return { success: liked ? 'Liked.' : 'Unliked.' };
  } catch {
    return { error: 'Review reaction could not be updated.' };
  }
};

export const addReviewCommentAction = async (
  _previousState: SocialActionState,
  formData: FormData
): Promise<SocialActionState> => {
  const reviewId = readTextField(formData, 'reviewId');
  const mediaType = readTextField(formData, 'mediaType');
  const tmdbId = Number(readTextField(formData, 'tmdbId'));
  const body = readTextField(formData, 'body');

  if (
    !(
      reviewId &&
      isPositiveInteger(tmdbId) &&
      isTrackableMediaType(mediaType) &&
      body.length >= 2 &&
      body.length <= 800
    )
  ) {
    return { error: 'Use 2 to 800 characters for comments.' };
  }

  try {
    await addReviewComment(reviewId, body);

    return { success: 'Comment added.' };
  } catch {
    return { error: 'Comment could not be added.' };
  }
};

export const deleteReviewCommentAction = async (
  commentId: string,
  _tmdbId: number,
  _mediaType: MediaType.Movie | MediaType.Tv
): Promise<SocialActionState> => {
  try {
    await deleteOwnReviewComment(commentId);

    return { success: 'Comment deleted.' };
  } catch {
    return { error: 'Comment could not be deleted.' };
  }
};
