import { expect, test } from '@playwright/test';

const loginRedirectPattern = /\/login\?callbackUrl=/;

/**
 * Per BEHAVIOR.md, `/explore` requires authentication — it is not part of
 * this journey. The genuinely public, session-independent discovery
 * surfaces are `/`, `/movies/[section]`, `/movies/genre/[genre]`, and
 * `/tv/[listType]`. All TMDB data here comes from the mock server in
 * tests/e2e/mocks/tmdb-mock-server.mjs.
 */

test('the home page renders discovery rails for an anonymous visitor', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('Mock Movie 1').first()).toBeVisible();
});

test('the popular movies overview is reachable without signing in', async ({
  page,
}) => {
  await page.goto('/movies/popular');

  await expect(page.getByText('Mock Movie 1').first()).toBeVisible();
});

test('a movie genre list renders without signing in', async ({ page }) => {
  await page.goto('/movies/genre/28');

  await expect(page.getByText('Mock Movie 1').first()).toBeVisible();
});

test('the popular TV overview is reachable without signing in', async ({
  page,
}) => {
  await page.goto('/tv/popular');

  await expect(page.getByText('Mock TV Show 1').first()).toBeVisible();
});

test('explore requires authentication and redirects to login', async ({
  page,
}) => {
  await page.goto('/explore');

  await expect(page).toHaveURL(loginRedirectPattern);
});
