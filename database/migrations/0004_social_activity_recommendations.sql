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

create table if not exists review_reactions (
  review_id uuid not null references reviews(id) on delete cascade,
  user_id text not null references profiles(user_id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (review_id, user_id),
  constraint review_reactions_type_check
    check (reaction_type = 'like')
);

create index if not exists review_reactions_user_id_idx
  on review_reactions (user_id);

create table if not exists review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  user_id text not null references profiles(user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_comments_body_not_blank_check
    check (length(trim(body)) > 0)
);

create index if not exists review_comments_review_created_idx
  on review_comments (review_id, created_at asc);

create index if not exists review_comments_user_id_idx
  on review_comments (user_id);

create table if not exists user_recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_user_id text not null references profiles(user_id) on delete cascade,
  receiver_user_id text not null references profiles(user_id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  note text not null default '',
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_recommendations_tmdb_id_positive_check
    check (tmdb_id > 0),
  constraint user_recommendations_media_type_check
    check (media_type in ('movie', 'tv')),
  constraint user_recommendations_not_self_check
    check (sender_user_id <> receiver_user_id),
  constraint user_recommendations_unique_active
    unique (sender_user_id, receiver_user_id, tmdb_id, media_type)
);

create index if not exists user_recommendations_receiver_created_idx
  on user_recommendations (receiver_user_id, dismissed_at, created_at desc);

create index if not exists user_recommendations_sender_idx
  on user_recommendations (sender_user_id);

comment on table follows is
  'Application-authorized follow graph. RLS is intentionally not enabled yet; server helpers scope writes to session.user.id.';

comment on table review_reactions is
  'Application-authorized review likes. The primary key prevents duplicate likes per user.';

comment on table review_comments is
  'Application-authorized review comments. Users may delete only their own comments through server helpers.';

comment on table user_recommendations is
  'Application-authorized cross-user recommendations. Receivers can dismiss recommendations.';
