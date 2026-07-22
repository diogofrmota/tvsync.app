/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirement they protect. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are invoked only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  SET_OWN_EPISODE_PROGRESS_BATCH_QUERY,
  SET_OWN_TV_LIBRARY_STATE_QUERY,
} from '../src/lib/services/database/library-queries';
import {
  findAdjacentSeasonNumber,
  resolveEpisodeNeighbors,
} from '../src/lib/services/tmdb/tv/episode/navigation';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
  '0005_auth_lifecycle.sql',
  '0006_unify_library_membership.sql',
  '0007_reconcile_tv_progress_library.sql',
  '0008_profile_experience.sql',
] as const;

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

const runMigration = async (db: PGliteInterface, name: string) => {
  const migration = await read(join('database', 'migrations', name));
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

// ---------------------------------------------------------------------------
// 2.8 TV Show Season Page
// ---------------------------------------------------------------------------

test('season page fetches show summary, season detail, and initial progress state', async () => {
  const route = await read(
    'src/app/tv/show/[id]/season/[seasonNumber]/page.tsx'
  );

  assert.match(route, /getTVSeasonDetailsServer\(/);
  assert.match(route, /getTvShowDetail\(showId\)\.catch/);
  assert.match(route, /getSeasonProgressState\(/);
  assert.match(route, /showName=\{show\?\.name \|\| show\?\.original_name/);
});

test('season page renders required content: show name, number/title, poster, description, release year, episode count, watched progress, episode list', async () => {
  const page = await read('src/lib/pages/tv/season/detail/index.tsx');

  assert.match(page, /\{showName\}/);
  assert.match(page, /seasonTitle/);
  assert.match(page, /Season \{data\.season_number\}/);
  assert.match(page, /<PosterImage/);
  assert.match(page, /data\.overview/);
  assert.match(page, /getReleaseYear\(data\.air_date\)/);
  assert.match(page, /\{data\.episodes\.length\} episodes/);
  assert.match(page, /<SeasonEpisodeList/);
  assert.match(
    page,
    /href=\{`\/tv\/show\/\$\{showId\}` as Route\}/,
    'season page links the show name back to the show detail page'
  );
});

test('season page shows a simple state for empty and unreleased seasons', async () => {
  const page = await read('src/lib/pages/tv/season/detail/index.tsx');

  assert.match(page, /isSeasonUnreleased/);
  assert.match(page, /This season has not premiered yet/);
  assert.match(
    page,
    /TMDB does not have episode information for this season yet/
  );
  assert.match(page, /data\.episodes\.length > 0 \? \(\s*<SeasonEpisodeList/);
});

test('whole-season watched and unwatched controls exist, are batched, and roll back on failure', async () => {
  const list = await read(
    'src/lib/pages/tv/season/detail/components/season-episode-list.tsx'
  );

  assert.match(list, /Mark season watched/);
  assert.match(list, /Mark season unwatched/);
  assert.match(list, /await setSeasonWatched\(/);
  assert.match(list, /setWatchedEpisodeNumbers\(previous\)/);
  assert.match(list, /disabled=\{episodeCount === 0\}/);
});

test('individual episode watched/unwatched toggles exist, update local state, and roll back on failure', async () => {
  const list = await read(
    'src/lib/pages/tv/season/detail/components/season-episode-list.tsx'
  );

  assert.match(list, /await setEpisodeWatched\(/);
  assert.match(list, /handleToggleEpisode/);
  assert.match(list, /Mark unwatched/);
  assert.match(list, /Mark watched/);
  assert.match(list, /setWatchedEpisodeNumbers\(previous\)/);
});

test('season episode list is a single source of truth so bulk and individual changes stay consistent', async () => {
  const list = await read(
    'src/lib/pages/tv/season/detail/components/season-episode-list.tsx'
  );
  const page = await read('src/lib/pages/tv/season/detail/index.tsx');

  // The season page must not mount independent per-episode progress
  // components that could drift out of sync after a bulk mutation; instead
  // one client component owns the watched-episode set for the whole season.
  assert.doesNotMatch(page, /<EpisodeProgressButton/);
  assert.doesNotMatch(page, /<SeasonProgressControls/);
  assert.match(
    list,
    /const \[watchedEpisodeNumbers, setWatchedEpisodeNumbers\] = useState/
  );
  assert.match(
    list,
    /setWatchedEpisodeNumbers\(new Set\(result\.watchedEpisodeNumbers\)\)/
  );
});

test('selecting an episode opens its details page', async () => {
  const list = await read(
    'src/lib/pages/tv/season/detail/components/season-episode-list.tsx'
  );

  assert.match(
    list,
    /`\/tv\/show\/\$\{showId\}\/season\/\$\{seasonNumber\}\/episode\/\$\{episodeNumber\}` as Route/
  );
  const linkCount = (list.match(/<Link\s/g) ?? []).length;
  assert.ok(linkCount >= 2, 'still and title both link to the episode page');
});

test('season progress is shown as watched/total plus a percentage progress bar', async () => {
  const list = await read(
    'src/lib/pages/tv/season/detail/components/season-episode-list.tsx'
  );

  assert.match(list, /\{watchedCount\} \/ \{episodeCount\} watched/);
  assert.match(list, /<Progress\.Root max=\{100\} value=\{progressPercent\}/);
});

// ---------------------------------------------------------------------------
// 2.9 Individual Episode Details Page
// ---------------------------------------------------------------------------

test('episode route fetches show summary, neighbor seasons, watched state, and next-unwatched summary', async () => {
  const route = await read(
    'src/app/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]/page.tsx'
  );

  assert.match(route, /getTvShowDetail\(showId\)/);
  assert.match(route, /getTVSeasonDetailsServer\(/);
  assert.match(route, /findAdjacentSeasonNumber\(/);
  assert.match(route, /resolveEpisodeNeighbors\(/);
  assert.match(route, /getEpisodeProgressState\(/);
  assert.match(route, /getTvProgressSummary\(showId\)/);
});

test('episode page renders required content: show name, season/episode number, title, image, release date, runtime, IMDb rating, description', async () => {
  const page = await read('src/lib/pages/tv/episode/detail/index.tsx');

  assert.match(page, /\{showName\}/);
  assert.match(page, /Season \{data\.season_number\}/);
  assert.match(page, /Episode \{data\.episode_number\}/);
  assert.match(page, /\{title\}/);
  assert.match(page, /<Image/);
  assert.match(page, /data\.air_date \|\| 'Air date unavailable'/);
  assert.match(page, /formatRuntime\(data\.runtime\)/);
  assert.match(page, /IMDb rating/);
  assert.match(page, /data\.overview/);
});

test('episode IMDb rating is a genuine neutral unavailable state, never a TMDB rating', async () => {
  const page = await read('src/lib/pages/tv/episode/detail/index.tsx');

  assert.match(page, /IMDb rating[\s\S]*Unavailable/);
  assert.match(page, /not provide a genuine IMDb episode\s+rating value/);
  assert.doesNotMatch(page, /vote_average/);
  assert.doesNotMatch(page, /TMDB rating/);
});

test('episode page provides Mark as Watched, Mark as Unwatched, Previous Episode, and Next Episode', async () => {
  const page = await read('src/lib/pages/tv/episode/detail/index.tsx');
  const panel = await read(
    'src/lib/pages/tv/episode/detail/components/episode-progress-panel.tsx'
  );

  assert.match(panel, /Mark as Watched/);
  assert.match(panel, /Mark as Unwatched/);
  assert.match(page, /Previous Episode/);
  assert.match(page, /Next Episode/);
});

test('previous/next controls are omitted, not merely disabled, when no destination exists', async () => {
  const page = await read('src/lib/pages/tv/episode/detail/index.tsx');

  assert.match(page, /\{previous \? \(/);
  assert.match(page, /\{next \? \(/);
  assert.doesNotMatch(page, /disabled=\{!previous\}/);
  assert.doesNotMatch(page, /disabled=\{!next\}/);
});

test('opening the episode page never marks it watched, and repeated toggles cannot duplicate progress', async () => {
  const route = await read(
    'src/app/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]/page.tsx'
  );
  const panel = await read(
    'src/lib/pages/tv/episode/detail/components/episode-progress-panel.tsx'
  );

  assert.doesNotMatch(route, /setEpisodeWatched\(/);
  assert.match(panel, /await setEpisodeWatched\(/);
  assert.match(panel, /onClick=\{handleClick\}/);
});

test('marking an episode reconciles season, show, and next-unwatched state together', async () => {
  const panel = await read(
    'src/lib/pages/tv/episode/detail/components/episode-progress-panel.tsx'
  );
  const server = await read('src/lib/features/library/tv-library.server.ts');
  const actions = await read('src/lib/features/tracking/actions.ts');

  assert.match(panel, /await getTvProgressSummary\(tmdbShowId\)/);
  assert.match(panel, /setNextEpisode\(summary\.nextEpisode\)/);
  assert.match(actions, /setOwnTvEpisodeWatchedAndReconcile\(input\)/);
  assert.match(server, /saveTvLibraryProjection/);
  assert.match(server, /getTvLibraryProjection/);
});

test('the next unwatched episode is clearly identified on the episode page', async () => {
  const panel = await read(
    'src/lib/pages/tv/episode/detail/components/episode-progress-panel.tsx'
  );

  assert.match(panel, /This is your next unwatched episode\./);
  assert.match(panel, /Next unwatched episode:/);
  assert.match(panel, /All available episodes watched/);
});

// ---------------------------------------------------------------------------
// Previous/Next navigation — pure boundary logic
// ---------------------------------------------------------------------------

test('findAdjacentSeasonNumber only considers regular seasons with listed episodes', () => {
  const seasons = [
    { episode_count: 6, season_number: 0 },
    { episode_count: 8, season_number: 1 },
    { episode_count: 0, season_number: 2 },
    { episode_count: 10, season_number: 3 },
  ];

  assert.equal(findAdjacentSeasonNumber(seasons, 1, 'next'), 3);
  assert.equal(findAdjacentSeasonNumber(seasons, 3, 'next'), null);
  assert.equal(findAdjacentSeasonNumber(seasons, 3, 'previous'), 1);
  assert.equal(findAdjacentSeasonNumber(seasons, 1, 'previous'), null);
});

test('resolveEpisodeNeighbors stays within the season when possible', () => {
  const currentSeasonEpisodes = [
    { episode_number: 1 },
    { episode_number: 2 },
    { episode_number: 3 },
  ];

  const middle = resolveEpisodeNeighbors({
    currentSeasonEpisodes,
    currentSeasonNumber: 1,
    episodeNumber: 2,
    nextSeasonEpisodes: null,
    nextSeasonNumber: null,
    previousSeasonEpisodes: null,
    previousSeasonNumber: null,
  });
  assert.deepEqual(middle.previous, { episodeNumber: 1, seasonNumber: 1 });
  assert.deepEqual(middle.next, { episodeNumber: 3, seasonNumber: 1 });
});

test('resolveEpisodeNeighbors crosses season boundaries correctly', () => {
  const currentSeasonEpisodes = [{ episode_number: 1 }, { episode_number: 2 }];

  const atSeasonStart = resolveEpisodeNeighbors({
    currentSeasonEpisodes,
    currentSeasonNumber: 2,
    episodeNumber: 1,
    nextSeasonEpisodes: null,
    nextSeasonNumber: null,
    previousSeasonEpisodes: [
      { episode_number: 1 },
      { episode_number: 2 },
      { episode_number: 3 },
    ],
    previousSeasonNumber: 1,
  });
  assert.deepEqual(atSeasonStart.previous, {
    episodeNumber: 3,
    seasonNumber: 1,
  });

  const atSeasonEnd = resolveEpisodeNeighbors({
    currentSeasonEpisodes,
    currentSeasonNumber: 2,
    episodeNumber: 2,
    nextSeasonEpisodes: [{ episode_number: 1 }, { episode_number: 2 }],
    nextSeasonNumber: 3,
    previousSeasonEpisodes: null,
    previousSeasonNumber: null,
  });
  assert.deepEqual(atSeasonEnd.next, { episodeNumber: 1, seasonNumber: 3 });
});

test('resolveEpisodeNeighbors omits a destination when none exists (first/last episode of the show)', () => {
  const currentSeasonEpisodes = [{ episode_number: 1 }, { episode_number: 2 }];

  const veryFirstEpisode = resolveEpisodeNeighbors({
    currentSeasonEpisodes,
    currentSeasonNumber: 1,
    episodeNumber: 1,
    nextSeasonEpisodes: null,
    nextSeasonNumber: null,
    previousSeasonEpisodes: null,
    previousSeasonNumber: null,
  });
  assert.equal(veryFirstEpisode.previous, null);

  const veryLastEpisode = resolveEpisodeNeighbors({
    currentSeasonEpisodes,
    currentSeasonNumber: 5,
    episodeNumber: 2,
    nextSeasonEpisodes: null,
    nextSeasonNumber: null,
    previousSeasonEpisodes: null,
    previousSeasonNumber: null,
  });
  assert.equal(veryLastEpisode.next, null);
});

test('resolveEpisodeNeighbors handles missing/unsorted episode numbers safely', () => {
  const unsortedCurrentSeasonEpisodes = [
    { episode_number: 3 },
    { episode_number: 1 },
    { episode_number: 2 },
  ];

  const result = resolveEpisodeNeighbors({
    currentSeasonEpisodes: unsortedCurrentSeasonEpisodes,
    currentSeasonNumber: 1,
    episodeNumber: 2,
    nextSeasonEpisodes: null,
    nextSeasonNumber: null,
    previousSeasonEpisodes: null,
    previousSeasonNumber: null,
  });
  assert.deepEqual(result.previous, { episodeNumber: 1, seasonNumber: 1 });
  assert.deepEqual(result.next, { episodeNumber: 3, seasonNumber: 1 });

  const missingEpisode = resolveEpisodeNeighbors({
    currentSeasonEpisodes: unsortedCurrentSeasonEpisodes,
    currentSeasonNumber: 1,
    episodeNumber: 99,
    nextSeasonEpisodes: null,
    nextSeasonNumber: null,
    previousSeasonEpisodes: null,
    previousSeasonNumber: null,
  });
  assert.equal(missingEpisode.previous, null);
  assert.equal(missingEpisode.next, null);
});

// ---------------------------------------------------------------------------
// Data integrity, duplicate prevention, and bulk-failure handling
// ---------------------------------------------------------------------------

test('duplicate episode-progress requests upsert one row instead of duplicating it', async () => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }
    await insertProfile(db, 'user-a', 'alice');

    const values = JSON.stringify([
      { episode_number: 1, season_number: 1, watched: true },
    ]);
    await db.query(SET_OWN_EPISODE_PROGRESS_BATCH_QUERY, [
      'user-a',
      300,
      values,
    ]);
    await db.query(SET_OWN_EPISODE_PROGRESS_BATCH_QUERY, [
      'user-a',
      300,
      values,
    ]);

    const rows = await db.query<{ watched: boolean }>(
      `select watched from episode_progress
       where user_id = 'user-a' and tmdb_show_id = 300
         and season_number = 1 and episode_number = 1`
    );
    assert.equal(
      rows.rows.length,
      1,
      'repeated requests must not duplicate progress rows'
    );
    assert.equal(rows.rows[0].watched, true);
  } finally {
    await db.close();
  }
});

test('a failing bulk season update does not partially corrupt progress', async () => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }
    await insertProfile(db, 'user-a', 'alice');

    await db.query(SET_OWN_EPISODE_PROGRESS_BATCH_QUERY, [
      'user-a',
      400,
      JSON.stringify([{ episode_number: 1, season_number: 1, watched: true }]),
    ]);

    const invalidBatch = JSON.stringify([
      { episode_number: 1, season_number: 1, watched: false },
      { episode_number: 0, season_number: 1, watched: true },
    ]);

    await assert.rejects(
      db.query(SET_OWN_EPISODE_PROGRESS_BATCH_QUERY, [
        'user-a',
        400,
        invalidBatch,
      ])
    );

    const rows = await db.query<{ watched: boolean }>(
      `select watched from episode_progress
       where user_id = 'user-a' and tmdb_show_id = 400
         and season_number = 1 and episode_number = 1`
    );
    assert.equal(
      rows.rows[0]?.watched,
      true,
      'the pre-existing row must remain unchanged after the failed batch rolls back'
    );
  } finally {
    await db.close();
  }
});

test('one user cannot modify or read another user’s episode/season progress', async () => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames) {
      await runMigration(db, migrationName);
    }
    await insertProfile(db, 'user-a', 'alice');
    await insertProfile(db, 'user-b', 'bob');

    await db.query(SET_OWN_TV_LIBRARY_STATE_QUERY, [
      'user-a',
      500,
      'watching',
      JSON.stringify([{ episode_number: 1, season_number: 1, watched: true }]),
      new Date(),
    ]);
    await db.query(SET_OWN_TV_LIBRARY_STATE_QUERY, [
      'user-b',
      500,
      'planned',
      JSON.stringify([{ episode_number: 1, season_number: 1, watched: false }]),
      null,
    ]);

    const progressRows = await db.query<{
      user_id: string;
      watched: boolean;
    }>(
      `select user_id, watched from episode_progress
       where tmdb_show_id = 500 order by user_id`
    );
    assert.deepEqual(progressRows.rows, [
      { user_id: 'user-a', watched: true },
      { user_id: 'user-b', watched: false },
    ]);

    const mediaRows = await db.query<{
      user_id: string;
      watch_status: string;
    }>(
      `select user_id, watch_status from user_media
       where tmdb_id = 500 order by user_id`
    );
    assert.deepEqual(mediaRows.rows, [
      { user_id: 'user-a', watch_status: 'watching' },
      { user_id: 'user-b', watch_status: 'planned' },
    ]);
  } finally {
    await db.close();
  }
});

test('season/episode progress reads and writes derive ownership from the authenticated session only', async () => {
  const database = await read('src/lib/services/database/tracking.server.ts');

  for (const helper of [
    'listOwnEpisodeProgressForSeason',
    'getOwnEpisodeProgress',
    'upsertOwnEpisodeProgress',
    'setOwnEpisodeProgressBatch',
  ]) {
    const start = database.indexOf(`export const ${helper}`);
    const end = database.indexOf('\nexport const ', start + 1);
    const body = database.slice(start, end === -1 ? undefined : end);
    assert.notEqual(start, -1, `Missing ${helper}`);
    assert.match(body, /getAuthenticatedUserId\(\)/);
  }

  const actions = await read('src/lib/features/tracking/actions.ts');
  assert.match(actions, /await ensureAuthenticated\(\)/);
  assert.match(actions, /status: 'login_required'/);
});

// ---------------------------------------------------------------------------
// Missing metadata and safe handling of provider inconsistencies
// ---------------------------------------------------------------------------

test('missing season metadata falls back honestly instead of fabricating values', async () => {
  const page = await read('src/lib/pages/tv/season/detail/index.tsx');
  const list = await read(
    'src/lib/pages/tv/season/detail/components/season-episode-list.tsx'
  );

  assert.match(page, /Season \$\{data\.season_number\}`/);
  assert.match(page, /Release year unavailable/);
  assert.match(page, /Not rated yet/);
  assert.match(
    page,
    /No overview is available from TMDB for this season yet\./
  );
  assert.match(list, /Runtime unavailable/);
  assert.match(list, /Air date unavailable/);
  assert.match(list, /Untitled episode/);
  assert.match(list, /Episode still unavailable/);
});

test('missing episode metadata falls back honestly instead of fabricating values', async () => {
  const page = await read('src/lib/pages/tv/episode/detail/index.tsx');

  assert.match(page, /Episode \$\{data\.episode_number\}`/);
  assert.match(page, /Air date unavailable/);
  assert.match(page, /Runtime unavailable/);
  assert.match(page, /Episode still unavailable/);
  assert.match(
    page,
    /No overview is available from TMDB for this episode yet\./
  );
});

// ---------------------------------------------------------------------------
// Mobile and desktop layouts
// ---------------------------------------------------------------------------

test('season and episode pages have explicit mobile and desktop compositions', async () => {
  const seasonPage = await read('src/lib/pages/tv/season/detail/index.tsx');
  const episodeList = await read(
    'src/lib/pages/tv/season/detail/components/season-episode-list.tsx'
  );
  const episodePage = await read('src/lib/pages/tv/episode/detail/index.tsx');

  assert.match(seasonPage, /display=\{\{ base: 'grid', md: 'flex' \}\}/);
  assert.match(
    seasonPage,
    /templateColumns=\{\{ base: '1fr', md: 'repeat\(3, max-content\)' \}\}/
  );
  assert.match(
    episodeList,
    /templateColumns=\{\{\s*base: '1fr',\s*md: '180px minmax\(0, 1fr\) auto',\s*\}\}/
  );
  assert.match(
    episodePage,
    /templateColumns=\{\{ base: '1fr', md: 'repeat\(4, max-content\)' \}\}/
  );
  assert.match(
    episodePage,
    /templateColumns=\{\{ base: '1fr', md: 'repeat\(2, max-content\)' \}\}/
  );
});

test('no unrelated features (comments, reviews, clips, guest-star bios, recaps) were added', async () => {
  const files = await Promise.all(
    [
      'src/lib/pages/tv/season/detail/index.tsx',
      'src/lib/pages/tv/season/detail/components/season-episode-list.tsx',
      'src/lib/pages/tv/episode/detail/index.tsx',
      'src/lib/pages/tv/episode/detail/components/episode-progress-panel.tsx',
    ].map(read)
  );

  for (const source of files) {
    assert.doesNotMatch(source, /guest[- ]star bio|recap|video clip/i);
  }
});
