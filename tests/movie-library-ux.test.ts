/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  groupMovieLibraryItems,
  removeMovieLibraryItem,
  restoreMovieLibraryItem,
  updateMovieLibraryItemStatus,
} from '../src/lib/features/library/movie-library-state';
import type { MovieLibraryItem } from '../src/lib/features/library/types';
import {
  ADD_OWN_LIBRARY_ITEM_QUERY,
  REMOVE_OWN_LIBRARY_ITEM_QUERY,
  SET_OWN_MOVIE_LIBRARY_STATUS_QUERY,
} from '../src/lib/services/database/library-queries';
import { WatchStatus } from '../src/lib/types';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
  '0005_auth_lifecycle.sql',
  '0006_unify_library_membership.sql',
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

const runMigration = async (db: PGliteInterface, name: string) => {
  const migration = await read(
    join('database', 'migrations', name).replaceAll('\\', '/')
  );
  await db.exec(migration);
};

const insertProfile = async (
  db: PGliteInterface,
  userId: string,
  username: string
) => {
  await db.query(
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
      values ($1, $2, $2, $2, $3, 'private', now())
    `,
    [userId, username, `${username}@example.com`]
  );
};

test('Movies page has only the required ordered library sections and navigation targets', async () => {
  const [page, header, poster, searchState] = await Promise.all([
    read('src/lib/pages/movies/index.tsx'),
    read('src/lib/layout/Header.tsx'),
    read('src/lib/components/shared/PosterCard.tsx'),
    read('src/lib/pages/search/search-state.ts'),
  ]);

  assertInOrder(page, [
    'title="Planned to Watch"',
    'title="Finished"',
    'title="Discover Movies"',
  ]);
  assert.doesNotMatch(
    page,
    /recommendations|recently viewed|trending|genres|activity feed/i
  );
  assert.match(page, /href=\{discoverMoviesHref\}/);
  assert.match(page, /const discoverMoviesHref = '\/search\?type=movie'/);
  assert.match(
    searchState,
    /value === MediaType\.Tv \? MediaType\.Tv : MediaType\.Movie/
  );
  assert.match(poster, /movie: '\/movie'/);
  assert.match(poster, /href=\{href\}/);

  const authenticatedNavStart = header.indexOf(
    'const authenticatedNavItems: Array<NavItem>'
  );
  const authenticatedNavEnd = header.indexOf(
    '\nconst NavLink',
    authenticatedNavStart
  );
  const authenticatedNav = header.slice(
    authenticatedNavStart,
    authenticatedNavEnd
  );
  assertInOrder(authenticatedNav, [
    "label: 'Movies'",
    "label: 'TV Shows'",
    "label: 'Search'",
    "label: 'Profile'",
  ]);
  assert.equal(authenticatedNav.match(/label:/g)?.length, 4);
  assert.match(
    header,
    /display=\{isAuthenticated \? \{ base: 'none', md: 'flex' \} : 'flex'\}/
  );
  assert.match(header, /display=\{\{ base: 'block', md: 'none' \}\}/);
  assert.match(header, /bottom=\{0\}/);
  assert.match(header, /position="fixed"/);
});

test('Movies page groups exact statuses and renders direct discover empty states', async () => {
  const page = await read('src/lib/pages/movies/index.tsx');
  const fixtures: Array<MovieLibraryItem> = [
    {
      dateAdded: '2026-07-22T10:00:00.000Z',
      id: 'planned-row',
      posterPath: null,
      status: WatchStatus.Planned,
      title: 'Planned movie',
      tmdbId: 10,
    },
    {
      dateAdded: '2026-07-21T10:00:00.000Z',
      id: 'finished-row',
      posterPath: null,
      status: WatchStatus.Watched,
      title: 'Finished movie',
      tmdbId: 20,
    },
  ];
  const initialGroups = groupMovieLibraryItems(fixtures);

  assert.deepEqual(
    initialGroups.planned.map((item) => item.tmdbId),
    [10]
  );
  assert.deepEqual(
    initialGroups.finished.map((item) => item.tmdbId),
    [20]
  );

  const movedToFinished = updateMovieLibraryItemStatus(
    fixtures,
    10,
    WatchStatus.Watched
  );
  assert.deepEqual(
    groupMovieLibraryItems(movedToFinished).finished.map((item) => item.tmdbId),
    [10, 20]
  );

  const movedBackToPlanned = updateMovieLibraryItemStatus(
    movedToFinished,
    10,
    WatchStatus.Planned
  );
  assert.deepEqual(
    groupMovieLibraryItems(movedBackToPlanned).planned.map(
      (item) => item.tmdbId
    ),
    [10]
  );

  const removed = removeMovieLibraryItem(fixtures, 10);
  assert.deepEqual(
    removed.map((item) => item.tmdbId),
    [20]
  );
  assert.deepEqual(
    restoreMovieLibraryItem(removed, fixtures[0]).map((item) => item.tmdbId),
    [10, 20]
  );

  assert.match(page, /groupMovieLibraryItems\(items\)/);
  assert.match(page, /items\.length > 0/);
  assert.match(page, /action=\{<DiscoverMoviesButton \/>\}/);
  assert.match(page, /No \$\{title\.toLowerCase\(\)\} movies yet/);
});

test('status and removal controls are immediate, automatic, and recover failed mutations', async () => {
  const page = await read('src/lib/pages/movies/index.tsx');

  assert.match(page, /onChange=\{\(event\) =>/);
  assert.match(page, /setItems\(\(current\) =>/);
  assert.match(page, /await updateMovieLibraryStatus/);
  assert.match(
    page,
    /updateMovieLibraryItemStatus\(current, item\.tmdbId, previousStatus\)/
  );
  assert.match(page, /await removeMovieFromLibrary/);
  assert.match(page, /restoreMovieLibraryItem\(current, item\)/);
  assert.match(
    page,
    /role=\{mutation\.tone === 'error' \? 'alert' : 'status'\}/
  );
  assert.match(page, /router\.refresh\(\)/);
});

test('shared poster cards and responsive grids cover desktop and three-column mobile rendering', async () => {
  const page = await read('src/lib/pages/movies/index.tsx');

  assert.match(page, /<PosterCard/);
  assert.match(page, /base: 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(page, /md: 'repeat\(5, minmax\(0, 1fr\)\)'/);
  assert.match(page, /xl: 'repeat\(7, minmax\(0, 1fr\)\)'/);
  assert.match(
    page,
    /<option value=\{WatchStatus\.Planned\}>Planned to Watch<\/option>/
  );
  assert.match(
    page,
    /<option value=\{WatchStatus\.Watched\}>Finished<\/option>/
  );
  assert.match(page, /Remove from library/);
});

test('database library operations persist transitions, prevent duplicates, preserve ratings, and enforce ownership', async () => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames.slice(0, -1)) {
      await runMigration(db, migrationName);
    }

    await insertProfile(db, 'user-a', 'alice');
    await insertProfile(db, 'user-b', 'bob');
    await db.query(
      `insert into watchlist_items (user_id, tmdb_id, media_type)
       values ('user-a', 100, 'movie'), ('user-a', 101, 'movie')`
    );
    await db.query(
      `insert into user_media (user_id, tmdb_id, media_type, watch_status)
       values ('user-a', 101, 'movie', 'watched'), ('user-b', 100, 'movie', 'planned')`
    );
    await runMigration(db, migrationNames.at(-1) as string);

    const migrated = await db.query<{
      row_count: number;
      watch_status: string;
    }>(
      `select count(*)::int as row_count, max(watch_status) as watch_status
       from user_media where user_id = 'user-a' and tmdb_id = 101`
    );
    assert.equal(migrated.rows[0]?.row_count, 1);
    assert.equal(migrated.rows[0]?.watch_status, 'watched');

    await db.query(
      `insert into ratings (user_id, tmdb_id, media_type, season_number, episode_number, rating)
       values ('user-a', 100, 'movie', -1, -1, 9)`
    );

    await db.query(SET_OWN_MOVIE_LIBRARY_STATUS_QUERY, [
      'user-a',
      100,
      'watched',
      new Date(),
    ]);
    const movedToFinished = await db.query<{ watch_status: string }>(
      `select watch_status from user_media
       where user_id = 'user-a' and tmdb_id = 100 and media_type = 'movie'`
    );
    assert.equal(movedToFinished.rows[0]?.watch_status, 'watched');

    await db.query(SET_OWN_MOVIE_LIBRARY_STATUS_QUERY, [
      'user-a',
      100,
      'planned',
      null,
    ]);
    const movedToPlanned = await db.query<{ watch_status: string }>(
      `select watch_status from user_media
       where user_id = 'user-a' and tmdb_id = 100 and media_type = 'movie'`
    );
    assert.equal(movedToPlanned.rows[0]?.watch_status, 'planned');

    await db.query(SET_OWN_MOVIE_LIBRARY_STATUS_QUERY, [
      'user-a',
      100,
      'planned',
      null,
    ]);

    const ownerRows = await db.query<{
      row_count: number;
      watch_status: string;
    }>(
      `select count(*)::int as row_count, max(watch_status) as watch_status
       from user_media where user_id = 'user-a' and tmdb_id = 100`
    );
    assert.equal(ownerRows.rows[0]?.row_count, 1);
    assert.equal(ownerRows.rows[0]?.watch_status, 'planned');

    await db.query(SET_OWN_MOVIE_LIBRARY_STATUS_QUERY, [
      'user-b',
      100,
      'watched',
      new Date(),
    ]);
    const separated = await db.query<{ user_id: string; watch_status: string }>(
      'select user_id, watch_status from user_media where tmdb_id = 100 order by user_id'
    );
    assert.deepEqual(separated.rows, [
      { user_id: 'user-a', watch_status: 'planned' },
      { user_id: 'user-b', watch_status: 'watched' },
    ]);

    await db.query(REMOVE_OWN_LIBRARY_ITEM_QUERY, ['user-a', 100, 'movie']);
    const remainingMedia = await db.query<{ user_id: string }>(
      'select user_id from user_media where tmdb_id = 100'
    );
    const remainingWatchlist = await db.query<{ count: number }>(
      `select count(*)::int as count from watchlist_items
       where user_id = 'user-a' and tmdb_id = 100`
    );
    const retainedRating = await db.query<{ rating: number }>(
      `select rating::float as rating from ratings
       where user_id = 'user-a' and tmdb_id = 100 and media_type = 'movie'`
    );
    assert.deepEqual(remainingMedia.rows, [{ user_id: 'user-b' }]);
    assert.equal(remainingWatchlist.rows[0]?.count, 0);
    assert.equal(retainedRating.rows[0]?.rating, 9);
  } finally {
    await db.close();
  }
});

test('adding a saved movie creates one planned library entry without resetting an existing status', async () => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }
    await insertProfile(db, 'user-a', 'alice');

    await db.query(ADD_OWN_LIBRARY_ITEM_QUERY, ['user-a', 200, 'movie', '']);
    await db.query(ADD_OWN_LIBRARY_ITEM_QUERY, ['user-a', 200, 'movie', '']);
    await db.query(SET_OWN_MOVIE_LIBRARY_STATUS_QUERY, [
      'user-a',
      200,
      'watched',
      new Date(),
    ]);
    await db.query(ADD_OWN_LIBRARY_ITEM_QUERY, ['user-a', 200, 'movie', '']);

    const rows = await db.query<{ row_count: number; watch_status: string }>(
      `select count(*)::int as row_count, max(watch_status) as watch_status
       from user_media where user_id = 'user-a' and tmdb_id = 200`
    );
    assert.equal(rows.rows[0]?.row_count, 1);
    assert.equal(rows.rows[0]?.watch_status, 'watched');
  } finally {
    await db.close();
  }
});

test('server boundaries derive ownership from the authenticated session and never accept a user id', async () => {
  const [database, actions, loader] = await Promise.all([
    read('src/lib/services/database/tracking.server.ts'),
    read('src/lib/features/library/actions.ts'),
    read('src/lib/pages/movies/load-movie-library.server.ts'),
  ]);

  for (const helper of [
    'listOwnMediaByType',
    'setOwnMovieLibraryStatus',
    'removeOwnLibraryItem',
  ]) {
    const start = database.indexOf(`export const ${helper}`);
    const end = database.indexOf('\nexport const ', start + 1);
    const body = database.slice(start, end === -1 ? undefined : end);
    assert.notEqual(start, -1, `Missing ${helper}`);
    assert.match(body, /getAuthenticatedUserId\(\)/);
    assert.doesNotMatch(body.slice(0, body.indexOf('=>')), /userId/);
  }

  assert.doesNotMatch(actions, /userId/);
  assert.match(loader, /listOwnMediaByType\(MediaType\.Movie\)/);
  assert.doesNotMatch(loader, /listOwnWatchlistItems/);
});
