/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  COUNT_ANALYTICS_OPT_OUTS_QUERY,
  DELETE_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY,
  EXPORT_ACCOUNT_QUERY,
  EXPORT_FOLLOWERS_QUERY,
  EXPORT_FOLLOWING_QUERY,
  EXPORT_LIBRARY_QUERY,
  EXPORT_RATINGS_QUERY,
  EXPORT_SIGN_IN_METHODS_QUERY,
  FIND_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY,
  GET_PRIVACY_PREFERENCES_QUERY,
  UPDATE_PRIVACY_PREFERENCES_QUERY,
} from '../src/lib/services/database/privacy-queries';

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
  '0011_admin_dashboard.sql',
  '0012_privacy_compliance.sql',
  '0014_profile_backdrops.sql',
  '0015_profile_avatar.sql',
] as const;

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

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

const createDatabase = async () => {
  const db = new PGlite({ extensions: { pgcrypto } });

  for (const name of migrationNames) {
    await db.exec(
      await read(join('database', 'migrations', name).replaceAll('\\', '/'))
    );
  }

  return db;
};

test('an account owns its analytics choice and it defaults to opted in', async () => {
  const db = await createDatabase();

  try {
    await insertProfile(db, {
      email: 'ada@example.com',
      userId: 'user-ada',
      username: 'ada',
    });

    const [initial] = await getRows<{
      analytics_opt_out: boolean;
      privacy_choices_updated_at: string | null;
    }>(db, GET_PRIVACY_PREFERENCES_QUERY, ['user-ada']);

    assert.equal(initial.analytics_opt_out, false);
    assert.equal(initial.privacy_choices_updated_at, null);

    const [saved] = await getRows<{
      analytics_opt_out: boolean;
      privacy_choices_updated_at: string | null;
    }>(db, UPDATE_PRIVACY_PREFERENCES_QUERY, ['user-ada', true]);

    assert.equal(saved.analytics_opt_out, true);
    // The date the choice was last made is recorded, so a request about it can
    // be answered without guessing.
    assert.notEqual(saved.privacy_choices_updated_at, null);

    const [counted] = await getRows<{ opted_out: string }>(
      db,
      COUNT_ANALYTICS_OPT_OUTS_QUERY
    );

    assert.equal(Number(counted.opted_out), 1);
  } finally {
    await db.close();
  }
});

test('a data export carries the requester rows only, and never a password hash', async () => {
  const db = await createDatabase();

  try {
    await insertProfile(db, {
      email: 'ada@example.com',
      userId: 'user-ada',
      username: 'ada',
    });
    await insertProfile(db, {
      email: 'grace@example.com',
      userId: 'user-grace',
      username: 'grace',
    });
    await db.query(
      `insert into auth_accounts (user_id, provider, provider_account_id, password_hash)
       values ($1, 'credentials', $2, 'not-a-real-hash')`,
      ['user-ada', 'ada@example.com']
    );
    await db.query(
      `insert into user_media (user_id, tmdb_id, media_type, watch_status)
       values ($1, 550, 'movie', 'watched'), ($2, 551, 'movie', 'watched')`,
      ['user-ada', 'user-grace']
    );
    await db.query(
      `insert into ratings (user_id, tmdb_id, media_type, rating, review)
       values ($1, 550, 'movie', 9, 'Loved it')`,
      ['user-ada']
    );
    await db.query(
      `insert into follows (follower_user_id, following_user_id)
       values ($1, $2)`,
      ['user-ada', 'user-grace']
    );

    const account = await getRows<{ analytics_opt_out: boolean }>(
      db,
      EXPORT_ACCOUNT_QUERY,
      ['user-ada']
    );
    const signInMethods = await getRows<Record<string, unknown>>(
      db,
      EXPORT_SIGN_IN_METHODS_QUERY,
      ['user-ada']
    );
    const library = await getRows<{ tmdb_id: number }>(
      db,
      EXPORT_LIBRARY_QUERY,
      ['user-ada']
    );
    const ratings = await getRows<{ review: string }>(
      db,
      EXPORT_RATINGS_QUERY,
      ['user-ada']
    );
    const following = await getRows<{ username: string }>(
      db,
      EXPORT_FOLLOWING_QUERY,
      ['user-ada']
    );
    const followers = await getRows<{ username: string }>(
      db,
      EXPORT_FOLLOWERS_QUERY,
      ['user-grace']
    );

    assert.equal(account.length, 1);
    assert.equal(account[0].analytics_opt_out, false);
    // Only the other account's row is left out: an export can never widen past
    // the one account it names.
    assert.deepEqual(
      library.map((row) => row.tmdb_id),
      [550]
    );
    assert.equal(ratings[0].review, 'Loved it');
    assert.deepEqual(
      following.map((row) => row.username),
      ['grace']
    );
    assert.deepEqual(
      followers.map((row) => row.username),
      ['ada']
    );
    // Provider links are exported; the secret behind them is not.
    assert.equal(signInMethods.length, 1);
    assert.ok(!('password_hash' in signInMethods[0]));
  } finally {
    await db.close();
  }
});

test('an erasure request removes the account and everything cascading from it', async () => {
  const db = await createDatabase();

  try {
    await insertProfile(db, {
      email: 'ada@example.com',
      userId: 'user-ada',
      username: 'ada',
    });
    await db.query(
      `insert into user_media (user_id, tmdb_id, media_type, watch_status)
       values ($1, 550, 'movie', 'watched')`,
      ['user-ada']
    );
    await db.query(
      `insert into episode_progress (user_id, tmdb_show_id, season_number, episode_number, watched)
       values ($1, 1399, 1, 1, true)`,
      ['user-ada']
    );

    // An email address resolves to the same account as the username, because a
    // request that arrives by mail rarely quotes the handle.
    const [byEmail] = await getRows<{ user_id: string }>(
      db,
      FIND_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY,
      ['ADA@example.com ']
    );

    assert.equal(byEmail.user_id, 'user-ada');

    const erased = await getRows<{ username: string }>(
      db,
      DELETE_ACCOUNT_FOR_PRIVACY_REQUEST_QUERY,
      ['user-ada']
    );

    assert.equal(erased[0].username, 'ada');

    for (const table of ['user_media', 'episode_progress', 'profiles']) {
      const remaining = await getRows<{ count: string }>(
        db,
        `select count(*)::text as count from ${table}`
      );

      assert.equal(remaining[0].count, '0', `${table} still holds rows`);
    }
  } finally {
    await db.close();
  }
});
