import 'server-only';

import type {
  PrivacySetting,
  TrackableMediaType,
  WatchStatus,
} from 'lib/types';

import { getDatabaseSql } from './core.server';
import { getAuthenticatedUserId } from './tracking.server';

export type SocialProfileRow = {
  bio: string;
  display_name: string;
  privacy_setting: PrivacySetting;
  user_id: string;
  username: string;
};

export type FollowCountsRow = {
  follower_count: number;
  following_count: number;
};

export type FollowState = FollowCountsRow & {
  followers: Array<SocialProfileRow>;
  following: Array<SocialProfileRow>;
  is_following: boolean;
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

const PUBLIC_PROFILE_LIMIT = 24;

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

  const countRows = (await sql`
    select
      (select count(*)::int from follows where following_user_id = ${profileUserId}) as follower_count,
      (select count(*)::int from follows where follower_user_id = ${profileUserId}) as following_count
  `) as Array<FollowCountsRow>;
  const followingRows = (await sql`
    select profiles.user_id, profiles.username, profiles.display_name, profiles.bio, profiles.privacy_setting
    from follows
    inner join profiles on profiles.user_id = follows.following_user_id
    where follows.follower_user_id = ${profileUserId}
      and profiles.privacy_setting = 'public'
    order by follows.created_at desc
    limit ${PUBLIC_PROFILE_LIMIT}
  `) as Array<SocialProfileRow>;
  const followerRows = (await sql`
    select profiles.user_id, profiles.username, profiles.display_name, profiles.bio, profiles.privacy_setting
    from follows
    inner join profiles on profiles.user_id = follows.follower_user_id
    where follows.following_user_id = ${profileUserId}
      and profiles.privacy_setting = 'public'
    order by follows.created_at desc
    limit ${PUBLIC_PROFILE_LIMIT}
  `) as Array<SocialProfileRow>;
  const stateRows = currentUserId
    ? ((await sql`
        select 1 as is_following
        from follows
        where follower_user_id = ${currentUserId}
          and following_user_id = ${profileUserId}
        limit 1
      `) as Array<{ is_following: number }>)
    : [];

  return {
    follower_count: countRows.at(0)?.follower_count ?? 0,
    following_count: countRows.at(0)?.following_count ?? 0,
    followers: followerRows,
    following: followingRows,
    is_following: stateRows.length > 0,
  };
};

export const followPublicProfile = async (followingUserId: string) => {
  const followerUserId = await getAuthenticatedUserId();

  if (followerUserId === followingUserId) {
    throw new Error('Users cannot follow themselves.');
  }

  const sql = getDatabaseSql();
  const rows = (await sql`
    insert into follows (follower_user_id, following_user_id)
    select ${followerUserId}, profiles.user_id
    from profiles
    where profiles.user_id = ${followingUserId}
      and profiles.privacy_setting = 'public'
    on conflict (follower_user_id, following_user_id) do nothing
    returning following_user_id
  `) as Array<{ following_user_id: string }>;

  if (rows.length === 0) {
    const existingRows = (await sql`
      select user_id
      from profiles
      where user_id = ${followingUserId}
        and privacy_setting = 'public'
      limit 1
    `) as Array<{ user_id: string }>;

    if (existingRows.length === 0) {
      throw new Error('Only public profiles can be followed.');
    }
  }

  return rows.at(0) ?? null;
};

export const unfollowProfile = async (followingUserId: string) => {
  const followerUserId = await getAuthenticatedUserId();
  const sql = getDatabaseSql();

  return sql`
    delete from follows
    where follower_user_id = ${followerUserId}
      and following_user_id = ${followingUserId}
    returning following_user_id
  `;
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
  `) as Array<SocialProfileRow>;
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
