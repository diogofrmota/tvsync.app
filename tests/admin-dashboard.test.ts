/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the requirement they guard. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  DEFAULT_DISCOVERY_LIST_SETTINGS,
  type DiscoveryListSetting,
  discoveryListCacheTag,
  discoveryRailKeyForList,
  isDiscoveryRailKey,
  selectDiscoveryListSettings,
} from '../src/lib/pages/media/discovery-rails';
import {
  createAdminSessionToken,
  deriveAdminSessionKey,
  secretsMatch,
  verifyAdminSessionToken,
} from '../src/lib/services/admin/security';
import {
  ADMIN_ACCOUNT_STATS_QUERY,
  ADMIN_BAN_USER_QUERY,
  ADMIN_FIND_USER_QUERY,
  ADMIN_INSERT_AUDIT_LOG_QUERY,
  ADMIN_PROVIDER_STATS_QUERY,
  ADMIN_RECENT_AUDIT_LOG_QUERY,
  ADMIN_RECENT_BANS_QUERY,
  ADMIN_TABLE_ESTIMATES_QUERY,
  ADMIN_UNBAN_USER_QUERY,
} from '../src/lib/services/database/admin-queries';
import { GET_SESSION_VERSION_QUERY } from '../src/lib/services/database/auth-queries';
import {
  BUMP_DISCOVERY_LIST_CACHE_EPOCH_QUERY,
  SELECT_DISCOVERY_LIST_SETTINGS_QUERY,
  UPSERT_DISCOVERY_LIST_SETTING_QUERY,
} from '../src/lib/services/database/discovery-list-queries';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
  '0005_auth_lifecycle.sql',
  '0006_unify_library_membership.sql',
  '0011_admin_dashboard.sql',
] as const;

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const runMigration = async (db: PGliteInterface, name: string) => {
  await db.exec(
    await readFile(join(process.cwd(), 'database', 'migrations', name), 'utf8')
  );
};

const getRows = async <Row extends Record<string, unknown>>(
  db: PGliteInterface,
  query: string,
  params: Array<unknown> = []
) => (await db.query<Row>(query, params)).rows;

const insertProfile = (
  db: PGliteInterface,
  input: { email: string; userId: string; username: string }
) =>
  db.query(
    `
      insert into profiles (
        user_id,
        name,
        username,
        display_name,
        email,
        privacy_setting,
        email_verified_at
      )
      values ($1, $2, $2, $2, $3, 'public', now())
    `,
    [input.userId, input.username, input.email]
  );

const adminKey = (password: string) =>
  deriveAdminSessionKey({
    password,
    secret: 'test-auth-secret',
    user: 'root',
  });

test('the admin session cookie is signed, scoped, and short lived', () => {
  const key = adminKey('correct horse battery staple');
  const token = createAdminSessionToken({ key, user: 'root' });

  assert.ok(
    verifyAdminSessionToken({ expectedUser: 'root', key, token }),
    'a freshly issued token verifies'
  );

  // A tampered payload or signature is rejected, so the cookie cannot be
  // rewritten into a session for a different admin user.
  const [payload, signature] = token.split('.');
  assert.equal(
    verifyAdminSessionToken({
      expectedUser: 'root',
      key,
      token: `${payload}x.${signature}`,
    }),
    null
  );
  assert.equal(
    verifyAdminSessionToken({
      expectedUser: 'root',
      key,
      token: `${payload}.${signature.slice(0, -1)}a`,
    }),
    null
  );
  assert.equal(
    verifyAdminSessionToken({ expectedUser: 'other', key, token }),
    null
  );
  assert.equal(
    verifyAdminSessionToken({ expectedUser: 'root', key, token: undefined }),
    null
  );

  // Rotating the password changes the signing key, which invalidates every
  // cookie that was already issued without any server-side bookkeeping.
  assert.equal(
    verifyAdminSessionToken({
      expectedUser: 'root',
      key: adminKey('a different password'),
      token,
    }),
    null
  );

  // Sessions expire after eight hours.
  const issuedAt = Date.UTC(2026, 0, 1, 12, 0, 0);
  const expiring = createAdminSessionToken({
    key,
    now: issuedAt,
    user: 'root',
  });
  assert.ok(
    verifyAdminSessionToken({
      expectedUser: 'root',
      key,
      now: issuedAt + 7 * 60 * 60 * 1000,
      token: expiring,
    })
  );
  assert.equal(
    verifyAdminSessionToken({
      expectedUser: 'root',
      key,
      now: issuedAt + 9 * 60 * 60 * 1000,
      token: expiring,
    }),
    null
  );
});

test('admin credentials are compared without leaking length or content', () => {
  assert.equal(secretsMatch('hunter2', 'hunter2'), true);
  assert.equal(secretsMatch('hunter2', 'hunter3'), false);
  // Digesting both sides first keeps a very short attempt from being cheaper to
  // compare than a long one.
  assert.equal(secretsMatch('a', 'a-much-longer-password-value'), false);
  assert.equal(secretsMatch('', 'hunter2'), false);
});

test('discovery list selection honours activation, surface, and order', () => {
  const settings: Array<DiscoveryListSetting> = [
    {
      ...DEFAULT_DISCOVERY_LIST_SETTINGS[0],
      key: 'popular_movies',
      position: 2,
    },
    {
      ...DEFAULT_DISCOVERY_LIST_SETTINGS[0],
      key: 'trending_movies',
      position: 0,
    },
    {
      ...DEFAULT_DISCOVERY_LIST_SETTINGS[0],
      active: false,
      key: 'top_rated_movies',
      position: 1,
    },
    {
      ...DEFAULT_DISCOVERY_LIST_SETTINGS[0],
      key: 'upcoming_movies',
      position: 3,
      showOnHome: false,
    },
  ];

  assert.deepEqual(
    selectDiscoveryListSettings(settings, 'home').map((setting) => setting.key),
    ['trending_movies', 'popular_movies']
  );
  // A deselected list keeps its row and its sizes, so it can be switched back
  // on later without being reconfigured.
  assert.deepEqual(
    selectDiscoveryListSettings(settings, 'explore').map(
      (setting) => setting.key
    ),
    ['trending_movies', 'popular_movies', 'upcoming_movies']
  );

  assert.equal(isDiscoveryRailKey('popular_movies'), true);
  assert.equal(isDiscoveryRailKey('custom_list'), false);
  assert.equal(
    discoveryListCacheTag('popular_movies'),
    'discovery-list:popular_movies'
  );
});

test('every managed "See All" route maps back to the list that links to it', () => {
  assert.equal(
    discoveryRailKeyForList({ isMovie: true, listType: 'popular' }),
    'popular_movies'
  );
  assert.equal(
    discoveryRailKeyForList({ isMovie: true, listType: 'trending_week' }),
    'trending_movies'
  );
  assert.equal(
    discoveryRailKeyForList({ isMovie: true, listType: 'upcoming' }),
    'upcoming_movies'
  );
  assert.equal(
    discoveryRailKeyForList({ isMovie: false, listType: 'top_rated' }),
    'top_rated_tv_shows'
  );
  // Lists with no managed configuration keep the shipped defaults.
  assert.equal(
    discoveryRailKeyForList({ isMovie: false, listType: 'upcoming' }),
    null
  );
  assert.equal(
    discoveryRailKeyForList({ isMovie: true, listType: 'now_playing' }),
    null
  );
});

// biome-ignore lint/style/noDoneCallback: Node's test context provides awaited subtests, not a completion callback.
test('admin schema supports moderation, list configuration, and an audit trail', async (t) => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }

    await insertProfile(db, {
      email: 'viewer@example.com',
      userId: 'user-1',
      username: 'viewer',
    });

    await t.test('a ban blocks sign-in and revokes live sessions', async () => {
      const before = await getRows<{ session_version: number }>(
        db,
        GET_SESSION_VERSION_QUERY,
        ['user-1']
      );
      assert.equal(before.at(0)?.session_version, 0);

      const banned = await getRows<{ banned_at: Date; username: string }>(
        db,
        ADMIN_BAN_USER_QUERY,
        ['viewer@example.com', 'Repeated abuse reports']
      );
      assert.equal(banned.at(0)?.username, 'viewer');
      assert.ok(banned.at(0)?.banned_at);

      // The session-version read is the one the JWT callback makes on every
      // request; a banned profile no longer answers it, so existing tokens fail
      // their next check instead of lasting until they expire.
      const during = await getRows(db, GET_SESSION_VERSION_QUERY, ['user-1']);
      assert.equal(during.length, 0);

      const rotated = await getRows<{ session_version: number }>(
        db,
        'select session_version from profiles where user_id = $1',
        ['user-1']
      );
      assert.equal(rotated.at(0)?.session_version, 1);

      const listed = await getRows<{ ban_reason: string; username: string }>(
        db,
        ADMIN_RECENT_BANS_QUERY,
        [10]
      );
      assert.equal(listed.at(0)?.username, 'viewer');
      assert.equal(listed.at(0)?.ban_reason, 'Repeated abuse reports');
    });

    await t.test('a ban is reversible by username as well', async () => {
      const unbanned = await getRows<{ username: string }>(
        db,
        ADMIN_UNBAN_USER_QUERY,
        ['viewer']
      );
      assert.equal(unbanned.at(0)?.username, 'viewer');

      const after = await getRows<{ session_version: number }>(
        db,
        GET_SESSION_VERSION_QUERY,
        ['user-1']
      );
      assert.equal(after.at(0)?.session_version, 1);

      // Unbanning an account that is not banned matches nothing rather than
      // silently reporting success.
      assert.equal(
        (await getRows(db, ADMIN_UNBAN_USER_QUERY, ['viewer'])).length,
        0
      );
    });

    await t.test('user lookup resolves by email or username', async () => {
      const byEmail = await getRows<{ ban_reason: string; username: string }>(
        db,
        ADMIN_FIND_USER_QUERY,
        ['viewer@example.com']
      );
      assert.equal(byEmail.at(0)?.username, 'viewer');
      assert.equal(byEmail.at(0)?.ban_reason, '');

      const byUsername = await getRows<{ providers: string | null }>(
        db,
        ADMIN_FIND_USER_QUERY,
        ['viewer']
      );
      assert.equal(byUsername.length, 1);

      assert.equal(
        (await getRows(db, ADMIN_FIND_USER_QUERY, ['nobody@example.com']))
          .length,
        0
      );
    });

    await t.test('overview counters are exact for accounts', async () => {
      const accounts = await getRows<{
        banned_users: string;
        total_users: string;
        verified_users: string;
      }>(db, ADMIN_ACCOUNT_STATS_QUERY);

      assert.equal(Number(accounts.at(0)?.total_users), 1);
      assert.equal(Number(accounts.at(0)?.verified_users), 1);
      assert.equal(Number(accounts.at(0)?.banned_users), 0);

      const providers = await getRows(db, ADMIN_PROVIDER_STATS_QUERY);
      assert.equal(providers.length, 1);

      // Activity totals are read from planner statistics instead of counting
      // the largest tables in the database.
      const estimates = await getRows<{ table_name: string }>(
        db,
        ADMIN_TABLE_ESTIMATES_QUERY
      );
      assert.ok(
        estimates.every((row) =>
          [
            'episode_progress',
            'ratings',
            'user_media',
            'watchlist_items',
          ].includes(row.table_name)
        )
      );
    });

    await t.test('every shipped list is seeded and configurable', async () => {
      const seeded = await getRows<{
        item_limit: number;
        list_key: string;
        show_on_home: boolean;
      }>(db, SELECT_DISCOVERY_LIST_SETTINGS_QUERY);

      assert.deepEqual(
        seeded.map((row) => row.list_key),
        DEFAULT_DISCOVERY_LIST_SETTINGS.map((setting) => setting.key)
      );
      // Upcoming ships on Explore only, matching the shipped default.
      assert.equal(
        seeded.find((row) => row.list_key === 'upcoming_movies')?.show_on_home,
        false
      );

      await db.query(UPSERT_DISCOVERY_LIST_SETTING_QUERY, [
        'popular_movies',
        false,
        false,
        true,
        0,
        50,
        6,
      ]);

      const saved = await getRows<{
        active: boolean;
        item_limit: number;
        list_key: string;
        refresh_interval_hours: number;
      }>(db, SELECT_DISCOVERY_LIST_SETTINGS_QUERY);
      const popular = saved.find((row) => row.list_key === 'popular_movies');

      assert.equal(popular?.active, false);
      assert.equal(popular?.item_limit, 50);
      assert.equal(popular?.refresh_interval_hours, 6);
      // The reordered list sorts first now that its position changed.
      assert.equal(saved.at(0)?.list_key, 'popular_movies');
    });

    await t.test(
      'list sizes and cadences are bounded by the schema',
      async () => {
        await assert.rejects(
          db.query(UPSERT_DISCOVERY_LIST_SETTING_QUERY, [
            'popular_movies',
            true,
            true,
            true,
            0,
            5000,
            24,
          ])
        );
        await assert.rejects(
          db.query(UPSERT_DISCOVERY_LIST_SETTING_QUERY, [
            'popular_movies',
            true,
            true,
            true,
            0,
            30,
            0,
          ])
        );
      }
    );

    await t.test('a manual refetch bumps the cache epoch', async () => {
      const before = await getRows<{ cache_epoch: number }>(
        db,
        'select cache_epoch from discovery_list_settings where list_key = $1',
        ['trending_movies']
      );

      await db.query(BUMP_DISCOVERY_LIST_CACHE_EPOCH_QUERY, [
        'trending_movies',
      ]);

      const after = await getRows<{
        cache_epoch: number;
        refreshed_at: Date | null;
      }>(
        db,
        'select cache_epoch, refreshed_at from discovery_list_settings where list_key = $1',
        ['trending_movies']
      );

      assert.equal(
        Number(after.at(0)?.cache_epoch),
        Number(before.at(0)?.cache_epoch) + 1
      );
      assert.ok(after.at(0)?.refreshed_at);
    });

    await t.test(
      'privileged actions are recorded with a keyed digest',
      async () => {
        await db.query(ADMIN_INSERT_AUDIT_LOG_QUERY, [
          'root',
          'user.ban',
          'viewer',
          'Repeated abuse reports',
          'a'.repeat(64),
        ]);

        const entries = await getRows<{
          action: string;
          actor: string;
          target: string;
        }>(db, ADMIN_RECENT_AUDIT_LOG_QUERY, [20]);

        assert.equal(entries.at(0)?.action, 'user.ban');
        assert.equal(entries.at(0)?.actor, 'root');
        assert.equal(entries.at(0)?.target, 'viewer');
      }
    );
  } finally {
    await db.close();
  }
});

test('the admin route is dynamic, unindexed, and outside the app shell', () => {
  const route = read('src/app/admin/page.tsx');
  const layout = read('src/lib/layout/index.tsx');
  const sitemap = read('next-sitemap.config.js');

  assert.match(route, /export const dynamic = 'force-dynamic'/);
  assert.match(route, /robots: \{ follow: false, index: false \}/);
  assert.doesNotMatch(route, /export const revalidate/);
  // The dashboard is not part of the signed-in user experience, so it never
  // renders the member header or the mobile navigation.
  assert.match(layout, /'\/admin'/);
  assert.match(sitemap, /exclude: \['\/admin'\]/);
  assert.match(sitemap, /disallow: \['\/admin'\]/);
});

test('the dashboard opens closed and every mutation re-checks the session', () => {
  const page = read('src/lib/pages/admin/index.tsx');
  const session = read('src/lib/services/admin/session.server.ts');
  const actions = read('src/lib/features/admin/actions.ts');

  // Without both credentials and AUTH_SECRET the page stays shut rather than
  // falling back to a default login.
  assert.match(page, /process\.env\.ADMIN_USER/);
  assert.match(page, /process\.env\.ADMIN_PASSWORD/);
  assert.match(page, /process\.env\.AUTH_SECRET/);
  assert.match(page, /<AdminLoginForm \/>/);
  assert.match(session, /^import 'server-only';/m);
  assert.match(session, /httpOnly: true/);
  assert.match(session, /sameSite: 'strict'/);
  assert.match(session, /secure: process\.env\.NODE_ENV === 'production'/);
  assert.match(session, /path: '\/admin'/);

  // Every mutation authorizes before it acts, and the login itself is
  // throttled through the shared Neon rate-limit table.
  assert.match(actions, /checkRequestAuthRateLimit\('adminLogin'/);
  for (const mutation of [
    'lookupUserAccount',
    'banUserAccount',
    'unbanUserAccount',
    'saveDiscoveryLists',
    'refreshDiscoveryListNow',
    'runAdminMaintenance',
    'refreshAdminStats',
  ]) {
    const start = actions.indexOf(`export const ${mutation} =`);
    assert.notEqual(start, -1, `Missing ${mutation}`);
    const body = actions.slice(start, start + 400);
    assert.match(body, /await authorizeAdmin\(\)/, mutation);
  }

  const rateLimits = read('src/lib/services/auth/rate-limit.server.ts');
  assert.match(
    rateLimits,
    /adminLogin: \{ limit: 5, windowSeconds: 15 \* 60 \}/
  );
});

test('banned accounts cannot sign in through either provider', () => {
  const authOptions = read('src/lib/services/auth/index.server.ts');
  const queries = read('src/lib/services/database/auth-queries.ts');

  assert.match(authOptions, /account\.banned_at/);
  assert.match(authOptions, /ACCOUNT_BANNED_ERROR/);
  // Google sign-in is refused through the same missing session version a ban
  // produces, so neither provider can admit a banned profile.
  assert.match(authOptions, /if \(sessionVersion === null\)/);
  assert.match(queries, /where user_id = \$1 and banned_at is null/);
});

test('admin credentials are documented as required environment values', async () => {
  const [envExample, agents] = await Promise.all([
    readFile(join(process.cwd(), '.env.example'), 'utf8'),
    readFile(join(process.cwd(), 'AGENTS.md'), 'utf8'),
  ]);

  for (const source of [envExample, agents]) {
    assert.match(source, /ADMIN_USER/);
    assert.match(source, /ADMIN_PASSWORD/);
  }
});
