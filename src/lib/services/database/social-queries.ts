export const GET_FOLLOW_COUNTS_QUERY = `
  select
    (
      select count(*)::int
      from follows
      inner join profiles on profiles.user_id = follows.follower_user_id
      where follows.following_user_id = $1
        and profiles.privacy_setting = 'public'
    ) as follower_count,
    (
      select count(*)::int
      from follows
      inner join profiles on profiles.user_id = follows.following_user_id
      where follows.follower_user_id = $1
        and profiles.privacy_setting = 'public'
    ) as following_count
`;

export const GET_FOLLOWING_STATE_QUERY = `
  select exists (
    select 1
    from follows
    where follower_user_id = $1
      and following_user_id = $2
  ) as is_following
`;

export const GET_SOCIAL_PROFILE_QUERY = `
  select user_id, username, display_name
  from profiles
  where lower(btrim(username)) = $1
    and (privacy_setting = 'public' or user_id = $2)
  limit 1
`;

export const COUNT_VISIBLE_FOLLOWERS_QUERY = `
  select count(*)::int as total_count
  from follows relationship
  inner join profiles connection
    on connection.user_id = relationship.follower_user_id
  where relationship.following_user_id = $1
    and connection.privacy_setting = 'public'
    and (
      $2 = ''
      or position($2 in lower(connection.username)) > 0
      or position($2 in lower(connection.display_name)) > 0
    )
`;

export const COUNT_VISIBLE_FOLLOWING_QUERY = `
  select count(*)::int as total_count
  from follows relationship
  inner join profiles connection
    on connection.user_id = relationship.following_user_id
  where relationship.follower_user_id = $1
    and connection.privacy_setting = 'public'
    and (
      $2 = ''
      or position($2 in lower(connection.username)) > 0
      or position($2 in lower(connection.display_name)) > 0
    )
`;

export const LIST_VISIBLE_FOLLOWERS_QUERY = `
  select connection.username, connection.display_name,
    (connection.user_id = $2) as is_current_user,
    exists (
      select 1 from follows current_follow
      where current_follow.follower_user_id = $2
        and current_follow.following_user_id = connection.user_id
    ) as is_following
  from follows relationship
  inner join profiles connection
    on connection.user_id = relationship.follower_user_id
  where relationship.following_user_id = $1
    and connection.privacy_setting = 'public'
    and (
      $3 = ''
      or position($3 in lower(connection.username)) > 0
      or position($3 in lower(connection.display_name)) > 0
    )
  order by connection.display_name asc, connection.username asc
  limit $4 offset $5
`;

export const LIST_VISIBLE_FOLLOWING_QUERY = `
  select connection.username, connection.display_name,
    (connection.user_id = $2) as is_current_user,
    exists (
      select 1 from follows current_follow
      where current_follow.follower_user_id = $2
        and current_follow.following_user_id = connection.user_id
    ) as is_following
  from follows relationship
  inner join profiles connection
    on connection.user_id = relationship.following_user_id
  where relationship.follower_user_id = $1
    and connection.privacy_setting = 'public'
    and (
      $3 = ''
      or position($3 in lower(connection.username)) > 0
      or position($3 in lower(connection.display_name)) > 0
    )
  order by connection.display_name asc, connection.username asc
  limit $4 offset $5
`;

export const FOLLOW_PUBLIC_PROFILE_QUERY = `
  with target as (
    select user_id
    from profiles
    where lower(btrim(username)) = $2
      and privacy_setting = 'public'
      and user_id <> $1
    limit 1
  ), inserted as (
    insert into follows (follower_user_id, following_user_id)
    select $1, target.user_id
    from target
    on conflict (follower_user_id, following_user_id) do nothing
    returning following_user_id
  )
  select target.user_id as following_user_id,
    exists (select 1 from inserted) as created
  from target
`;

export const UNFOLLOW_PROFILE_QUERY = `
  delete from follows
  using profiles
  where follows.follower_user_id = $1
    and follows.following_user_id = profiles.user_id
    and lower(btrim(profiles.username)) = $2
  returning follows.following_user_id
`;
