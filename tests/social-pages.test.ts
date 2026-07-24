/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirements they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  COUNT_VISIBLE_FOLLOWERS_QUERY,
  COUNT_VISIBLE_FOLLOWING_QUERY,
  FOLLOW_PUBLIC_PROFILE_QUERY,
  GET_FOLLOW_COUNTS_QUERY,
  LIST_VISIBLE_FOLLOWERS_QUERY,
  LIST_VISIBLE_FOLLOWING_QUERY,
  UNFOLLOW_PROFILE_QUERY,
} from '../src/lib/services/database/social-queries';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
] as const;

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

const runMigration = async (db: PGliteInterface, name: string) => {
  await db.exec(await read(join('database', 'migrations', name)));
};

const rows = async <Row extends Record<string, unknown>>(
  db: PGliteInterface,
  query: string,
  params: Array<unknown> = []
) => (await db.query<Row>(query, params)).rows;

const insertProfile = async (
  db: PGliteInterface,
  input: {
    displayName: string;
    privacy?: 'private' | 'public';
    userId: string;
    username: string;
  }
) => {
  await db.query(
    `insert into profiles (
      user_id, name, username, display_name, email, bio, privacy_setting
    ) values ($1, $2, $3, $2, $4, $5, $6)`,
    [
      input.userId,
      input.displayName,
      input.username,
      `${input.username}@example.com`,
      `${input.displayName} biography`,
      input.privacy ?? 'public',
    ]
  );
};

test('public profile renders only the UX 3.1 public contract', async () => {
  const [page, feature, tracking, statistics, favorites] = await Promise.all([
    read('src/lib/pages/profile/public-profile.tsx'),
    read('src/lib/features/profile/index.ts'),
    read('src/lib/services/database/tracking.server.ts'),
    read('src/lib/services/database/profile.server.ts'),
    read('src/lib/features/profile/profile-favorites.server.ts'),
  ]);

  for (const required of [
    'profile.display_name',
    'profile.username',
    'profile.bio',
    'FollowButton',
    'following_count',
    'follower_count',
    'Movies Watched',
    'Time Spent Watching Movies',
    'TV Shows Watched',
    'Time Spent Watching TV Shows',
    'Episodes Watched',
    'Favourite Movies',
    'Favourite TV Shows',
  ]) {
    assert.match(page, new RegExp(required.replace('.', '\\.')));
  }

  assert.match(feature, /getPublicProfileByUsername/);
  assert.match(feature, /getPublicProfileStatistics/);
  assert.match(feature, /getPublicProfileFavorites/);
  assert.match(statistics, /profiles\.privacy_setting = 'public'/);
  assert.match(statistics, /media\.privacy_setting = 'public'/);
  assert.match(favorites, /listPublicFavorites/);

  const publicLookup = tracking.slice(
    tracking.indexOf('export const getPublicProfileByUsername'),
    tracking.indexOf('export const upsertOwnProfile')
  );
  assert.doesNotMatch(
    publicLookup,
    /email|auth_accounts|provider_account|verified|password|reset|session_version/
  );
  assert.doesNotMatch(
    page,
    /profile\.user_id|profile\.email|provider|verification|password|security settings|reset state/i
  );
});

test('connection pages provide search, navigation, direct actions, pagination, and explicit states', async () => {
  const [
    connections,
    followButton,
    loader,
    followersLoading,
    followingLoading,
  ] = await Promise.all([
    read('src/lib/pages/profile/connections.tsx'),
    read('src/lib/features/social/follow-button.tsx'),
    read('src/lib/pages/profile/load-connections.server.tsx'),
    read('src/app/profile/[username]/followers/loading.tsx'),
    read('src/app/profile/[username]/following/loading.tsx'),
  ]);

  assert.match(connections, /Search users/);
  assert.match(connections, /Display name or username/);
  assert.match(connections, /Open \$\{displayName\}'s profile/);
  assert.match(connections, /<FollowButton/);
  assert.match(connections, /No \$\{title\.toLowerCase\(\)\} match/);
  assert.match(connections, /has no visible \$\{title\.toLowerCase\(\)\} yet/);
  assert.match(connections, /pagination\.totalPages/);
  assert.match(connections, /Previous/);
  assert.match(connections, /Next/);
  assert.match(loader, /listProfileConnections/);
  assert.match(followButton, /loadingText=/);
  assert.match(followButton, /useEffect/);
  assert.match(followButton, /result\.isFollowing/);
  assert.match(followersLoading, /Loading followers/);
  assert.match(followingLoading, /Loading following/);
});

// biome-ignore lint/style/noDoneCallback: Node's test context provides awaited subtests.
test('PostgreSQL follow graph is authorized by owner input, public-safe, idempotent, and paginated', async (t) => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }

    await insertProfile(db, {
      displayName: 'Alice',
      userId: 'user-alice',
      username: 'alice',
    });
    await insertProfile(db, {
      displayName: 'Bob',
      userId: 'user-bob',
      username: 'bob',
    });
    await insertProfile(db, {
      displayName: 'Private Dana',
      privacy: 'private',
      userId: 'user-dana',
      username: 'dana',
    });
    await insertProfile(db, {
      displayName: 'Empty Erin',
      userId: 'user-erin',
      username: 'erin',
    });

    await t.test(
      'follow, duplicate prevention, self prevention, and counts',
      async () => {
        const first = await rows<{
          created: boolean;
          following_user_id: string;
        }>(db, FOLLOW_PUBLIC_PROFILE_QUERY, ['user-alice', 'bob']);
        const duplicate = await rows<{
          created: boolean;
          following_user_id: string;
        }>(db, FOLLOW_PUBLIC_PROFILE_QUERY, ['user-alice', 'bob']);

        assert.deepEqual(first, [
          { created: true, following_user_id: 'user-bob' },
        ]);
        assert.deepEqual(duplicate, [
          { created: false, following_user_id: 'user-bob' },
        ]);
        assert.deepEqual(
          await rows(db, FOLLOW_PUBLIC_PROFILE_QUERY, ['user-alice', 'alice']),
          []
        );
        assert.deepEqual(
          await rows(db, FOLLOW_PUBLIC_PROFILE_QUERY, ['user-alice', 'dana']),
          []
        );
        await assert.rejects(
          db.query(
            `insert into follows (follower_user_id, following_user_id)
           values ('user-alice', 'user-alice')`
          ),
          /follows_no_self_follow_check/
        );

        const counts = await rows<{
          follower_count: number;
          following_count: number;
        }>(db, GET_FOLLOW_COUNTS_QUERY, ['user-bob']);
        assert.deepEqual(counts, [{ follower_count: 1, following_count: 0 }]);
        assert.deepEqual(
          await rows(db, GET_FOLLOW_COUNTS_QUERY, ['user-alice']),
          [{ follower_count: 0, following_count: 1 }]
        );
      }
    );

    await t.test(
      'followers, following, search, and private-field exclusion',
      async () => {
        await db.query(
          `insert into follows (follower_user_id, following_user_id)
         values ('user-dana', 'user-bob')`
        );

        assert.deepEqual(
          await rows(db, COUNT_VISIBLE_FOLLOWERS_QUERY, ['user-bob', '']),
          [{ total_count: 1 }]
        );
        assert.deepEqual(
          await rows(db, COUNT_VISIBLE_FOLLOWING_QUERY, ['user-alice', 'bo']),
          [{ total_count: 1 }]
        );
        assert.deepEqual(
          await rows(db, COUNT_VISIBLE_FOLLOWING_QUERY, [
            'user-alice',
            'nobody',
          ]),
          [{ total_count: 0 }]
        );
        assert.deepEqual(
          await rows(db, LIST_VISIBLE_FOLLOWING_QUERY, [
            'user-alice',
            'user-alice',
            'nobody',
            24,
            0,
          ]),
          []
        );
        assert.deepEqual(
          await rows(db, LIST_VISIBLE_FOLLOWERS_QUERY, [
            'user-erin',
            'user-alice',
            '',
            24,
            0,
          ]),
          []
        );

        const followers = await rows(db, LIST_VISIBLE_FOLLOWERS_QUERY, [
          'user-bob',
          'user-alice',
          'ali',
          24,
          0,
        ]);
        const following = await rows(db, LIST_VISIBLE_FOLLOWING_QUERY, [
          'user-alice',
          'user-alice',
          'bob',
          24,
          0,
        ]);

        assert.deepEqual(followers, [
          {
            display_name: 'Alice',
            is_current_user: true,
            is_following: false,
            username: 'alice',
          },
        ]);
        assert.deepEqual(following, [
          {
            display_name: 'Bob',
            is_current_user: false,
            is_following: true,
            username: 'bob',
          },
        ]);
        for (const item of [...followers, ...following]) {
          assert.deepEqual(Object.keys(item).toSorted(), [
            'display_name',
            'is_current_user',
            'is_following',
            'username',
          ]);
        }
      }
    );

    await t.test(
      'large lists paginate without changing row content',
      async () => {
        for (let index = 0; index < 25; index += 1) {
          const suffix = String(index).padStart(2, '0');
          await insertProfile(db, {
            displayName: `Follower ${suffix}`,
            userId: `user-follower-${suffix}`,
            username: `follower_${suffix}`,
          });
          await db.query(
            `insert into follows (follower_user_id, following_user_id)
           values ($1, 'user-bob')`,
            [`user-follower-${suffix}`]
          );
        }

        assert.deepEqual(
          await rows(db, COUNT_VISIBLE_FOLLOWERS_QUERY, ['user-bob', '']),
          [{ total_count: 26 }]
        );
        assert.equal(
          (
            await rows(db, LIST_VISIBLE_FOLLOWERS_QUERY, [
              'user-bob',
              'user-alice',
              '',
              24,
              0,
            ])
          ).length,
          24
        );
        assert.equal(
          (
            await rows(db, LIST_VISIBLE_FOLLOWERS_QUERY, [
              'user-bob',
              'user-alice',
              '',
              24,
              24,
            ])
          ).length,
          2
        );
      }
    );

    await t.test('unfollow is idempotent', async () => {
      assert.equal(
        (await rows(db, UNFOLLOW_PROFILE_QUERY, ['user-alice', 'bob'])).length,
        1
      );
      assert.deepEqual(
        await rows(db, UNFOLLOW_PROFILE_QUERY, ['user-alice', 'bob']),
        []
      );
      assert.deepEqual(
        await rows(db, GET_FOLLOW_COUNTS_QUERY, ['user-alice']),
        [{ follower_count: 0, following_count: 0 }]
      );
    });
  } finally {
    await db.close();
  }
});

test('follow server actions derive authorization from the session and accept no owner id', async () => {
  const [database, actions] = await Promise.all([
    read('src/lib/services/database/social.server.ts'),
    read('src/lib/features/social/actions.ts'),
  ]);
  const followHelper = database.slice(
    database.indexOf('export const followPublicProfile'),
    database.indexOf('export const unfollowProfile')
  );
  const unfollowHelper = database.slice(
    database.indexOf('export const unfollowProfile')
  );

  assert.match(followHelper, /getAuthenticatedUserId\(\)/);
  assert.match(unfollowHelper, /getAuthenticatedUserId\(\)/);
  assert.doesNotMatch(followHelper, /followerUserId:/);
  assert.doesNotMatch(unfollowHelper, /followerUserId:/);
  assert.match(actions, /Sign in to follow profiles/);
  assert.doesNotMatch(actions, /revalidatePath/);
});
