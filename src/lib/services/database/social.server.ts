import 'server-only';

import type {
  PrivacySetting,
  TrackableMediaType,
  WatchStatus,
} from 'lib/types';

import { getDatabaseSql } from './core.server';
import {
  COUNT_VISIBLE_FOLLOWERS_QUERY,
  COUNT_VISIBLE_FOLLOWING_QUERY,
  FOLLOW_PUBLIC_PROFILE_QUERY,
  GET_FOLLOW_COUNTS_QUERY,
  GET_FOLLOWING_STATE_QUERY,
  GET_SOCIAL_PROFILE_QUERY,
  LIST_VISIBLE_FOLLOWERS_QUERY,
  LIST_VISIBLE_FOLLOWING_QUERY,
  UNFOLLOW_PROFILE_QUERY,
} from './social-queries';
import { getAuthenticatedUserId } from './tracking.server';

export type SocialProfileSummary = {
  display_name: string;
  username: string;
};

export type SocialProfileListRow = SocialProfileSummary & {
  is_current_user: boolean;
  is_following: boolean;
};

export type SocialProfileList = {
  isOwnProfile: boolean;
  items: Array<SocialProfileListRow>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  profile: SocialProfileSummary;
};

export type FollowCountsRow = {
  follower_count: number;
  following_count: number;
};

export type FollowState = FollowCountsRow & {
  is_following: boolean;
};

type SocialProfileRecord = {
  bio: string;
  display_name: string;
  privacy_setting: PrivacySetting;
  user_id: string;
  username: string;
};

export type ActivitySource =
  | 'episode_progress'
  | 'rating'
  | 'review'
  | 'watch_status'
  | 'watchlist';

export type ActivityRow = {
  activity_at: string;
  activity_type: ActivitySource;
  display_name: string;
  episode_number: number | null;
  media_type: TrackableMediaType;
  rating: number | null;
  review_id: string | null;
  season_number: number | null;
  tmdb_id: number;
  user_id: string;
  username: string;
  watch_status: WatchStatus | null;
};

export type ReviewCommentRow = {
  body: string;
  can_delete: boolean;
  created_at: string;
  display_name: string;
  id: string;
  review_id: string;
  user_id: string;
  username: string;
};

export type ReviewSocialRow = {
  comment_count: number;
  comments: Array<ReviewCommentRow>;
  liked_by_current_user: boolean;
  like_count: number;
  review_id: string;
};

export type RecommendationRow = {
  created_at: string;
  display_name: string;
  id: string;
  media_type: TrackableMediaType;
  note: string;
  sender_user_id: string;
  tmdb_id: number;
  username: string;
};

const CONNECTION_PAGE_SIZE = 24;

export const getFollowStateForProfile = async (
  profileUserId: string
): Promise<FollowState> => {
  const sql = getDatabaseSql();
  let currentUserId: null | string = null;

  try {
    currentUserId = await getAuthenticatedUserId();
  } catch {
    currentUserId = null;
  }

  const [rawCountRows, rawStateRows] = await Promise.all([
    sql.query(GET_FOLLOW_COUNTS_QUERY, [profileUserId]),
    currentUserId
      ? sql.query(GET_FOLLOWING_STATE_QUERY, [currentUserId, profileUserId])
      : Promise.resolve([]),
  ]);
  const countRows = rawCountRows as Array<FollowCountsRow>;
  const stateRows = rawStateRows as Array<{ is_following: boolean }>;

  return {
    follower_count: countRows.at(0)?.follower_count ?? 0,
    following_count: countRows.at(0)?.following_count ?? 0,
    is_following: Boolean(stateRows.at(0)?.is_following),
  };
};

export const listProfileConnections = async (input: {
  kind: 'followers' | 'following';
  page?: number;
  search?: string;
  username: string;
}): Promise<SocialProfileList | null> => {
  const sql = getDatabaseSql();
  let currentUserId: null | string = null;

  try {
    currentUserId = await getAuthenticatedUserId();
  } catch {
    currentUserId = null;
  }

  const profiles = (await sql.query(GET_SOCIAL_PROFILE_QUERY, [
    input.username.normalize('NFKC').trim().toLowerCase(),
    currentUserId,
  ])) as Array<SocialProfileSummary & { user_id: string }>;
  const profile = profiles.at(0);

  if (!profile) {
    return null;
  }

  const search =
    input.search?.normalize('NFKC').trim().toLowerCase().slice(0, 80) ?? '';
  const countQuery =
    input.kind === 'followers'
      ? COUNT_VISIBLE_FOLLOWERS_QUERY
      : COUNT_VISIBLE_FOLLOWING_QUERY;
  const listQuery =
    input.kind === 'followers'
      ? LIST_VISIBLE_FOLLOWERS_QUERY
      : LIST_VISIBLE_FOLLOWING_QUERY;
  const countRows = (await sql.query(countQuery, [
    profile.user_id,
    search,
  ])) as Array<{ total_count: number }>;
  const totalItems = countRows.at(0)?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / CONNECTION_PAGE_SIZE));
  const requestedPage =
    typeof input.page === 'number' && Number.isSafeInteger(input.page)
      ? input.page
      : 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const items = (await sql.query(listQuery, [
    profile.user_id,
    currentUserId,
    search,
    CONNECTION_PAGE_SIZE,
    (page - 1) * CONNECTION_PAGE_SIZE,
  ])) as Array<SocialProfileListRow>;

  return {
    isOwnProfile: currentUserId === profile.user_id,
    items,
    pagination: {
      page,
      pageSize: CONNECTION_PAGE_SIZE,
      totalItems,
      totalPages,
    },
    profile: {
      display_name: profile.display_name,
      username: profile.username,
    },
  };
};

export const followPublicProfile = async (followingUsername: string) => {
  const followerUserId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();
  const normalizedUsername = followingUsername
    .normalize('NFKC')
    .trim()
    .toLowerCase();
  const rows = (await sql.query(FOLLOW_PUBLIC_PROFILE_QUERY, [
    followerUserId,
    normalizedUsername,
  ])) as Array<{ created: boolean; following_user_id: string }>;

  if (rows.length === 0) {
    throw new Error('This public profile is unavailable.');
  }

  return rows[0];
};

export const unfollowProfile = async (followingUsername: string) => {
  const followerUserId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql.query(UNFOLLOW_PROFILE_QUERY, [
    followerUserId,
    followingUsername.normalize('NFKC').trim().toLowerCase(),
  ]);
};

export const listFollowedActivity = async (limit = 40) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    with followed_public_profiles as (
      select profiles.user_id, profiles.username, profiles.display_name
      from follows
      inner join profiles on profiles.user_id = follows.following_user_id
      where follows.follower_user_id = ${userId}
        and profiles.privacy_setting = 'public'
    ),
    activity as (
      select user_media.user_id, user_media.tmdb_id, user_media.media_type,
        user_media.updated_at as activity_at, 'watch_status' as activity_type,
        user_media.watch_status, null::numeric as rating, null::uuid as review_id,
        null::integer as season_number, null::integer as episode_number
      from user_media
      inner join followed_public_profiles on followed_public_profiles.user_id = user_media.user_id
      where user_media.privacy_setting = 'public'
        and user_media.watch_status <> 'planned'

      union all

      select watchlist_items.user_id, watchlist_items.tmdb_id, watchlist_items.media_type,
        watchlist_items.created_at as activity_at, 'watchlist' as activity_type,
        null::text as watch_status, null::numeric as rating, null::uuid as review_id,
        null::integer as season_number, null::integer as episode_number
      from watchlist_items
      inner join followed_public_profiles on followed_public_profiles.user_id = watchlist_items.user_id

      union all

      select ratings.user_id, ratings.tmdb_id,
        case when ratings.media_type in ('tv_season', 'tv_episode') then 'tv' else ratings.media_type end as media_type,
        ratings.updated_at as activity_at, 'rating' as activity_type,
        null::text as watch_status, ratings.rating, null::uuid as review_id,
        nullif(ratings.season_number, -1) as season_number,
        nullif(ratings.episode_number, -1) as episode_number
      from ratings
      inner join followed_public_profiles on followed_public_profiles.user_id = ratings.user_id

      union all

      select reviews.user_id, reviews.tmdb_id, reviews.media_type,
        reviews.updated_at as activity_at, 'review' as activity_type,
        null::text as watch_status, null::numeric as rating, reviews.id as review_id,
        null::integer as season_number, null::integer as episode_number
      from reviews
      inner join followed_public_profiles on followed_public_profiles.user_id = reviews.user_id
      where reviews.privacy_setting = 'public'

      union all

      select episode_progress.user_id, episode_progress.tmdb_show_id as tmdb_id, 'tv' as media_type,
        episode_progress.updated_at as activity_at, 'episode_progress' as activity_type,
        null::text as watch_status, null::numeric as rating, null::uuid as review_id,
        episode_progress.season_number, episode_progress.episode_number
      from episode_progress
      inner join followed_public_profiles on followed_public_profiles.user_id = episode_progress.user_id
      where episode_progress.watched = true
    )
    select activity.user_id, followed_public_profiles.username, followed_public_profiles.display_name,
      activity.tmdb_id, activity.media_type, activity.activity_at, activity.activity_type,
      activity.watch_status, activity.rating::float as rating, activity.review_id,
      activity.season_number, activity.episode_number
    from activity
    inner join followed_public_profiles on followed_public_profiles.user_id = activity.user_id
    order by activity.activity_at desc
    limit ${limit}
  `) as Array<ActivityRow>;
};

export const setReviewLike = async (reviewId: string, liked: boolean) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  if (liked) {
    return sql`
      insert into review_reactions (review_id, user_id, reaction_type)
      select reviews.id, ${userId}, 'like'
      from reviews
      inner join profiles on profiles.user_id = reviews.user_id
      where reviews.id = ${reviewId}
        and reviews.privacy_setting = 'public'
        and profiles.privacy_setting = 'public'
      on conflict (review_id, user_id) do nothing
      returning review_id
    `;
  }

  return sql`
    delete from review_reactions
    where review_id = ${reviewId}
      and user_id = ${userId}
    returning review_id
  `;
};

export const addReviewComment = async (reviewId: string, body: string) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    insert into review_comments (review_id, user_id, body)
    select reviews.id, ${userId}, ${body}
    from reviews
    inner join profiles on profiles.user_id = reviews.user_id
    where reviews.id = ${reviewId}
      and reviews.privacy_setting = 'public'
      and profiles.privacy_setting = 'public'
    returning id
  `;
};

export const deleteOwnReviewComment = async (commentId: string) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    delete from review_comments
    where id = ${commentId}
      and user_id = ${userId}
    returning id
  `;
};

export const getReviewSocialRows = async (reviewIds: Array<string>) => {
  if (reviewIds.length === 0) {
    return [] as Array<ReviewSocialRow>;
  }

  const sql = getDatabaseSql();
  let currentUserId: null | string = null;

  try {
    currentUserId = await getAuthenticatedUserId();
  } catch {
    currentUserId = null;
  }

  const rows = (await sql`
    select
      reviews.id as review_id,
      count(distinct review_reactions.user_id)::int as like_count,
      count(distinct review_comments.id)::int as comment_count,
      bool_or(review_reactions.user_id = ${currentUserId}) as liked_by_current_user
    from reviews
    left join review_reactions on review_reactions.review_id = reviews.id
    left join review_comments on review_comments.review_id = reviews.id
    where reviews.id = any(${reviewIds})
    group by reviews.id
  `) as Array<Omit<ReviewSocialRow, 'comments'> & { comments?: never }>;

  const comments = (await sql`
    select review_comments.id, review_comments.review_id, review_comments.user_id,
      profiles.username, profiles.display_name, review_comments.body, review_comments.created_at,
      (review_comments.user_id = ${currentUserId}) as can_delete
    from review_comments
    inner join profiles on profiles.user_id = review_comments.user_id
    where review_comments.review_id = any(${reviewIds})
      and profiles.privacy_setting = 'public'
    order by review_comments.created_at asc
  `) as Array<ReviewCommentRow>;

  return rows.map((row) => ({
    ...row,
    comments: comments.filter((comment) => comment.review_id === row.review_id),
    liked_by_current_user: Boolean(row.liked_by_current_user),
  }));
};

export const listFollowedProfilesForRecommendations = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select profiles.user_id, profiles.username, profiles.display_name, profiles.bio, profiles.privacy_setting
    from follows
    inner join profiles on profiles.user_id = follows.following_user_id
    where follows.follower_user_id = ${userId}
      and profiles.privacy_setting = 'public'
    order by profiles.display_name asc
  `) as Array<SocialProfileRecord>;
};

export const createRecommendation = async ({
  mediaType,
  note,
  receiverUserId,
  tmdbId,
}: {
  mediaType: TrackableMediaType;
  note: string;
  receiverUserId: string;
  tmdbId: number;
}) => {
  const senderUserId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    insert into user_recommendations (
      sender_user_id,
      receiver_user_id,
      tmdb_id,
      media_type,
      note
    )
    select ${senderUserId}, profiles.user_id, ${tmdbId}, ${mediaType}, ${note}
    from profiles
    inner join follows on follows.following_user_id = profiles.user_id
    where profiles.user_id = ${receiverUserId}
      and profiles.privacy_setting = 'public'
      and follows.follower_user_id = ${senderUserId}
    on conflict (sender_user_id, receiver_user_id, tmdb_id, media_type) do update set
      note = excluded.note,
      dismissed_at = null,
      created_at = now()
    returning id
  `;
};

export const listReceivedRecommendations = async () => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return (await sql`
    select user_recommendations.id, user_recommendations.sender_user_id,
      profiles.username, profiles.display_name, user_recommendations.tmdb_id,
      user_recommendations.media_type, user_recommendations.note,
      user_recommendations.created_at
    from user_recommendations
    inner join profiles on profiles.user_id = user_recommendations.sender_user_id
    where user_recommendations.receiver_user_id = ${userId}
      and user_recommendations.dismissed_at is null
      and profiles.privacy_setting = 'public'
    order by user_recommendations.created_at desc
  `) as Array<RecommendationRow>;
};

export const dismissRecommendation = async (recommendationId: string) => {
  const userId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    update user_recommendations
    set dismissed_at = now()
    where id = ${recommendationId}
      and receiver_user_id = ${userId}
    returning id
  `;
};
