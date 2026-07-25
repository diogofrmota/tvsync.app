/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the UX requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  getMediaLibraryKey,
  toMediaFavoriteKeySet,
  toMediaLibraryStatusMap,
} from '../src/lib/features/library/media-library-keys';
import { normalizeTvLibraryStatus } from '../src/lib/features/library/tv-library-state';
import {
  ADD_OWN_CUSTOM_LIST_ITEM_QUERY,
  DELETE_OWN_CUSTOM_LIST_QUERY,
  GET_OWN_CUSTOM_LIST_QUERY,
  INSERT_OWN_CUSTOM_LIST_QUERY,
  LIST_OWN_CUSTOM_LIST_ITEMS_QUERY,
  LIST_OWN_CUSTOM_LISTS_QUERY,
  REMOVE_OWN_CUSTOM_LIST_ITEM_QUERY,
  UPDATE_OWN_CUSTOM_LIST_QUERY,
} from '../src/lib/services/database/custom-list-queries';
import { MediaType, WatchStatus } from '../src/lib/types';

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
  '0010_personalized_lists.sql',
] as const;

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

const assertInOrder = (source: string, values: Array<string>) => {
  let previousIndex = -1;

  for (const value of values) {
    const index = source.indexOf(value);
    assert.ok(
      index > previousIndex,
      `Expected ${JSON.stringify(value)} in order`
    );
    previousIndex = index;
  }
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

test('Profile lists follow the required order and reuse the shared rail', async () => {
  const [profile, listsPage, statisticsPage, favoritesPage] = await Promise.all(
    [
      read('src/lib/pages/profile/index.tsx'),
      read('src/lib/pages/profile/lists.tsx'),
      read('src/lib/pages/profile/statistics.tsx'),
      read('src/lib/pages/profile/favorites.tsx'),
    ]
  );

  assertInOrder(profile, [
    'title="Statistics"',
    'title="TV Shows"',
    'title="❤️ Favourite TV Shows"',
    'title="Movies"',
    'title="❤️ Favourite Movies"',
    'title="Personalized Lists"',
  ]);

  // Every profile list is the shared rail, with a "See All" target aligned to
  // the section title.
  assert.match(profile, /from 'lib\/components\/shared\/MediaRail'/);
  assert.match(profile, /<MediaRail/);
  assert.doesNotMatch(profile, /<PosterCard/);

  for (const seeAllHref of [
    "'/profile/statistics' as Route",
    "'/tv-shows' as Route",
    "'/profile/favorites/tv-shows' as Route",
    "'/movies' as Route",
    "'/profile/favorites/movies' as Route",
    "'/profile/lists' as Route",
  ]) {
    assert.ok(
      profile.includes(seeAllHref),
      `Expected profile See All target ${seeAllHref}`
    );
  }

  // The "See All" destinations render one complete list, not another preview.
  assert.match(listsPage, /<MediaRail/);
  assert.match(favoritesPage, /<MediaGrid/);
  assert.match(statisticsPage, /Compare with Following/);
});

test('personalized lists can be created, edited, filled, and emptied from the profile', async () => {
  const [profile, createForm, editor, itemControls, detail, listRoute] =
    await Promise.all([
      read('src/lib/pages/profile/index.tsx'),
      read('src/lib/features/lists/create-list-form.tsx'),
      read('src/lib/features/lists/list-editor.tsx'),
      read('src/lib/features/lists/list-item-controls.tsx'),
      read('src/lib/pages/profile/list-detail.tsx'),
      read('src/app/profile/lists/[listId]/page.tsx'),
    ]);

  assert.match(profile, /<CreateCustomListForm \/>/);
  assert.match(createForm, /^'use client';/);
  assert.match(createForm, /createCustomList\(/);
  assert.match(createForm, /Create List/);
  assert.match(editor, /updateCustomList\(/);
  assert.match(editor, /deleteCustomList\(/);
  assert.match(editor, /Confirm Delete List/);
  assert.match(itemControls, /addTitleToCustomList\(/);
  assert.match(itemControls, /removeTitleFromCustomList\(/);
  assert.match(detail, /<AddLibraryTitleToListForm/);
  assert.match(detail, /<RemoveListItemButton/);
  assert.match(listRoute, /loadOwnCustomList\(listId\)/);
  assert.match(listRoute, /notFound\(\)/);
});

test('every movie and TV item carries the same library and favourite quick actions', async () => {
  const [poster, quickActions, provider, appProvider] = await Promise.all([
    read('src/lib/components/shared/PosterCard.tsx'),
    read('src/lib/features/library/media-quick-actions.tsx'),
    read('src/lib/features/library/media-library-provider.tsx'),
    read('src/lib/components/ui/provider.tsx'),
  ]);

  // The plus square adds to the library; once saved the card shows the "Added"
  // chip plus the heart that turns red when the title is favourited.
  assert.match(poster, /<MediaQuickActions/);
  assert.match(poster, /showAddedBadge=\{!status\}/);
  assert.match(quickActions, /^'use client';/);
  assert.match(quickActions, /background="gold\.400"/);
  assert.match(quickActions, /color="gray\.900"/);
  assert.match(quickActions, /FiPlus/);
  assert.match(quickActions, /Added/);
  assert.match(quickActions, /isFavorite \? 'red\.500' : 'white'/);
  assert.match(quickActions, /fill=\{isFavorite \? 'currentColor' : 'none'\}/);
  assert.match(quickActions, /isInLibrary \? \(\s*<FavoriteHeartButton/);
  assert.match(
    quickActions,
    /badgeSize = \{ base: '1\.5rem', md: '1\.75rem' \}/
  );

  assert.match(provider, /addToWatchlist\(item\)/);
  assert.match(provider, /updateFavorite\(\{/);
  assert.match(provider, /login_required/);
  assert.match(provider, /\/login\?callbackUrl=/);
  assert.match(appProvider, /<MediaLibraryProvider/);
});

test('shared library keys normalize TV statuses and index favourites', () => {
  const movieKey = getMediaLibraryKey({
    mediaType: MediaType.Movie,
    tmdbId: 10,
  });

  assert.equal(movieKey, 'movie:10');
  assert.equal(
    normalizeTvLibraryStatus(WatchStatus.Paused),
    WatchStatus.Planned
  );
  assert.equal(
    normalizeTvLibraryStatus(WatchStatus.Watching),
    WatchStatus.Watching
  );

  const statuses = toMediaLibraryStatusMap([
    { mediaType: MediaType.Movie, status: WatchStatus.Watched, tmdbId: 10 },
    { mediaType: MediaType.Tv, status: WatchStatus.Watching, tmdbId: 10 },
  ]);
  assert.equal(statuses.get('movie:10'), WatchStatus.Watched);
  assert.equal(statuses.get('tv:10'), WatchStatus.Watching);

  const favorites = toMediaFavoriteKeySet([
    { mediaType: MediaType.Tv, tmdbId: 20 },
  ]);
  assert.equal(favorites.has('tv:20'), true);
  assert.equal(favorites.has('movie:20'), false);
});

// biome-ignore lint/style/noDoneCallback: Node's test context provides awaited subtests.
test('PostgreSQL personalized lists stay owner-scoped, unique, capped, and duplicate-safe', async (t) => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await db.exec(
        await read(
          join('database', 'migrations', migrationName).replaceAll('\\', '/')
        )
      );
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

    const created = await getRows<{ id: string; name: string }>(
      db,
      INSERT_OWN_CUSTOM_LIST_QUERY,
      ['user-a', 'Comfort Rewatches', 'Cosy nights', 50]
    );
    const listId = created[0]?.id as string;
    assert.equal(created[0]?.name, 'Comfort Rewatches');

    await t.test(
      'list names are unique per owner, case-insensitively',
      async () => {
        assert.deepEqual(
          await getRows(db, INSERT_OWN_CUSTOM_LIST_QUERY, [
            'user-a',
            'comfort rewatches',
            '',
            50,
          ]),
          []
        );
        // A different owner may reuse the same name.
        assert.equal(
          (
            await getRows(db, INSERT_OWN_CUSTOM_LIST_QUERY, [
              'user-b',
              'Comfort Rewatches',
              '',
              50,
            ])
          ).length,
          1
        );
      }
    );

    await t.test('the list cap is enforced in SQL', async () => {
      assert.deepEqual(
        await getRows(db, INSERT_OWN_CUSTOM_LIST_QUERY, [
          'user-a',
          'One Too Many',
          '',
          1,
        ]),
        []
      );
    });

    await t.test('titles are added once and only by the owner', async () => {
      assert.equal(
        (
          await getRows(db, ADD_OWN_CUSTOM_LIST_ITEM_QUERY, [
            'user-a',
            listId,
            10,
            'movie',
            200,
          ])
        ).length,
        1
      );
      assert.deepEqual(
        await getRows(db, ADD_OWN_CUSTOM_LIST_ITEM_QUERY, [
          'user-a',
          listId,
          10,
          'movie',
          200,
        ]),
        []
      );
      assert.deepEqual(
        await getRows(db, ADD_OWN_CUSTOM_LIST_ITEM_QUERY, [
          'user-b',
          listId,
          11,
          'tv',
          200,
        ]),
        []
      );
      assert.deepEqual(
        await getRows(db, ADD_OWN_CUSTOM_LIST_ITEM_QUERY, [
          'user-a',
          listId,
          11,
          'tv',
          1,
        ]),
        []
      );
    });

    await t.test('reads and updates are scoped to the owner', async () => {
      const items = await getRows<{ media_type: string; tmdb_id: number }>(
        db,
        LIST_OWN_CUSTOM_LIST_ITEMS_QUERY,
        ['user-a', [listId]]
      );
      assert.deepEqual(
        items.map(({ media_type, tmdb_id }) => ({ media_type, tmdb_id })),
        [{ media_type: 'movie', tmdb_id: 10 }]
      );
      assert.deepEqual(
        await getRows(db, LIST_OWN_CUSTOM_LIST_ITEMS_QUERY, [
          'user-b',
          [listId],
        ]),
        []
      );

      const lists = await getRows<{ item_count: number; name: string }>(
        db,
        LIST_OWN_CUSTOM_LISTS_QUERY,
        ['user-a', 50]
      );
      assert.deepEqual(
        lists.map(({ item_count, name }) => ({ item_count, name })),
        [{ item_count: 1, name: 'Comfort Rewatches' }]
      );

      assert.deepEqual(
        await getRows(db, GET_OWN_CUSTOM_LIST_QUERY, ['user-b', listId]),
        []
      );
      assert.equal(
        (
          await getRows<{ name: string }>(db, UPDATE_OWN_CUSTOM_LIST_QUERY, [
            'user-a',
            listId,
            'Comfort Classics',
            'Renamed',
          ])
        )[0]?.name,
        'Comfort Classics'
      );
      assert.deepEqual(
        await getRows(db, UPDATE_OWN_CUSTOM_LIST_QUERY, [
          'user-b',
          listId,
          'Stolen',
          '',
        ]),
        []
      );
    });

    await t.test(
      'removals and deletions cascade for the owner only',
      async () => {
        assert.deepEqual(
          await getRows(db, REMOVE_OWN_CUSTOM_LIST_ITEM_QUERY, [
            'user-b',
            listId,
            10,
            'movie',
          ]),
          []
        );
        assert.equal(
          (
            await getRows(db, REMOVE_OWN_CUSTOM_LIST_ITEM_QUERY, [
              'user-a',
              listId,
              10,
              'movie',
            ])
          ).length,
          1
        );

        await getRows(db, ADD_OWN_CUSTOM_LIST_ITEM_QUERY, [
          'user-a',
          listId,
          12,
          'tv',
          200,
        ]);
        assert.deepEqual(
          await getRows(db, DELETE_OWN_CUSTOM_LIST_QUERY, ['user-b', listId]),
          []
        );
        assert.deepEqual(
          await getRows(db, DELETE_OWN_CUSTOM_LIST_QUERY, ['user-a', listId]),
          [{ id: listId }]
        );

        const orphans = await getRows<{ count: number }>(
          db,
          'select count(*)::int as count from custom_list_items where list_id = $1',
          [listId]
        );
        assert.equal(orphans[0]?.count, 0);
      }
    );
  } finally {
    await db.close();
  }
});
