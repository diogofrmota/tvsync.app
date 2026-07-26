/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the requirement they guard. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import { formatAdminChange } from '../src/lib/pages/admin/format';
import {
  type CuratedListRail,
  curatedListHref,
  selectCuratedListRails,
} from '../src/lib/pages/media/curated-lists';
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
  ADMIN_ADD_CURATED_LIST_ITEM_QUERY,
  ADMIN_CREATE_CURATED_LIST_QUERY,
  ADMIN_DELETE_CURATED_LIST_QUERY,
  ADMIN_REMOVE_CURATED_LIST_ITEM_QUERY,
  ADMIN_SELECT_CURATED_LISTS_QUERY,
  ADMIN_UPDATE_CURATED_LIST_PLACEMENT_QUERY,
  SELECT_PUBLIC_CURATED_LISTS_QUERY,
} from '../src/lib/services/database/admin-curated-list-queries';
import {
  ADMIN_ACCOUNT_STATS_QUERY,
  ADMIN_ACTIVE_USERS_QUERY,
  ADMIN_BAN_USER_QUERY,
  ADMIN_FIND_USER_QUERY,
  ADMIN_INSERT_AUDIT_LOG_QUERY,
  ADMIN_RECENT_AUDIT_LOG_QUERY,
  ADMIN_RECENT_BANS_QUERY,
  ADMIN_UNBAN_USER_QUERY,
} from '../src/lib/services/database/admin-queries';
import { GET_SESSION_VERSION_QUERY } from '../src/lib/services/database/auth-queries';
import {
  BUMP_DISCOVERY_LIST_CACHE_EPOCH_QUERY,
  SELECT_DISCOVERY_LIST_SETTINGS_QUERY,
  UPSERT_DISCOVERY_LIST_SETTING_QUERY,
} from '../src/lib/services/database/discovery-list-queries';
import { MediaType } from '../src/lib/types';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
  '0005_auth_lifecycle.sql',
  '0006_unify_library_membership.sql',
  '0011_admin_dashboard.sql',
  '0013_admin_curated_lists.sql',
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

test('curated list selection honours publication, surface, and order', () => {
  const rail = (overrides: Partial<CuratedListRail>): CuratedListRail => ({
    description: '',
    id: 'list-1',
    items: [
      { id: 1, mediaType: MediaType.Movie, posterPath: null, title: 'A' },
    ],
    name: 'List',
    position: 0,
    showOnExplore: true,
    showOnHome: true,
    ...overrides,
  });
  const rails = [
    rail({ id: 'second', name: 'Second', position: 1 }),
    rail({ id: 'first', name: 'First', position: 0 }),
    rail({ id: 'explore-only', position: 2, showOnHome: false }),
    // An empty list is never shown, whatever its placement says, so publishing
    // one before filling it cannot leave a bare heading on Home.
    rail({ id: 'empty', items: [], position: 3 }),
  ];

  assert.deepEqual(
    selectCuratedListRails(rails, 'home').map((entry) => entry.id),
    ['first', 'second']
  );
  assert.deepEqual(
    selectCuratedListRails(rails, 'explore').map((entry) => entry.id),
    ['first', 'second', 'explore-only']
  );
  assert.equal(curatedListHref('abc'), '/lists/abc');
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

    await t.test(
      'the overview counts only the four figures it shows, each against its previous window',
      async () => {
        const accounts = await getRows<{
          banned_users: string;
          signups_last_month: string;
          signups_previous_month: string;
          total_users: string;
        }>(db, ADMIN_ACCOUNT_STATS_QUERY);

        assert.equal(Number(accounts.at(0)?.total_users), 1);
        assert.equal(Number(accounts.at(0)?.banned_users), 0);
        // The freshly inserted profile lands in the current window, and there
        // is nothing in the 30 days before it to compare against yet.
        assert.equal(Number(accounts.at(0)?.signups_last_month), 1);
        assert.equal(Number(accounts.at(0)?.signups_previous_month), 0);

        // The removed tiles no longer cost a query at all.
        assert.doesNotMatch(ADMIN_ACCOUNT_STATS_QUERY, /verified_users/);
        assert.doesNotMatch(ADMIN_ACCOUNT_STATS_QUERY, /public_profiles/);
        assert.doesNotMatch(ADMIN_ACCOUNT_STATS_QUERY, /signups_last_day/);

        const active = await getRows<{
          active_users: string;
          previous_active_users: string;
        }>(db, ADMIN_ACTIVE_USERS_QUERY);

        assert.equal(Number(active.at(0)?.active_users), 0);
        assert.equal(Number(active.at(0)?.previous_active_users), 0);
      }
    );

    await t.test(
      'a custom list is created, searched into, and deleted with its titles',
      async () => {
        const created = await getRows<{ id: string; name: string }>(
          db,
          ADMIN_CREATE_CURATED_LIST_QUERY,
          ['Staff Picks', 'Hand-picked by the team']
        );
        const listId = created.at(0)?.id;
        assert.equal(created.at(0)?.name, 'Staff Picks');
        assert.ok(listId);

        // A list name is unique overall, compared case-insensitively.
        await assert.rejects(
          db.query(ADMIN_CREATE_CURATED_LIST_QUERY, ['staff picks', ''])
        );

        const added = await getRows(db, ADMIN_ADD_CURATED_LIST_ITEM_QUERY, [
          listId,
          603,
          'movie',
          'The Matrix',
          '/poster.jpg',
        ]);
        assert.equal(added.length, 1);

        // Adding the same title again is a no-op rather than an error.
        assert.equal(
          (
            await getRows(db, ADMIN_ADD_CURATED_LIST_ITEM_QUERY, [
              listId,
              603,
              'movie',
              'The Matrix',
              '/poster.jpg',
            ])
          ).length,
          0
        );

        await db.query(ADMIN_ADD_CURATED_LIST_ITEM_QUERY, [
          listId,
          1396,
          'tv',
          'Breaking Bad',
          '',
        ]);

        const lists = await getRows<{
          items: Array<{ media_type: string; title: string }>;
          name: string;
        }>(db, ADMIN_SELECT_CURATED_LISTS_QUERY, [25]);

        assert.equal(lists.at(0)?.name, 'Staff Picks');
        assert.deepEqual(
          lists.at(0)?.items.map((item) => item.title),
          ['The Matrix', 'Breaking Bad']
        );

        // Only movies and TV shows can be saved to a list.
        await assert.rejects(
          db.query(ADMIN_ADD_CURATED_LIST_ITEM_QUERY, [
            listId,
            5,
            'person',
            'Someone',
            '',
          ])
        );

        // A new list is unpublished, so it is built before anyone sees it.
        assert.equal(
          (await getRows(db, SELECT_PUBLIC_CURATED_LISTS_QUERY)).length,
          0
        );

        await db.query(ADMIN_UPDATE_CURATED_LIST_PLACEMENT_QUERY, [
          listId,
          true,
          true,
          false,
          0,
        ]);

        const published = await getRows<{
          items: Array<{ media_type: string }>;
          name: string;
          show_on_explore: boolean;
          show_on_home: boolean;
        }>(db, SELECT_PUBLIC_CURATED_LISTS_QUERY);

        assert.equal(published.length, 1);
        assert.equal(published.at(0)?.name, 'Staff Picks');
        assert.equal(published.at(0)?.show_on_home, true);
        assert.equal(published.at(0)?.show_on_explore, false);
        // A curated rail renders straight from these rows, so one list can hold
        // both movies and TV shows without a single TMDB request.
        assert.deepEqual(
          published.at(0)?.items.map((item) => item.media_type),
          ['movie', 'tv']
        );

        assert.equal(
          (
            await getRows(db, ADMIN_REMOVE_CURATED_LIST_ITEM_QUERY, [
              listId,
              1396,
              'tv',
            ])
          ).length,
          1
        );

        await db.query(ADMIN_DELETE_CURATED_LIST_QUERY, [listId]);
        assert.equal(
          (await getRows(db, ADMIN_SELECT_CURATED_LISTS_QUERY, [25])).length,
          0
        );
        // Deleting the list cascades to the titles that were on it.
        assert.equal(
          (await getRows(db, 'select 1 from admin_curated_list_items')).length,
          0
        );
      }
    );

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
    'searchCuratedListCandidates',
    'createCuratedList',
    'saveCuratedListPlacement',
    'deleteCuratedList',
    'addTitleToCuratedList',
    'removeTitleFromCuratedList',
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

test('the restricted-access wording is what the entry point says', () => {
  const loginForm = read('src/lib/pages/admin/login-form.tsx');
  const dashboard = read('src/lib/pages/admin/dashboard.tsx');

  assert.match(loginForm, /TvSync - Admin Access/);
  assert.match(loginForm, /Access to this space is restricted\./);
  assert.match(loginForm, />\s*Enter\s*</);
  assert.doesNotMatch(loginForm, /Enter dashboard|manage TvSync/);
  assert.match(dashboard, /TvSync - Admin Access/);
});

test('the overview shows four tiles and the 30-day pair states its change', () => {
  const dashboard = read('src/lib/pages/admin/dashboard.tsx');
  const format = read('src/lib/pages/admin/format.ts');

  for (const label of [
    'label="Users"',
    'label="Banned users"',
    'label="New users (30 days)"',
    'label="Active users (30 days)"',
  ]) {
    assert.match(dashboard, new RegExp(label.replaceAll(/[()]/g, '\\$&')));
  }
  // Everything else was removed from the dashboard, panel and query alike.
  assert.doesNotMatch(
    dashboard,
    /Verified|Public profiles|Library items|Episodes tracked|Google logins|Latest signups/
  );
  assert.doesNotMatch(dashboard, /AdminSignups|recentSignups/);
  assert.match(dashboard, /formatAdminChange\(/);

  // A previous window of zero has no percentage to state, so the tile names the
  // start of the series instead of dividing by zero.
  assert.equal(formatAdminChange(12, 0), 'No previous 30 days to compare');
  assert.equal(formatAdminChange(0, 0), 'No change');
  assert.equal(formatAdminChange(12, 10), '+20% vs previous 30 days (10)');
  assert.equal(formatAdminChange(8, 10), '-20% vs previous 30 days (10)');
  assert.equal(formatAdminChange(10, 10), 'No change vs previous 30 days (10)');
  assert.match(format, /export const formatAdminChange/);
});

test('custom lists are built from an admin-side TMDB search', () => {
  const panel = read('src/lib/pages/admin/curated-lists.tsx');
  const actions = read('src/lib/features/admin/actions.ts');
  const dashboard = read('src/lib/pages/admin/dashboard.tsx');

  assert.match(dashboard, /<AdminCuratedLists/);
  assert.match(panel, /title="Custom lists"/);
  assert.match(panel, /Create list/);
  assert.match(panel, /Search TMDB/);
  assert.match(panel, />\s*Add\s*</);
  assert.match(panel, />\s*Remove\s*</);
  assert.match(panel, /Delete list/);

  // The search runs on the server, so TMDB_API_KEY never reaches the browser.
  assert.match(actions, /^'use server';/m);
  assert.match(actions, /getMovieListServer\(/);
  assert.match(actions, /getTVShowSearchResultList\(/);
  assert.doesNotMatch(panel, /TMDB_API_KEY|useTmdbSWR|api\/tmdb/);
});

test('a custom list is published to Home and Explore from the dashboard', () => {
  const panel = read('src/lib/pages/admin/curated-lists.tsx');
  const actions = read('src/lib/features/admin/actions.ts');
  const home = read('src/lib/pages/home/index.tsx');
  const explore = read('src/lib/pages/explore/discover.server.tsx');
  const rail = read('src/lib/components/shared/CuratedListRail.tsx');
  const route = read('src/app/lists/[id]/page.tsx');
  const service = read('src/lib/services/database/curated-lists.server.ts');

  // Placement is Published/Home/Explore plus an explicit order, saved for the
  // whole table in one payload so a reorder is never observed half-applied.
  assert.match(panel, /label="Published"/);
  assert.match(panel, /label="Home"/);
  assert.match(panel, /label="Explore"/);
  assert.match(panel, /Save placement/);
  assert.match(actions, /export const saveCuratedListPlacement/);
  assert.match(actions, /UUID_PATTERN\.test\(id\)/);

  // Both public surfaces render curated rails through the shared MediaRail.
  assert.match(home, /<CuratedListRail/);
  assert.match(explore, /<CuratedListRail/);
  assert.match(rail, /<MediaRail/);
  assert.match(rail, /curatedListHref\(rail\.id\)/);

  // "See All" opens the complete list, and only a published list resolves.
  assert.match(route, /findPublicCuratedList\(id\)/);
  assert.match(route, /notFound\(\)/);
  assert.match(service, /^import 'server-only';/m);
  assert.match(
    read('src/lib/services/database/admin-curated-list-queries.ts'),
    /where l\.active/,
    'the public read returns published lists only'
  );
  // The whole audience shares one cached read, busted by every mutation.
  assert.match(service, /CURATED_LISTS_REVALIDATE_SECONDS = 300/);
  assert.match(service, /tags: \[CURATED_LISTS_TAG\]/);
  assert.match(service, /cachedPublicCuratedLists\(\)\.catch/);
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
