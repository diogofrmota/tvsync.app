import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  hashPasswordCore,
  verifyPasswordCore,
} from '../src/lib/services/auth/password-core';
import { digestAuthToken } from '../src/lib/services/auth/security';
import {
  CONSUME_AUTH_RATE_LIMIT_QUERY,
  CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY,
  FIND_CREDENTIAL_ACCOUNT_QUERY,
  FIND_GOOGLE_ACCOUNT_USER_ID_QUERY,
  GET_SESSION_VERSION_QUERY,
  INSERT_EMAIL_VERIFICATION_TOKEN_QUERY,
  INSERT_PASSWORD_RESET_TOKEN_QUERY,
  INVALIDATE_EMAIL_VERIFICATION_TOKENS_QUERY,
  INVALIDATE_PASSWORD_RESET_TOKENS_QUERY,
  IS_PASSWORD_RESET_TOKEN_VALID_QUERY,
  LINK_GOOGLE_ACCOUNT_QUERY,
  RESET_PASSWORD_WITH_TOKEN_QUERY,
} from '../src/lib/services/database/auth-queries';

const migrationNames = [
  '0001_initial_tracking_schema.sql',
  '0002_watch_status_values.sql',
  '0003_ratings_reviews_targets.sql',
  '0004_social_activity_recommendations.sql',
  '0005_auth_lifecycle.sql',
  '0006_unify_library_membership.sql',
] as const;
const emailUniqueConstraintPattern = /profiles_email_normalized_unique/;
const usernameUniqueConstraintPattern = /profiles_username_normalized_unique/;
const googlePasswordShapeConstraintPattern =
  /auth_accounts_password_shape_check/;

const runMigration = async (db: PGliteInterface, name: string) => {
  const migration = await readFile(
    join(process.cwd(), 'database', 'migrations', name),
    'utf8'
  );
  await db.exec(migration);
};

const getRows = async <Row extends Record<string, unknown>>(
  db: PGliteInterface,
  query: string,
  params: Array<unknown> = []
) => (await db.query<Row>(query, params)).rows;

const insertProfile = async (
  db: PGliteInterface,
  input: {
    email: string;
    userId: string;
    username: string;
    verified?: boolean;
  }
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
      values ($1, $2, $2, $2, $3, 'private', case when $4 then now() else null end)
    `,
    [input.userId, input.username, input.email, input.verified ?? false]
  );
};

// biome-ignore lint/style/noDoneCallback: Node's test context provides awaited subtests, not a completion callback.
test('PostgreSQL auth lifecycle enforces identity, token, reset, and throttle guarantees', async (t) => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of migrationNames.slice(0, 4)) {
      await runMigration(db, migrationName);
    }

    await db.query(
      `
        insert into profiles (
          user_id,
          name,
          username,
          display_name,
          email,
          privacy_setting
        )
        values ('legacy-google-user', 'Legacy', 'legacy', 'Legacy', 'legacy@example.com', 'private')
      `
    );
    await runMigration(db, migrationNames[4]);
    await runMigration(db, migrationNames[5]);

    await t.test(
      'migration backfills legacy Google identities safely',
      async () => {
        const profiles = await getRows<{
          email_verified_at: Date | string | null;
        }>(db, 'select email_verified_at from profiles where user_id = $1', [
          'legacy-google-user',
        ]);
        const accounts = await getRows<{ provider_account_id: string }>(
          db,
          FIND_GOOGLE_ACCOUNT_USER_ID_QUERY.replace(
            'select user_id',
            'select provider_account_id'
          ),
          ['legacy-google-user']
        );

        assert.ok(profiles[0]?.email_verified_at);
        assert.equal(accounts[0]?.provider_account_id, 'legacy-google-user');
      }
    );

    const userId = 'credentials-user';
    const initialHash = await hashPasswordCore('InitialPassword1');
    await insertProfile(db, {
      email: 'Alice@Example.com',
      userId,
      username: 'Alice',
    });
    await db.query(
      `
        insert into auth_accounts (
          user_id,
          provider,
          provider_account_id,
          password_hash,
          password_updated_at
        )
        values ($1, 'credentials', $1, $2, now())
      `,
      [userId, initialHash]
    );

    await t.test(
      'normalized database constraints reject duplicate email and username',
      async () => {
        await assert.rejects(
          insertProfile(db, {
            email: ' alice@example.com ',
            userId: 'duplicate-email-user',
            username: 'different',
          }),
          emailUniqueConstraintPattern
        );
        await assert.rejects(
          insertProfile(db, {
            email: 'different@example.com',
            userId: 'duplicate-username-user',
            username: ' alice ',
          }),
          usernameUniqueConstraintPattern
        );
      }
    );

    await t.test(
      'credentials lookup accepts normalized email or username and exposes verification state',
      async () => {
        const byEmail = await getRows<{
          email_verified_at: Date | string | null;
          user_id: string;
        }>(db, FIND_CREDENTIAL_ACCOUNT_QUERY, ['alice@example.com']);
        const byUsername = await getRows<{ user_id: string }>(
          db,
          FIND_CREDENTIAL_ACCOUNT_QUERY,
          ['alice']
        );
        const invalid = await getRows<{ user_id: string }>(
          db,
          FIND_CREDENTIAL_ACCOUNT_QUERY,
          ['missing']
        );

        assert.equal(byEmail[0]?.user_id, userId);
        assert.equal(byEmail[0]?.email_verified_at, null);
        assert.equal(byUsername[0]?.user_id, userId);
        assert.deepEqual(invalid, []);
      }
    );

    await t.test(
      'Google provider subjects link to one stable internal identity',
      async () => {
        await db.query(LINK_GOOGLE_ACCOUNT_QUERY, [
          userId,
          'google-subject-alice',
        ]);
        const mapping = await getRows<{ user_id: string }>(
          db,
          FIND_GOOGLE_ACCOUNT_USER_ID_QUERY,
          ['google-subject-alice']
        );

        assert.equal(mapping[0]?.user_id, userId);

        await insertProfile(db, {
          email: 'other@example.com',
          userId: 'other-user',
          username: 'other',
          verified: true,
        });
        await db.query(LINK_GOOGLE_ACCOUNT_QUERY, [
          'other-user',
          'google-subject-alice',
        ]);

        const stillMapped = await getRows<{ user_id: string }>(
          db,
          FIND_GOOGLE_ACCOUNT_USER_ID_QUERY,
          ['google-subject-alice']
        );
        assert.equal(stillMapped[0]?.user_id, userId);
        await assert.rejects(
          db.query(
            `
            insert into auth_accounts (
              user_id,
              provider,
              provider_account_id,
              password_hash
            )
            values ($1, 'google', 'google-invalid-password-shape', 'plaintext')
          `,
            ['other-user']
          ),
          googlePasswordShapeConstraintPattern
        );
      }
    );

    await t.test(
      'verification tokens expire, resend invalidates old links, and consumption is single-use',
      async () => {
        const oldDigest = digestAuthToken('old-verification-token');
        const currentDigest = digestAuthToken('current-verification-token');
        const expiredDigest = digestAuthToken('expired-verification-token');

        await db.transaction(async (tx) => {
          await tx.query(INSERT_EMAIL_VERIFICATION_TOKEN_QUERY, [
            userId,
            oldDigest,
            new Date(Date.now() + 86_400_000),
          ]);
          await tx.query(INVALIDATE_EMAIL_VERIFICATION_TOKENS_QUERY, [userId]);
          await tx.query(INSERT_EMAIL_VERIFICATION_TOKEN_QUERY, [
            userId,
            currentDigest,
            new Date(Date.now() + 86_400_000),
          ]);
          await tx.query(INSERT_EMAIL_VERIFICATION_TOKEN_QUERY, [
            userId,
            expiredDigest,
            new Date(Date.now() - 1),
          ]);
        });

        assert.deepEqual(
          await getRows(db, CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY, [
            oldDigest,
          ]),
          []
        );
        assert.deepEqual(
          await getRows(db, CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY, [
            expiredDigest,
          ]),
          []
        );
        const verified = await getRows<{ user_id: string }>(
          db,
          CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY,
          [currentDigest]
        );
        assert.equal(verified[0]?.user_id, userId);
        assert.deepEqual(
          await getRows(db, CONSUME_EMAIL_VERIFICATION_TOKEN_QUERY, [
            currentDigest,
          ]),
          []
        );

        const profile = await getRows<{
          email_verified_at: Date | string | null;
        }>(db, 'select email_verified_at from profiles where user_id = $1', [
          userId,
        ]);
        const activeTokens = await getRows<{ count: number }>(
          db,
          `
          select count(*)::integer as count
          from auth_email_verification_tokens
          where user_id = $1 and consumed_at is null
        `,
          [userId]
        );
        assert.ok(profile[0]?.email_verified_at);
        assert.equal(activeTokens[0]?.count, 0);
      }
    );

    await t.test(
      'password reset is atomic, single-use, and rotates all existing sessions',
      async () => {
        const oldDigest = digestAuthToken('old-reset-token');
        const currentDigest = digestAuthToken('current-reset-token');
        const siblingDigest = digestAuthToken('sibling-reset-token');
        const expiredDigest = digestAuthToken('expired-reset-token');

        await db.transaction(async (tx) => {
          await tx.query(INSERT_PASSWORD_RESET_TOKEN_QUERY, [
            userId,
            oldDigest,
            new Date(Date.now() + 86_400_000),
          ]);
          await tx.query(INVALIDATE_PASSWORD_RESET_TOKENS_QUERY, [userId]);
          await tx.query(INSERT_PASSWORD_RESET_TOKEN_QUERY, [
            userId,
            currentDigest,
            new Date(Date.now() + 86_400_000),
          ]);
          await tx.query(INSERT_PASSWORD_RESET_TOKEN_QUERY, [
            userId,
            siblingDigest,
            new Date(Date.now() + 86_400_000),
          ]);
          await tx.query(INSERT_PASSWORD_RESET_TOKEN_QUERY, [
            userId,
            expiredDigest,
            new Date(Date.now() - 1),
          ]);
        });

        assert.deepEqual(
          await getRows(db, IS_PASSWORD_RESET_TOKEN_VALID_QUERY, [oldDigest]),
          []
        );
        assert.equal(
          (
            await getRows(db, IS_PASSWORD_RESET_TOKEN_VALID_QUERY, [
              currentDigest,
            ])
          ).length,
          1
        );
        assert.deepEqual(
          await getRows(db, IS_PASSWORD_RESET_TOKEN_VALID_QUERY, [
            expiredDigest,
          ]),
          []
        );

        const newHash = await hashPasswordCore('ReplacementPassword2');
        const reset = await getRows<{ user_id: string }>(
          db,
          RESET_PASSWORD_WITH_TOKEN_QUERY,
          [currentDigest, newHash]
        );
        assert.equal(reset[0]?.user_id, userId);

        const account = await getRows<{ password_hash: string }>(
          db,
          `
          select password_hash
          from auth_accounts
          where user_id = $1 and provider = 'credentials'
        `,
          [userId]
        );
        assert.equal(
          await verifyPasswordCore(
            'ReplacementPassword2',
            account[0]?.password_hash
          ),
          true
        );
        assert.equal(
          await verifyPasswordCore(
            'InitialPassword1',
            account[0]?.password_hash
          ),
          false
        );

        const sessionVersion = await getRows<{ session_version: number }>(
          db,
          GET_SESSION_VERSION_QUERY,
          [userId]
        );
        assert.equal(sessionVersion[0]?.session_version, 1);

        const activeTokens = await getRows<{ count: number }>(
          db,
          `
          select count(*)::integer as count
          from auth_password_reset_tokens
          where user_id = $1 and consumed_at is null
        `,
          [userId]
        );
        assert.equal(activeTokens[0]?.count, 0);
        assert.deepEqual(
          await getRows(db, RESET_PASSWORD_WITH_TOKEN_QUERY, [
            currentDigest,
            initialHash,
          ]),
          []
        );
        assert.deepEqual(
          await getRows(db, IS_PASSWORD_RESET_TOKEN_VALID_QUERY, [
            siblingDigest,
          ]),
          []
        );
      }
    );

    await t.test(
      'persistent throttles isolate scopes and reset after their window',
      async () => {
        const digest = 'a'.repeat(64);
        const attempts: Array<number> = [];

        for (let index = 0; index < 4; index += 1) {
          const rows = await getRows<{ attempt_count: number }>(
            db,
            CONSUME_AUTH_RATE_LIMIT_QUERY,
            ['login:identity', digest, 3600]
          );
          attempts.push(rows[0]?.attempt_count ?? 0);
        }

        assert.deepEqual(attempts, [1, 2, 3, 4]);

        const separateScope = await getRows<{ attempt_count: number }>(
          db,
          CONSUME_AUTH_RATE_LIMIT_QUERY,
          ['login:ip', digest, 3600]
        );
        assert.equal(separateScope[0]?.attempt_count, 1);

        await db.query(
          `
          update auth_rate_limits
          set window_started_at = now() - interval '2 hours'
          where scope = 'login:identity' and key_digest = $1
        `,
          [digest]
        );
        const resetWindow = await getRows<{ attempt_count: number }>(
          db,
          CONSUME_AUTH_RATE_LIMIT_QUERY,
          ['login:identity', digest, 3600]
        );
        assert.equal(resetWindow[0]?.attempt_count, 1);
      }
    );
  } finally {
    await db.close();
  }
});
