/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the UX requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  calculateProfileStatistics,
  formatWatchTime,
  getEpisodeRuntimeKey,
} from '../src/lib/features/profile/profile-statistics';
import {
  hashPasswordCore,
  verifyPasswordCore,
} from '../src/lib/services/auth/password-core';
import {
  digestAuthToken,
  isRecentAuthentication,
  RECENT_AUTH_MAX_AGE_MS,
} from '../src/lib/services/auth/security';
import {
  CONSUME_EMAIL_CHANGE_TOKEN_QUERY,
  DELETE_OWN_ACCOUNT_QUERY,
  INSERT_EMAIL_CHANGE_TOKEN_QUERY,
  LIST_OWN_FAVORITES_QUERY,
  SET_OWN_PASSWORD_QUERY,
  UPDATE_OWN_PROFILE_DETAILS_QUERY,
  UPSERT_OWN_FAVORITE_QUERY,
} from '../src/lib/services/database/profile-queries';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
  '0005_auth_lifecycle.sql',
  '0006_unify_library_membership.sql',
  '0007_reconcile_tv_progress_library.sql',
  '0008_profile_experience.sql',
  '0009_reviews_and_public_profiles.sql',
  '0014_profile_backdrops.sql',
  '0015_profile_avatar.sql',
] as const;

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

const assertProfileHeaderOrder = (profile: string) => {
  const actionsIndex = profile.indexOf('<ProfileHeaderActions');
  const bioIndex = profile.indexOf('{profile.bio}');

  assert.ok(actionsIndex !== -1, 'Profile renders share and settings actions');
  assert.ok(bioIndex !== -1, 'Profile renders the biography');
  assert.ok(actionsIndex < bioIndex, 'Profile actions lead the identity block');
  assert.doesNotMatch(profile, /<PageHeading|Edit Profile|<LogoutButton/);
};

const runMigration = async (db: PGliteInterface, name: string) => {
  await db.exec(
    await read(join('database', 'migrations', name).replaceAll('\\', '/'))
  );
};

const getRows = async <Row extends Record<string, unknown>>(
  db: PGliteInterface,
  query: string,
  params: Array<unknown> = []
) => (await db.query<Row>(query, params)).rows;

const insertProfile = async (
  db: PGliteInterface,
  input: { email: string; userId: string; username: string }
) => {
  await db.query(
    `insert into profiles (
      user_id, name, username, display_name, email, privacy_setting,
      email_verified_at
    ) values ($1, $2, $2, $2, $3, 'public', now())`,
    [input.userId, input.username, input.email]
  );
};

test('canonical profile statistics count finished content once and never fabricate runtime', () => {
  const firstEpisode = {
    episode_number: 1,
    season_number: 1,
    tmdb_show_id: 20,
    watched: true,
  };
  const secondEpisode = {
    episode_number: 2,
    season_number: 1,
    tmdb_show_id: 20,
    watched: true,
  };
  const statistics = calculateProfileStatistics({
    episodeRuntimeByKey: new Map([
      [getEpisodeRuntimeKey(firstEpisode), 45],
      [getEpisodeRuntimeKey(secondEpisode), null],
    ]),
    mediaRows: [
      { media_type: 'movie', tmdb_id: 10, watch_status: 'watched' },
      { media_type: 'movie', tmdb_id: 10, watch_status: 'watched' },
      { media_type: 'movie', tmdb_id: 11, watch_status: 'watched' },
      { media_type: 'movie', tmdb_id: 12, watch_status: 'planned' },
      { media_type: 'tv', tmdb_id: 20, watch_status: 'completed' },
      { media_type: 'tv', tmdb_id: 21, watch_status: 'watching' },
    ],
    movieRuntimeByTmdbId: new Map([
      [10, 120],
      [11, 0],
    ]),
    progressRows: [firstEpisode, firstEpisode, secondEpisode],
  });

  assert.deepEqual(statistics, {
    episodesWatched: 2,
    missingMovieRuntimeCount: 1,
    missingTvRuntimeCount: 1,
    movieMinutesWatched: 120,
    moviesWatched: 2,
    reviewsWritten: 0,
    tvMinutesWatched: 45,
    tvShowsWatched: 1,
  });
  assert.equal(formatWatchTime(statistics.movieMinutesWatched), '2h');
  assert.equal(formatWatchTime(statistics.tvMinutesWatched), '45m');
});

test('recent authentication has a fixed window that refresh callbacks cannot extend', () => {
  const now = Date.parse('2026-07-22T12:00:00.000Z');

  assert.equal(isRecentAuthentication(now, now), true);
  assert.equal(isRecentAuthentication(now - RECENT_AUTH_MAX_AGE_MS, now), true);
  assert.equal(
    isRecentAuthentication(now - RECENT_AUTH_MAX_AGE_MS - 1, now),
    false
  );
  assert.equal(isRecentAuthentication(now + 1, now), false);
});

test('Profile renders exact information, social navigation, non-scrolling stats, and favourites', async () => {
  const [
    page,
    profileRoute,
    rail,
    movieDetail,
    tvDetail,
    detailActions,
    statisticsPage,
    settingsPage,
    headerActions,
  ] = await Promise.all([
    read('src/lib/pages/profile/index.tsx'),
    read('src/app/profile/page.tsx'),
    read('src/lib/components/profile/ProfileStatRail.tsx'),
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/features/library/media-detail-actions.tsx'),
    read('src/lib/pages/profile/statistics.tsx'),
    read('src/lib/pages/profile/settings.tsx'),
    read('src/lib/pages/profile/profile-header-actions.tsx'),
  ]);

  for (const label of [
    'Following',
    'Followers',
    'Favourite Movies',
    'Favourite TV Shows',
  ]) {
    assert.match(page, new RegExp(label));
  }

  // Four compact counters sit together in the profile Statistics section.
  assert.match(page, /title="Statistics"/);
  assert.match(
    page,
    /<ProfileStatRail cards=\{getProfileStatCards\(statistics\)\} \/>/
  );
  for (const label of [
    'TV Shows Finished',
    'Movies Finished',
    'Total Watch Time',
    'Number of Reviews',
  ]) {
    assert.match(statisticsPage, new RegExp(label));
  }

  for (const label of [
    'Movies Finished',
    'TV Shows Finished',
    'Total Watch Time',
    'Number of Reviews',
  ]) {
    assert.match(statisticsPage, new RegExp(label));
  }

  assert.match(page, /<ProfileHeaderActions \/>/);
  assert.match(page, /\/following/);
  assert.match(page, /\/followers/);
  assert.match(headerActions, /aria-label="Profile settings"/);
  assert.doesNotMatch(
    headerActions,
    /Share profile|View statistics|FiShare2|FiBarChart2/
  );
  assert.match(statisticsPage, /Compare with Following/);
  assert.match(statisticsPage, /compare=statistics/);
  assert.doesNotMatch(page, /You have not added a biography yet\./);
  // ProfileStatRail renders react-icons via the Chakra <Icon as={...}> prop.
  // Chakra's Icon is a client component, so the rail must also be a client
  // component; otherwise the icon function crosses the RSC server/client
  // boundary and the whole Profile page crashes at request time.
  assert.match(rail, /^'use client';/);
  assert.doesNotMatch(rail, /overflowX="auto"/);
  assert.doesNotMatch(rail, /scrollSnapType/);
  assert.match(rail, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(profileRoute, /getOwnProfileStatistics/);
  assert.match(profileRoute, /getOwnProfileFavorites/);
  assert.match(movieDetail, /<MediaDetailActions/);
  assert.match(tvDetail, /<MediaDetailActions/);
  assert.match(detailActions, /Mark as Favourite/);
  assert.match(detailActions, /Remove from Favourites/);
  assert.match(detailActions, /aria-pressed=\{favorite\}/);
  assert.doesNotMatch(page, /Favorite genres|Achievements|Streaks/);
  assert.doesNotMatch(page, /Profile Information|Social Information/);
  assert.doesNotMatch(page, /LogoutButton/);
  assert.match(settingsPage, /LogoutButton/);
});

test('Profile avatar is a circular poster picked in search, never an upload', async () => {
  const [page, avatar, picker, publicProfile, actions, migration] =
    await Promise.all([
      read('src/lib/pages/profile/index.tsx'),
      read('src/lib/components/profile/ProfileAvatarImage.tsx'),
      read('src/lib/pages/profile/profile-avatar-picker.tsx'),
      read('src/lib/pages/profile/public-profile.tsx'),
      read('src/lib/pages/profile/actions.ts'),
      read('database/migrations/0015_profile_avatar.sql'),
    ]);

  // The avatar sits above the name, and it is a circle.
  const avatarIndex = page.indexOf('<ProfileAvatarPicker');
  const nameIndex = page.indexOf('{displayName}');

  assert.ok(avatarIndex !== -1, 'Profile renders the avatar picker');
  assert.ok(avatarIndex < nameIndex, 'The avatar sits above the display name');
  assert.match(avatar, /borderRadius="full"/);
  assert.match(avatar, /getProfileInitials/);
  assert.match(publicProfile, /<ProfileAvatarImage/);

  // The picture comes from a title found in search, and the picker saves the
  // TMDB poster path only — there is no file input and no object storage.
  assert.match(picker, /useSearchResults/);
  assert.match(picker, /Search shows and films/);
  assert.match(picker, /updateOwnProfileAvatarSelection/);
  assert.match(picker, /Remove avatar/);
  for (const source of [page, avatar, picker, actions]) {
    assert.doesNotMatch(source, /type="file"|FormData\(\).*file|uploadAvatar/);
  }
  assert.match(actions, /TMDB_IMAGE_PATH_PATTERN\.test\(posterPath\)/);

  // The horizontal profile poster it replaces is gone, column and all.
  assert.doesNotMatch(page, /profile_backdrop_path|aspectRatio/);
  assert.match(migration, /profile_avatar_path/);
  assert.match(migration, /drop column if exists profile_backdrop_path/);
});

test('Profile lists the reviews the user wrote, poster first, with no partial-total note', async () => {
  const [page, card, reviewsPage, statisticsPage, statRail, connections] =
    await Promise.all([
      read('src/lib/pages/profile/index.tsx'),
      read('src/lib/components/profile/ProfileReviews.tsx'),
      read('src/lib/pages/profile/reviews.tsx'),
      read('src/lib/pages/profile/statistics.tsx'),
      read('src/lib/components/profile/ProfileStatRail.tsx'),
      read('src/lib/pages/profile/connections.tsx'),
    ]);

  assert.match(page, /title="Reviews"/);
  assert.match(page, /<ProfileReviewList/);
  assert.match(page, /'\/profile\/reviews' as Route/);
  // A review card carries the poster, the title, the rating, and the review.
  assert.match(card, /IMAGE_URL/);
  assert.match(card, /review\.title/);
  assert.match(card, /<ReviewRating rating=\{review\.rating\}/);
  assert.match(card, /\{review\.review\}/);
  assert.match(reviewsPage, /Back to Profile/);

  // Watch totals no longer explain themselves as partial.
  for (const source of [statisticsPage, statRail, connections]) {
    assert.doesNotMatch(source, /Partial total/);
  }
});

test('Settings opens a page per entry and can get back to the profile', async () => {
  const [
    settings,
    settingsRoute,
    profileRoute,
    accountRoute,
    privacyRoute,
    editRoute,
  ] = await Promise.all([
    read('src/lib/pages/profile/settings.tsx'),
    read('src/app/profile/settings/page.tsx'),
    read('src/app/profile/settings/profile/page.tsx'),
    read('src/app/profile/settings/account/page.tsx'),
    read('src/app/profile/settings/privacy/page.tsx'),
    read('src/app/profile/edit/page.tsx'),
  ]);

  // Each entry points at its own route instead of a shared anchor.
  for (const href of [
    '/profile/settings/profile',
    '/profile/settings/account',
    '/profile/settings/privacy',
  ]) {
    assert.match(settings, new RegExp(href));
  }
  assert.doesNotMatch(settings, /profile\/edit#/);
  // Preferences TvSync does not store are not listed as settings.
  assert.doesNotMatch(settings, /Appearance|Notifications/);

  assert.match(settings, /Back to Profile/);
  assert.match(settings, /Back to Settings/);
  assert.match(settingsRoute, /<SettingsIndexPage/);
  assert.match(profileRoute, /<SettingsProfilePage/);
  assert.match(accountRoute, /<SettingsAccountPage/);
  assert.match(privacyRoute, /<SettingsPrivacyPage/);
  // The old combined editor redirects into the settings pages.
  assert.match(editRoute, /permanentRedirect\('\/profile\/settings\/profile'/);

  for (const route of [
    settingsRoute,
    profileRoute,
    accountRoute,
    privacyRoute,
  ]) {
    assert.match(route, /login\?callbackUrl=|requireOwnProfile/);
  }
});

test('follower and following pages search, navigate, and follow without exposing internal ids', async () => {
  const [connections, followButton, actions, followers, following] =
    await Promise.all([
      read('src/lib/pages/profile/connections.tsx'),
      read('src/lib/features/social/follow-button.tsx'),
      read('src/lib/features/social/actions.ts'),
      read('src/app/profile/[username]/followers/page.tsx'),
      read('src/app/profile/[username]/following/page.tsx'),
    ]);

  assert.match(connections, /Search users/);
  assert.match(connections, /Display name or username/);
  assert.match(connections, /href=\{`\/profile\/\$\{item\.username\}`/);
  assert.match(followButton, /Follow/);
  assert.match(followButton, /Unfollow/);
  assert.match(followButton, /\/login\?callbackUrl=/);
  assert.match(actions, /followPublicProfile\(normalizedUsername\)/);
  assert.match(actions, /unfollowProfile\(normalizedUsername\)/);
  assert.doesNotMatch(followButton, /profileUserId|providerAccountId/);
  assert.match(followers, /kind: 'followers'/);
  assert.match(following, /kind: 'following'/);
  assert.match(following, /compare === 'statistics'/);
});

test('Settings exposes secure profile, email, password, Google setup, and deletion flows', async () => {
  const [editPage, form, actions, email, authConfig, authDatabase] =
    await Promise.all([
      Promise.all([
        read('src/lib/pages/profile/settings-profile.tsx'),
        read('src/lib/pages/profile/settings-account.tsx'),
      ]).then((pages) => pages.join('\n')),
      read('src/lib/pages/profile/profile-form.tsx'),
      read('src/lib/pages/profile/actions.ts'),
      read('src/lib/services/auth/email.server.ts'),
      read('src/lib/services/auth/index.server.ts'),
      read('src/lib/services/database/auth.server.ts'),
    ]);

  for (const label of [
    'Display name',
    'Username',
    'Email',
    'Bio',
    'Save Changes',
    'Change Password',
    'Delete Account',
  ]) {
    assert.match(`${editPage}\n${form}`, new RegExp(label));
  }

  assert.match(actions, /isUsernameTakenByAnotherUser/);
  assert.match(actions, /createOwnEmailChangeToken/);
  assert.match(actions, /sendEmailChangeVerification/);
  assert.match(email, /\/verify-email-change/);
  assert.match(actions, /verifyOwnCurrentPassword/);
  assert.match(actions, /isRecentAuthentication/);
  assert.match(form, /Create Password/);
  assert.match(form, /Reauthenticate with Google/);
  assert.match(form, /role="alertdialog"/);
  assert.match(form, /Type \{username\} to confirm/);
  assert.match(form, /Permanently Delete Account/);
  assert.match(actions, /confirmation !== profile\.username/);
  assert.match(actions, /deleteOwnAccount\(\)/);
  assert.match(authConfig, /authenticatedAt/);
  assert.doesNotMatch(
    authDatabase.slice(
      authDatabase.indexOf('if (mappedUserId)'),
      authDatabase.indexOf('if (emailUserId)')
    ),
    /email:/
  );
});

test('Profile and Settings include explicit mobile and desktop layouts', async () => {
  const [profile, edit, form] = await Promise.all([
    read('src/lib/pages/profile/index.tsx'),
    read('src/lib/pages/profile/settings.tsx'),
    read('src/lib/pages/profile/profile-form.tsx'),
  ]);

  // Profile leads with the avatar and keeps account actions in settings.
  assertProfileHeaderOrder(profile);
  assert.match(profile, /<FollowCountChip/);
  assert.match(profile, /textAlign="center"/);
  assert.match(edit, /padding=\{\{ base: 5, md: 6 \}\}/);
  assert.match(form, /maxLength=\{BIO_MAX_LENGTH\}/);
  assert.match(form, /autoComplete="current-password"/);
  assert.match(form, /autoComplete="new-password"/);
});

// biome-ignore lint/style/noDoneCallback: Node's test context provides awaited subtests.
test('PostgreSQL profile lifecycle preserves identity and deletes personal data atomically', async (t) => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }

    await insertProfile(db, {
      email: 'alice@example.com',
      userId: 'user-a',
      username: 'alice',
    });
    await insertProfile(db, {
      email: 'bob@example.com',
      userId: 'user-b',
      username: 'bob',
    });
    await db.query(
      `insert into auth_accounts (user_id, provider, provider_account_id)
       values ('user-a', 'google', 'google-alice'),
              ('user-b', 'google', 'google-bob')`
    );
    await db.query(
      `insert into follows (follower_user_id, following_user_id)
       values ('user-a', 'user-b')`
    );

    await t.test(
      'display name, username, and biography update without changing identity or relationships',
      async () => {
        const updated = await getRows<{ user_id: string; username: string }>(
          db,
          UPDATE_OWN_PROFILE_DETAILS_QUERY,
          ['user-a', 'Alice Updated', 'alice_updated', 'Updated biography']
        );
        assert.deepEqual(
          updated.map(({ user_id, username }) => ({ user_id, username })),
          [{ user_id: 'user-a', username: 'alice_updated' }]
        );
        const follows = await getRows<{ follower_user_id: string }>(
          db,
          'select follower_user_id from follows where following_user_id = $1',
          ['user-b']
        );
        assert.deepEqual(follows, [{ follower_user_id: 'user-a' }]);

        await assert.rejects(
          db.query(UPDATE_OWN_PROFILE_DETAILS_QUERY, [
            'user-a',
            'Alice',
            'bob',
            '',
          ]),
          /profiles_username_(lower|normalized)_unique/
        );
      }
    );

    await t.test(
      'email update stays pending, consumes once, stays unique, and rotates sessions',
      async () => {
        const digest = digestAuthToken('email-change-token');
        await db.query(INSERT_EMAIL_CHANGE_TOKEN_QUERY, [
          'user-a',
          'alice.new@example.com',
          digest,
          new Date(Date.now() + 86_400_000),
        ]);
        const before = await getRows<{ email: string }>(
          db,
          'select email from profiles where user_id = $1',
          ['user-a']
        );
        assert.equal(before[0]?.email, 'alice@example.com');

        const changed = await getRows<{
          email: string;
          previous_email: string;
          user_id: string;
        }>(db, CONSUME_EMAIL_CHANGE_TOKEN_QUERY, [digest]);
        assert.deepEqual(changed, [
          {
            email: 'alice.new@example.com',
            previous_email: 'alice@example.com',
            user_id: 'user-a',
          },
        ]);
        assert.deepEqual(
          await getRows(db, CONSUME_EMAIL_CHANGE_TOKEN_QUERY, [digest]),
          []
        );
        const version = await getRows<{ session_version: number }>(
          db,
          'select session_version from profiles where user_id = $1',
          ['user-a']
        );
        assert.equal(version[0]?.session_version, 1);

        const conflictDigest = digestAuthToken('email-conflict-token');
        await db.query(INSERT_EMAIL_CHANGE_TOKEN_QUERY, [
          'user-a',
          'bob@example.com',
          conflictDigest,
          new Date(Date.now() + 86_400_000),
        ]);
        assert.deepEqual(
          await getRows(db, CONSUME_EMAIL_CHANGE_TOKEN_QUERY, [conflictDigest]),
          []
        );
      }
    );

    await t.test(
      'Google-only users can create and then change a bcrypt password',
      async () => {
        const createdHash = await hashPasswordCore('CreatedPassword1');
        await db.query(SET_OWN_PASSWORD_QUERY, ['user-a', createdHash]);
        let accounts = await getRows<{ password_hash: string }>(
          db,
          `select password_hash from auth_accounts
           where user_id = $1 and provider = 'credentials'`,
          ['user-a']
        );
        assert.equal(
          await verifyPasswordCore(
            'CreatedPassword1',
            accounts[0]?.password_hash
          ),
          true
        );

        const changedHash = await hashPasswordCore('ChangedPassword2');
        await db.query(SET_OWN_PASSWORD_QUERY, ['user-a', changedHash]);
        accounts = await getRows<{ password_hash: string }>(
          db,
          `select password_hash from auth_accounts
           where user_id = $1 and provider = 'credentials'`,
          ['user-a']
        );
        assert.equal(
          await verifyPasswordCore(
            'ChangedPassword2',
            accounts[0]?.password_hash
          ),
          true
        );
        assert.equal(
          await verifyPasswordCore(
            'CreatedPassword1',
            accounts[0]?.password_hash
          ),
          false
        );
      }
    );

    await t.test(
      'favourite movie and TV rows stay unique and owner-scoped',
      async () => {
        await db.query(UPSERT_OWN_FAVORITE_QUERY, ['user-a', 10, 'movie']);
        await db.query(UPSERT_OWN_FAVORITE_QUERY, ['user-a', 10, 'movie']);
        await db.query(UPSERT_OWN_FAVORITE_QUERY, ['user-a', 20, 'tv']);
        await db.query(UPSERT_OWN_FAVORITE_QUERY, ['user-b', 10, 'movie']);

        const favorites = await getRows<{
          media_type: string;
          tmdb_id: number;
        }>(db, LIST_OWN_FAVORITES_QUERY, ['user-a']);
        assert.deepEqual(
          favorites
            .map(({ media_type, tmdb_id }) => ({ media_type, tmdb_id }))
            .toSorted((left, right) => left.tmdb_id - right.tmdb_id),
          [
            { media_type: 'movie', tmdb_id: 10 },
            { media_type: 'tv', tmdb_id: 20 },
          ]
        );
      }
    );

    await t.test(
      'confirmed account deletion cascades personal data and cannot delete another account',
      async () => {
        await db.query(
          `insert into user_media (user_id, tmdb_id, media_type, watch_status)
           values ('user-a', 10, 'movie', 'watched')`
        );
        await db.query(
          `insert into episode_progress (
             user_id, tmdb_show_id, season_number, episode_number, watched
           ) values ('user-a', 20, 1, 1, true)`
        );
        const deleted = await getRows<{ user_id: string }>(
          db,
          DELETE_OWN_ACCOUNT_QUERY,
          ['user-a']
        );
        assert.deepEqual(deleted, [{ user_id: 'user-a' }]);

        for (const [table, predicate] of [
          ['auth_accounts', "user_id = 'user-a'"],
          ['favorite_media', "user_id = 'user-a'"],
          ['user_media', "user_id = 'user-a'"],
          ['episode_progress', "user_id = 'user-a'"],
          [
            'follows',
            "follower_user_id = 'user-a' or following_user_id = 'user-a'",
          ],
        ] as const) {
          const rows = await getRows<{ count: number }>(
            db,
            `select count(*)::int as count from ${table} where ${predicate}`
          );
          assert.equal(rows[0]?.count, 0, `${table} should be deleted`);
        }

        const remaining = await getRows<{ user_id: string }>(
          db,
          'select user_id from profiles order by user_id'
        );
        assert.deepEqual(remaining, [{ user_id: 'user-b' }]);
        assert.deepEqual(
          await getRows(db, DELETE_OWN_ACCOUNT_QUERY, ['user-a']),
          []
        );
      }
    );
  } finally {
    await db.close();
  }
});
