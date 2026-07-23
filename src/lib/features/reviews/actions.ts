'use server';

import { getAuthSession } from 'lib/services/auth/session.server';
import {
  getReviewSocialRows,
  type ReviewSocialRow,
} from 'lib/services/database/social.server';
import {
  deleteOwnRating,
  deleteOwnReview,
  getOwnRating,
  getOwnReview,
  getRatingSummary,
  listPublicReviewsForMedia,
  upsertOwnRating,
  upsertOwnReview,
} from 'lib/services/database/tracking.server';
import { MediaType, PrivacySetting, type RatingTarget } from 'lib/types';

type ActionStatus = 'deleted' | 'error' | 'login_required' | 'saved';

export type RatingStateResult = {
  averageRating: number | null;
  rating: number | null;
  ratingCount: number;
  status: ActionStatus;
};

export type ReviewView = {
  body: string;
  canEdit: boolean;
  createdAt: string;
  displayName: string;
  id: string;
  privacySetting: PrivacySetting;
  title: string;
  updatedAt: string;
  userId: string;
  username: string;
  social: ReviewSocialRow | null;
};

export type ReviewsStateResult = {
  ownReview: ReviewView | null;
  reviews: Array<ReviewView>;
  status: ActionStatus;
};

export type ReviewFormState = {
  error?: string;
  fieldErrors?: {
    body?: string;
    title?: string;
  };
  success?: string;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: number) =>
  Number.isInteger(value) && value >= 0;

const isReviewMediaType = (mediaType: string) =>
  mediaType === MediaType.Movie || mediaType === MediaType.Tv;

const isRatingTarget = (target: RatingTarget) => {
  if (!isPositiveInteger(target.tmdbId)) {
    return false;
  }

  if (
    target.mediaType === MediaType.Movie ||
    target.mediaType === MediaType.Tv
  ) {
    return (
      target.seasonNumber === undefined && target.episodeNumber === undefined
    );
  }

  if (target.mediaType === 'tv_season') {
    return (
      isNonNegativeInteger(target.seasonNumber ?? Number.NaN) &&
      target.episodeNumber === undefined
    );
  }

  return (
    target.mediaType === 'tv_episode' &&
    isNonNegativeInteger(target.seasonNumber ?? Number.NaN) &&
    isPositiveInteger(target.episodeNumber ?? Number.NaN)
  );
};

const normalizeRating = (rating: number) => Math.round(rating * 2) / 2;

const isValidRating = (rating: number) =>
  Number.isFinite(rating) &&
  rating >= 1 &&
  rating <= 10 &&
  normalizeRating(rating) === rating;

const mapReview = (
  review: Awaited<ReturnType<typeof listPublicReviewsForMedia>>[number],
  currentUserId: string | null,
  social: ReviewSocialRow | null
): ReviewView => ({
  body: review.body,
  canEdit: review.user_id === currentUserId,
  createdAt: review.created_at,
  displayName: review.display_name,
  id: review.id,
  privacySetting: review.privacy_setting,
  title: review.title,
  updatedAt: review.updated_at,
  userId: review.user_id,
  username: review.username,
  social,
});

export const getRatingState = async (
  target: RatingTarget
): Promise<RatingStateResult> => {
  if (!isRatingTarget(target)) {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'error',
    };
  }

  try {
    const [session, summary] = await Promise.all([
      getAuthSession(),
      getRatingSummary(target),
    ]);
    const ownRating = session?.user?.id ? await getOwnRating(target) : null;

    return {
      averageRating: summary.average_rating,
      rating: ownRating ? Number(ownRating.rating) : null,
      ratingCount: summary.rating_count,
      status: session?.user?.id ? 'saved' : 'login_required',
    };
  } catch {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'error',
    };
  }
};

export const saveRating = async (
  target: RatingTarget,
  rating: number
): Promise<RatingStateResult> => {
  const nextRating = normalizeRating(rating);

  if (!(isRatingTarget(target) && isValidRating(nextRating))) {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'error',
    };
  }

  const session = await getAuthSession();

  if (!session?.user?.id) {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'login_required',
    };
  }

  try {
    await upsertOwnRating({ ...target, rating: nextRating });
    const summary = await getRatingSummary(target);

    return {
      averageRating: summary.average_rating,
      rating: nextRating,
      ratingCount: summary.rating_count,
      status: 'saved',
    };
  } catch {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'error',
    };
  }
};

export const removeRating = async (
  target: RatingTarget
): Promise<RatingStateResult> => {
  if (!isRatingTarget(target)) {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'error',
    };
  }

  const session = await getAuthSession();

  if (!session?.user?.id) {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'login_required',
    };
  }

  try {
    await deleteOwnRating(target);
    const summary = await getRatingSummary(target);

    return {
      averageRating: summary.average_rating,
      rating: null,
      ratingCount: summary.rating_count,
      status: 'deleted',
    };
  } catch {
    return {
      averageRating: null,
      rating: null,
      ratingCount: 0,
      status: 'error',
    };
  }
};

export const getReviewsState = async (
  tmdbId: number,
  mediaType: MediaType.Movie | MediaType.Tv
): Promise<ReviewsStateResult> => {
  if (!(isPositiveInteger(tmdbId) && isReviewMediaType(mediaType))) {
    return { ownReview: null, reviews: [], status: 'error' };
  }

  try {
    const session = await getAuthSession();
    const currentUserId = session?.user?.id ?? null;
    const [publicReviews, ownReview] = await Promise.all([
      listPublicReviewsForMedia(tmdbId, mediaType),
      currentUserId ? getOwnReview(tmdbId, mediaType) : Promise.resolve(null),
    ]);
    const allReviews = ownReview
      ? [
          ownReview,
          ...publicReviews.filter((review) => review.id !== ownReview.id),
        ]
      : publicReviews;
    const socialRows = await getReviewSocialRows(
      allReviews.map((review) => review.id)
    );
    const getSocial = (reviewId: string) =>
      socialRows.find((row) => row.review_id === reviewId) ?? null;
    const publicViews = publicReviews.map((review) =>
      mapReview(review, currentUserId, getSocial(review.id))
    );
    const ownView = ownReview
      ? mapReview(ownReview, currentUserId, getSocial(ownReview.id))
      : null;
    const reviews = ownView
      ? [ownView, ...publicViews.filter((review) => review.id !== ownView.id)]
      : publicViews;

    return {
      ownReview: ownView,
      reviews,
      status: currentUserId ? 'saved' : 'login_required',
    };
  } catch {
    return { ownReview: null, reviews: [], status: 'error' };
  }
};

const readTextField = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
};

export const saveReview = async (
  _previousState: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> => {
  const tmdbId = Number(readTextField(formData, 'tmdbId'));
  const mediaType = readTextField(formData, 'mediaType');
  const title = readTextField(formData, 'title');
  const body = readTextField(formData, 'body');
  const privacySetting = readTextField(formData, 'privacySetting');

  const fieldErrors: ReviewFormState['fieldErrors'] = {};

  if (title.length > 120) {
    fieldErrors.title = 'Use 120 characters or fewer.';
  }

  if (body.length < 10) {
    fieldErrors.body = 'Write at least 10 characters.';
  } else if (body.length > 2000) {
    fieldErrors.body = 'Use 2000 characters or fewer.';
  }

  if (
    !(
      isPositiveInteger(tmdbId) &&
      isReviewMediaType(mediaType) &&
      Object.values(PrivacySetting).includes(privacySetting as PrivacySetting)
    )
  ) {
    return { error: 'This review could not be saved.' };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const session = await getAuthSession();

  if (!session?.user?.id) {
    return { error: 'Sign in before saving your review.' };
  }

  try {
    await upsertOwnReview({
      body,
      mediaType,
      privacySetting: privacySetting as PrivacySetting,
      title,
      tmdbId,
    });

    return { success: 'Review saved.' };
  } catch {
    return { error: 'Your review could not be saved right now.' };
  }
};

export const removeReview = async (
  tmdbId: number,
  mediaType: MediaType.Movie | MediaType.Tv
): Promise<ReviewsStateResult> => {
  if (!(isPositiveInteger(tmdbId) && isReviewMediaType(mediaType))) {
    return { ownReview: null, reviews: [], status: 'error' };
  }

  const session = await getAuthSession();

  if (!session?.user?.id) {
    return { ownReview: null, reviews: [], status: 'login_required' };
  }

  try {
    await deleteOwnReview(tmdbId, mediaType);

    return getReviewsState(tmdbId, mediaType);
  } catch {
    return { ownReview: null, reviews: [], status: 'error' };
  }
};
