create table if not exists follows (
  follower_user_id text not null references profiles(user_id) on delete cascade,
  following_user_id text not null references profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_user_id, following_user_id),
  constraint follows_no_self_follow_check
    check (follower_user_id <> following_user_id)
);

create index if not exists follows_following_user_id_idx
  on follows (following_user_id);

create index if not exists follows_follower_created_idx
  on follows (follower_user_id, created_at desc);

comment on table follows is
  'Application-authorized follow graph. RLS is intentionally not enabled yet; server helpers scope writes to session.user.id.';
