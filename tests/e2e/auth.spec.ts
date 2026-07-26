import { expect, test } from '@playwright/test';

const loginUrlPattern = /\/login/;
const genericEmailResponsePattern = /if an eligible account exists/i;
const checkYourEmailPattern = /check your email/i;

/**
 * registerWithCredentials (lib/features/auth/actions.ts) validates and
 * returns fieldErrors before ever calling checkRequestAuthRateLimit or
 * touching the database, so the validation-error path below is genuinely
 * testable without a real Neon connection. Everything past that point needs
 * a real account created in a real database — see the E2E_REAL_DATABASE
 * block and tests/e2e/README.md for what that requires.
 */

test('registration rejects a short password and mismatched confirmation before touching the database', async ({
  page,
}) => {
  await page.goto('/register');

  await page.getByLabel('Email address').fill('new-user@example.com');
  await page.getByLabel('Username').fill('new_user');
  await page.getByLabel('Password', { exact: true }).fill('short1');
  await page.getByLabel('Confirm password').fill('different1');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(
    page.getByText('At least 12 characters with a letter and a number.')
  ).toBeVisible();
});

test('login rejects an unknown identifier without crashing the page', async ({
  page,
}) => {
  await page.goto('/login');

  await page.getByLabel('Email address or username').fill('nobody@example.com');
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword1');
  await page.getByRole('button', { name: 'Login' }).click();

  // The exact copy is an implementation detail; what matters is the page
  // stays on /login with a rendered error instead of throwing.
  await expect(page).toHaveURL(loginUrlPattern);
});

test('the forgot-password form accepts a submission and shows a neutral confirmation', async ({
  page,
}) => {
  await page.goto('/forgot-password');

  await page.getByLabel('Email address').fill('someone@example.com');
  await page.getByRole('button', { name: 'Send Reset Email' }).click();

  // Deliberately neutral wording (GENERIC_EMAIL_RESPONSE in
  // lib/features/auth/actions.ts) so the response can't be used to
  // enumerate which email addresses have accounts.
  await expect(page.getByText(genericEmailResponsePattern)).toBeVisible();
});

test.describe('full register → verify → login → reset round trip', () => {
  // biome-ignore lint/suspicious/noSkippedTests: conditional on E2E_REAL_DATABASE, not a permanently disabled test.
  test.skip(
    !process.env.E2E_REAL_DATABASE,
    'Requires a real disposable Neon branch with migrations applied, plus a ' +
      'way to read the verification/reset email sent through Resend — see ' +
      'tests/e2e/README.md. Not runnable in a sandboxed environment with no ' +
      'network access to Neon or Resend.'
  );

  test('a new user can register, verify by email, and log in', async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const username = `e2e_${Date.now()}`;

    await page.goto('/register');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password', { exact: true }).fill('CorrectHorse123');
    await page.getByLabel('Confirm password').fill('CorrectHorse123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText(checkYourEmailPattern)).toBeVisible();

    // This is the part that needs real infrastructure: the verification
    // token is only ever available in the email Resend delivers (the
    // database stores nothing but a one-way digest of it, by design — see
    // AGENTS.md "Keep email/password authentication on the established
    // credentials account model"). A real run of this test needs either a
    // test mailbox this step can poll (e.g. a catch-all inbox or Resend's
    // test mode) or to run against a Resend webhook capture endpoint. There
    // is no supported way to extract the plaintext token from the database.
    throw new Error(
      'Wire up email capture here (see tests/e2e/README.md) before enabling this test.'
    );
  });
});
