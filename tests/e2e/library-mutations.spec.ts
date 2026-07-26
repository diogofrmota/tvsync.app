import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { expect, test } from '@playwright/test';

import { hashPasswordCore } from '../../src/lib/services/auth/password-core';

/**
 * Watchlist, watch-status, episode-progress, and rating mutations all
 * require a signed-in user and a real Neon connection (BEHAVIOR.md: these
 * routes are auth-required and read/write lib/services/database directly).
 * Rather than re-testing registration + email verification here (that's
 * auth.spec.ts's job, and it needs its own email-capture infrastructure —
 * see tests/e2e/README.md), this seeds an already-verified test account
 * straight into the database, the same way tests/auth-database.test.ts
 * does for its PGlite scenarios, then logs in through the real UI.
 */

const shouldRun = Boolean(process.env.E2E_REAL_DATABASE);
const addToWatchlistPattern = /add to watchlist/i;
const removeFromWatchlistPattern = /remove from watchlist/i;

test.describe('watchlist and tracking mutations for a signed-in user', () => {
  // biome-ignore lint/suspicious/noSkippedTests: conditional on E2E_REAL_DATABASE, not a permanently disabled test.
  test.skip(
    !shouldRun,
    'Requires E2E_REAL_DATABASE=1 and a real Neon DATABASE_URL/' +
      'DATABASE_URL_UNPOOLED with migrations applied — see tests/e2e/README.md.'
  );

  let email: string;
  let username: string;
  const password = 'CorrectHorse123';

  test.beforeAll(async () => {
    const userId = randomUUID();
    email = `e2e-library-${Date.now()}@example.com`;
    username = `e2e_library_${Date.now()}`.slice(0, 24);
    const passwordHash = await hashPasswordCore(password);
    const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? '');

    await sql.query(
      `insert into profiles (
         user_id, name, username, display_name, email, privacy_setting, email_verified_at
       ) values ($1, $2, $2, $2, $3, 'private', now())`,
      [userId, username, email]
    );
    await sql.query(
      `insert into auth_accounts (
         user_id, provider, provider_account_id, password_hash, password_updated_at
       ) values ($1, 'credentials', $1, $2, now())`,
      [userId, passwordHash]
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address or username').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/movies');
  });

  test('a movie can be added to and removed from the watchlist', async ({
    page,
  }) => {
    await page.goto('/movie/1');

    await page.getByRole('button', { name: addToWatchlistPattern }).click();
    await expect(
      page.getByRole('button', { name: removeFromWatchlistPattern })
    ).toBeVisible();

    await page.goto('/watchlist');
    await expect(page.getByText('Mock Movie 1')).toBeVisible();

    await page.goto('/movie/1');
    await page
      .getByRole('button', { name: removeFromWatchlistPattern })
      .click();

    await page.goto('/watchlist');
    await expect(page.getByText('Mock Movie 1')).not.toBeVisible();
  });

  test('an episode can be marked watched and progress reflects it', async ({
    page,
  }) => {
    await page.goto('/tv/show/1/season/1/episode/1');

    await page.getByRole('button', { name: 'Mark as Watched' }).click();
    await expect(
      page.getByRole('button', { name: 'Mark as Unwatched' })
    ).toBeVisible();

    await page.goto('/tv/show/1/season/1');
    await expect(page.getByText('1 / 10 watched')).toBeVisible();
  });

  test('a rating can be submitted for a movie', async ({ page }) => {
    await page.goto('/movie/1');

    // Each star is a plain button (lib/features/reviews/star-rating.tsx),
    // not a radio; the 10-point scale runs in half-star steps, so the 4th
    // full star is "Rate 8.0 out of 10".
    await page.getByRole('button', { name: 'Rate 8.0 out of 10' }).click();
    await expect(page.getByText('Your rating was saved.')).toBeVisible();
  });
});
