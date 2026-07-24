import 'server-only';

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
