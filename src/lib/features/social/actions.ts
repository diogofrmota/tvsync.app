'use server';

import {
  addReviewComment,
  createRecommendation,
  deleteOwnReviewComment,
  dismissRecommendation,
  followPublicProfile,
  listFollowedProfilesForRecommendations,
  setReviewLike,
  unfollowProfile,
} from 'lib/services/database/social.server';
import { MediaType } from 'lib/types';
import { revalidatePath } from 'next/cache';

export type SocialActionState = {
  error?: string;
  success?: string;
};

export type RecommendationRecipient = {
  displayName: string;
  userId: string;
  username: string;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const isTrackableMediaType = (value: string) =>
  value === MediaType.Movie || value === MediaType.Tv;

const readTextField = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
};

export const followProfileAction = async (
  profileUserId: string,
  username: string
): Promise<SocialActionState> => {
  try {
    await followPublicProfile(profileUserId);
    revalidatePath(`/profile/${username}`);
    revalidatePath('/');

    return { success: 'Followed.' };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'This profile could not be followed.',
    };
  }
};

export const unfollowProfileAction = async (
  profileUserId: string,
  username: string
): Promise<SocialActionState> => {
  try {
    await unfollowProfile(profileUserId);
    revalidatePath(`/profile/${username}`);
    revalidatePath('/');

    return { success: 'Unfollowed.' };
  } catch {
    return { error: 'This profile could not be unfollowed.' };
  }
};

export const setReviewLikeAction = async (
  reviewId: string,
  liked: boolean,
  tmdbId: number,
  mediaType: MediaType.Movie | MediaType.Tv
): Promise<SocialActionState> => {
  try {
    await setReviewLike(reviewId, liked);
    revalidatePath(
      mediaType === MediaType.Movie ? `/movie/${tmdbId}` : `/tv/show/${tmdbId}`
    );

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
    revalidatePath(
      mediaType === MediaType.Movie ? `/movie/${tmdbId}` : `/tv/show/${tmdbId}`
    );

    return { success: 'Comment added.' };
  } catch {
    return { error: 'Comment could not be added.' };
  }
};

export const deleteReviewCommentAction = async (
  commentId: string,
  tmdbId: number,
  mediaType: MediaType.Movie | MediaType.Tv
): Promise<SocialActionState> => {
  try {
    await deleteOwnReviewComment(commentId);
    revalidatePath(
      mediaType === MediaType.Movie ? `/movie/${tmdbId}` : `/tv/show/${tmdbId}`
    );

    return { success: 'Comment deleted.' };
  } catch {
    return { error: 'Comment could not be deleted.' };
  }
};

export const recommendMediaAction = async (
  _previousState: SocialActionState,
  formData: FormData
): Promise<SocialActionState> => {
  const receiverUserId = readTextField(formData, 'receiverUserId');
  const mediaType = readTextField(formData, 'mediaType');
  const tmdbId = Number(readTextField(formData, 'tmdbId'));
  const note = readTextField(formData, 'note');

  if (
    !(
      receiverUserId &&
      isTrackableMediaType(mediaType) &&
      isPositiveInteger(tmdbId) &&
      note.length <= 500
    )
  ) {
    return { error: 'Choose a followed user before recommending this title.' };
  }

  try {
    await createRecommendation({
      mediaType,
      note,
      receiverUserId,
      tmdbId,
    });
    revalidatePath('/recommendations');

    return { success: 'Recommendation sent.' };
  } catch {
    return { error: 'Recommendation could not be sent.' };
  }
};

export const getRecommendationRecipients = async (): Promise<
  Array<RecommendationRecipient>
> => {
  try {
    const rows = await listFollowedProfilesForRecommendations();

    return rows.map((row) => ({
      displayName: row.display_name || row.username,
      userId: row.user_id,
      username: row.username,
    }));
  } catch {
    return [];
  }
};

export const dismissRecommendationAction = async (
  recommendationId: string
): Promise<SocialActionState> => {
  try {
    await dismissRecommendation(recommendationId);
    revalidatePath('/recommendations');

    return { success: 'Recommendation dismissed.' };
  } catch {
    return { error: 'Recommendation could not be dismissed.' };
  }
};
