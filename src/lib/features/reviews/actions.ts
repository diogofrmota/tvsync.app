'use server';

import { getAuthSession } from 'lib/services/auth/session.server';
import {
  deleteOwnRating,
  getOwnRating,
  getRatingSummary,
  upsertOwnRating,
} from 'lib/services/database/tracking.server';
import { MediaType, type RatingTarget } from 'lib/types';

type ActionStatus = 'deleted' | 'error' | 'login_required' | 'saved';

export type RatingStateResult = {
  averageRating: number | null;
  rating: number | null;
  ratingCount: number;
  status: ActionStatus;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: number) =>
  Number.isInteger(value) && value >= 0;

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
