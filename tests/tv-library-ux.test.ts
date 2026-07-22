/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  deriveTvLibraryStatus,
  getAvailableRegularEpisodes,
  getOptimisticTvLibraryProjection,
  getTvEpisodeKey,
  getTvLibraryProjection,
  getWatchedAvailableEpisodeKeys,
  groupTvLibraryItems,
  projectWatchedKeysForStatus,
} from '../src/lib/features/library/tv-library-state';
import type { TvLibraryItem } from '../src/lib/features/library/types';
import {
  REMOVE_OWN_LIBRARY_ITEM_QUERY,
  SET_OWN_TV_LIBRARY_STATE_QUERY,
} from '../src/lib/services/database/library-queries';
import { WatchStatus } from '../src/lib/types';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
  '0005_auth_lifecycle.sql',
  '0006_unify_library_membership.sql',
  '0007_reconcile_tv_progress_library.sql',
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

const availableEpisodes = getAvailableRegularEpisodes([
  { episode_count: 2, season_number: 0 },
  { episode_count: 2, season_number: 1 },
  { episode_count: 1, season_number: 2 },
]);

const getFixtureProgress = (status: TvLibraryItem['status']) => {
  if (status === WatchStatus.Completed) {
    return { progressPercent: 100, watchedEpisodeCount: 3 };
  }

  if (status === WatchStatus.Watching) {
    return { progressPercent: 33, watchedEpisodeCount: 1 };
  }

  return { progressPercent: 0, watchedEpisodeCount: 0 };
};

const makeItem = (
  tmdbId: number,
  status: TvLibraryItem['status']
): TvLibraryItem => {
  const progress = getFixtureProgress(status);

  return {
    ...progress,
    dateAdded: `2026-07-${String(30 - tmdbId).padStart(2, '0')}T10:00:00.000Z`,
    id: `row-${tmdbId}`,
    intentStatus: status,
    posterPath: null,
    status,
    title: `Show ${tmdbId}`,
    tmdbId,
    totalEpisodeCount: 3,
  };
};

test('TV Shows page has the exact required section names, order, and navigation targets', async () => {
  const [page, route, poster, searchState] = await Promise.all([
    read('src/lib/pages/tv-shows/index.tsx'),
    read('src/app/tv-shows/page.tsx'),
    read('src/lib/components/shared/PosterCard.tsx'),
    read('src/lib/pages/search/search-state.ts'),
  ]);

  assertInOrder(page, [
    'title="Watching"',
    'title="Planned to Watch"',
    'title="Finished"',
    'title="Discover TV Shows"',
  ]);
  assert.doesNotMatch(
    page,
    /recommendations|activity feed|upcoming schedule|recently viewed/i
  );
  assert.match(page, /const discoverTvShowsHref = '\/search\?type=tv'/);
  assert.match(page, /href=\{discoverTvShowsHref\}/);
  assert.match(searchState, /value === MediaType\.Tv \? MediaType\.Tv/);
  assert.match(poster, /tv: '\/tv\/show'/);
  assert.match(poster, /href=\{href\}/);
  assert.match(route, /redirect\('\/login\?callbackUrl=\/tv-shows'/);
  assert.match(route, /loadOwnTvLibraryItems\(\)/);
});

test('Watching, Planned to Watch, and Finished are deterministic and mutually exclusive', () => {
  assert.equal(availableEpisodes.length, 3, 'specials must not affect totals');
  assert.deepEqual(availableEpisodes.map(getTvEpisodeKey), [
    '1:1',
    '1:2',
    '2:1',
  ]);

  assert.equal(
    deriveTvLibraryStatus({
      intentStatus: WatchStatus.Planned,
      totalEpisodeCount: 3,
      watchedEpisodeCount: 1,
    }),
    WatchStatus.Watching
  );
  assert.equal(
    deriveTvLibraryStatus({
      intentStatus: WatchStatus.Watching,
      totalEpisodeCount: 3,
      watchedEpisodeCount: 0,
    }),
    WatchStatus.Watching
  );
  assert.equal(
    deriveTvLibraryStatus({
      intentStatus: WatchStatus.Paused,
      totalEpisodeCount: 3,
      watchedEpisodeCount: 0,
    }),
    WatchStatus.Planned
  );
  assert.equal(
    deriveTvLibraryStatus({
      intentStatus: WatchStatus.Planned,
      totalEpisodeCount: 3,
      watchedEpisodeCount: 3,
    }),
    WatchStatus.Completed
  );

  const items = [
    makeItem(1, WatchStatus.Watching),
    makeItem(2, WatchStatus.Planned),
    makeItem(3, WatchStatus.Completed),
  ];
  const groups = groupTvLibraryItems(items);
  const groupedIds = [
    ...groups.watching,
    ...groups.planned,
    ...groups.completed,
  ].map((item) => item.tmdbId);
  assert.deepEqual(groupedIds.toSorted(), [1, 2, 3]);
  assert.equal(new Set(groupedIds).size, items.length);
});

test('manual status transitions synchronize watched progress with the selected section', () => {
  const fullyWatched = new Set(availableEpisodes.map(getTvEpisodeKey));
  const movedToWatching = projectWatchedKeysForStatus({
    availableEpisodes,
    currentWatchedEpisodeKeys: fullyWatched,
    status: WatchStatus.Watching,
  });
  assert.equal(movedToWatching.size, 2);

  const movedToPlanned = projectWatchedKeysForStatus({
    availableEpisodes,
    currentWatchedEpisodeKeys: movedToWatching,
    status: WatchStatus.Planned,
  });
  assert.equal(movedToPlanned.size, 0);

  const movedToFinished = projectWatchedKeysForStatus({
    availableEpisodes,
    currentWatchedEpisodeKeys: movedToPlanned,
    status: WatchStatus.Completed,
  });
  assert.equal(movedToFinished.size, availableEpisodes.length);

  const oneEpisodeWatching = getOptimisticTvLibraryProjection(
    {
      ...makeItem(8, WatchStatus.Completed),
      totalEpisodeCount: 1,
      watchedEpisodeCount: 1,
    },
    WatchStatus.Watching
  );
  assert.equal(oneEpisodeWatching.status, WatchStatus.Watching);
  assert.equal(oneEpisodeWatching.watchedEpisodeCount, 0);
});

test('episode progress drives automatic completion, reopening, and new-episode behavior', () => {
  const oldAvailable = availableEpisodes.slice(0, 2);
  const watchedRows = [
    { episode_number: 1, season_number: 0, watched: true },
    { episode_number: 1, season_number: 1, watched: true },
    { episode_number: 2, season_number: 1, watched: true },
  ];
  const oldWatchedKeys = getWatchedAvailableEpisodeKeys(
    oldAvailable,
    watchedRows
  );
  const finished = getTvLibraryProjection({
    availableEpisodes: oldAvailable,
    intentStatus: WatchStatus.Completed,
    watchedEpisodeKeys: oldWatchedKeys,
  });
  assert.equal(finished.status, WatchStatus.Completed);
  assert.equal(finished.progressPercent, 100);

  const afterNewEpisode = getTvLibraryProjection({
    availableEpisodes,
    intentStatus: WatchStatus.Completed,
    watchedEpisodeKeys: oldWatchedKeys,
  });
  assert.equal(afterNewEpisode.status, WatchStatus.Watching);
  assert.equal(afterNewEpisode.watchedEpisodeCount, 2);

  const reopenedKeys = new Set(oldWatchedKeys);
  reopenedKeys.delete('1:2');
  const reopened = getTvLibraryProjection({
    availableEpisodes: oldAvailable,
    intentStatus: WatchStatus.Completed,
    watchedEpisodeKeys: reopenedKeys,
  });
  assert.equal(reopened.status, WatchStatus.Watching);
});

test('page controls autosave, remove, show empty actions, and roll back failed persistence', async () => {
  const page = await read('src/lib/pages/tv-shows/index.tsx');

  assert.match(page, /await updateTvLibraryStatus/);
  assert.match(page, /getOptimisticTvLibraryProjection/);
  assert.match(page, /previousItem/);
  assert.match(
    page,
    /role=\{mutation\.tone === 'error' \? 'alert' : 'status'\}/
  );
  assert.match(page, /await removeTvShowFromLibrary/);
  assert.match(page, /restoreTvLibraryItem\(current, item\)/);
  assert.match(page, /action=\{<DiscoverTvShowsButton \/>\}/);
  assert.match(page, /No \$\{title\.toLowerCase\(\)\} TV shows yet/);
  assert.match(page, /router\.refresh\(\)/);
});

test('shared poster cards and responsive grids cover detail navigation, mobile, and desktop', async () => {
  const page = await read('src/lib/pages/tv-shows/index.tsx');

  assert.match(page, /<PosterCard/);
  assert.match(page, /mediaType=\{MediaType\.Tv\}/);
  assert.match(page, /progress=\{item\.progressPercent\}/);
  assert.match(page, /base: 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(page, /md: 'repeat\(5, minmax\(0, 1fr\)\)'/);
  assert.match(page, /xl: 'repeat\(7, minmax\(0, 1fr\)\)'/);
  assert.match(page, /Remove from library/);
  assertInOrder(page, [
    '<option value={WatchStatus.Watching}>Watching</option>',
    '<option value={WatchStatus.Planned}>Planned to Watch</option>',
    '<option value={WatchStatus.Completed}>Finished</option>',
  ]);
});

test('atomic TV state persistence and removal remain owner-scoped', async () => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }
    await insertProfile(db, 'user-a', 'alice');
    await insertProfile(db, 'user-b', 'bob');

    const finishedValues = JSON.stringify([
      { episode_number: 1, season_number: 1, watched: true },
      { episode_number: 2, season_number: 1, watched: true },
    ]);
    await db.query(SET_OWN_TV_LIBRARY_STATE_QUERY, [
      'user-a',
      100,
      'completed',
      finishedValues,
      new Date(),
    ]);
    await db.query(SET_OWN_TV_LIBRARY_STATE_QUERY, [
      'user-b',
      100,
      'planned',
      JSON.stringify([{ episode_number: 1, season_number: 1, watched: false }]),
      null,
    ]);

    const saved = await db.query<{
      user_id: string;
      watch_status: string;
    }>(
      `select user_id, watch_status from user_media
       where tmdb_id = 100 order by user_id`
    );
    assert.deepEqual(saved.rows, [
      { user_id: 'user-a', watch_status: 'completed' },
      { user_id: 'user-b', watch_status: 'planned' },
    ]);

    await db.query(
      `insert into watchlist_items (user_id, tmdb_id, media_type)
       values ('user-a', 100, 'tv'), ('user-b', 100, 'tv')`
    );
    await db.query(REMOVE_OWN_LIBRARY_ITEM_QUERY, ['user-a', 100, 'tv']);

    const remainingMedia = await db.query<{ user_id: string }>(
      'select user_id from user_media where tmdb_id = 100 order by user_id'
    );
    const remainingProgress = await db.query<{ user_id: string }>(
      `select distinct user_id from episode_progress
       where tmdb_show_id = 100 order by user_id`
    );
    const remainingWatchlist = await db.query<{ user_id: string }>(
      `select user_id from watchlist_items
       where tmdb_id = 100 order by user_id`
    );
    assert.deepEqual(remainingMedia.rows, [{ user_id: 'user-b' }]);
    assert.deepEqual(remainingProgress.rows, [{ user_id: 'user-b' }]);
    assert.deepEqual(remainingWatchlist.rows, [{ user_id: 'user-b' }]);
  } finally {
    await db.close();
  }
});

test('progress-only legacy shows are backfilled into the canonical TV library', async () => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames.slice(0, -1)) {
      await runMigration(db, migrationName);
    }
    await insertProfile(db, 'user-a', 'alice');
    await db.query(
      `insert into episode_progress (
        user_id, tmdb_show_id, season_number, episode_number, watched, watched_at
      ) values ('user-a', 200, 1, 1, true, now())`
    );
    await runMigration(db, migrationNames.at(-1) as string);

    const rows = await db.query<{ watch_status: string }>(
      `select watch_status from user_media
       where user_id = 'user-a' and tmdb_id = 200 and media_type = 'tv'`
    );
    assert.deepEqual(rows.rows, [{ watch_status: 'watching' }]);
  } finally {
    await db.close();
  }
});

test('episode and season mutations reconcile status while specials stay independent', async () => {
  const [actions, server, progressControl] = await Promise.all([
    read('src/lib/features/tracking/actions.ts'),
    read('src/lib/features/library/tv-library.server.ts'),
    read('src/lib/features/tracking/episode-progress-button.tsx'),
  ]);

  assert.match(actions, /setOwnTvEpisodeWatchedAndReconcile\(input\)/);
  assert.match(actions, /setOwnTvSeasonWatchedAndReconcile/);
  assert.match(actions, /revalidatePath\('\/tv-shows'\)/);
  assert.match(
    actions,
    /return \{ status: 'error', watched: !input\.watched \}/
  );
  assert.match(server, /if \(seasonNumber === 0\)/);
  assert.match(server, /setOwnEpisodeProgressBatch/);
  assert.match(server, /setOwnTvLibraryState/);
  assert.match(progressControl, /setWatched\(previousWatched\)/);
});

test('server boundaries derive ownership from the authenticated session', async () => {
  const [database, actions, loader] = await Promise.all([
    read('src/lib/services/database/tracking.server.ts'),
    read('src/lib/features/library/actions.ts'),
    read('src/lib/pages/tv-shows/load-tv-library.server.ts'),
  ]);

  for (const helper of [
    'listOwnEpisodeProgressForTvLibrary',
    'setOwnEpisodeProgressBatch',
    'setOwnTvLibraryState',
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
  assert.match(loader, /listOwnMediaByType\(MediaType\.Tv\)/);
  assert.match(loader, /listOwnEpisodeProgressForTvLibrary\(\)/);
});
