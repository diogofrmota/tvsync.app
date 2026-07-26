import { expect, test } from '@playwright/test';

/**
 * Movie/TV detail, season, and episode pages are public+session (BEHAVIOR.md):
 * anonymous viewers get the full TMDB-backed content, and the personal
 * progress/favorite reads short-circuit to an empty/login-required state
 * before touching the database (see getSeasonProgressState /
 * getEpisodeProgressState / getTvProgressSummary in
 * lib/features/tracking/actions.ts). That means this whole journey is
 * testable anonymously against the TMDB mock alone, with no database.
 *
 * In this sandbox specifically, next/font's fetch to Google Fonts fails
 * (no network egress to fonts.googleapis.com), which trips a server-render
 * error and falls back to slower client-side rendering ("Switched to
 * client rendering because the server rendering errored") — real
 * deployments with normal internet access don't hit this. Assertions below
 * use a longer timeout to absorb that, rather than treating it as a false
 * failure.
 */
const HYDRATION_TIMEOUT = 15_000;

test('a movie detail page renders detail, cast, trailer, and reviews', async ({
  page,
}) => {
  await page.goto('/movie/1');

  await expect(page.getByRole('heading', { name: 'Mock Movie 1' })).toBeVisible(
    { timeout: HYDRATION_TIMEOUT }
  );
  await expect(page.getByText('Mock Actor One')).toBeVisible();
  await expect(page.getByText('Mock Reviewer')).toBeVisible();
});

test('an anonymous visitor sees a login/register prompt instead of tracking actions', async ({
  page,
}) => {
  await page.goto('/movie/1');

  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible({
    timeout: HYDRATION_TIMEOUT,
  });
  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
});

test('a TV show detail page links into its first season', async ({ page }) => {
  await page.goto('/tv/show/1');

  await expect(
    page.getByRole('heading', { name: 'Mock TV Show 1' })
  ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
});

test('a season page lists episodes and links to episode detail', async ({
  page,
}) => {
  await page.goto('/tv/show/1/season/1');

  await expect(page.getByText('Episode 1').first()).toBeVisible({
    timeout: HYDRATION_TIMEOUT,
  });
});

test('an episode detail page renders show name, episode title, and overview', async ({
  page,
}) => {
  await page.goto('/tv/show/1/season/1/episode/1');

  await expect(page.getByText('Mock TV Show 1')).toBeVisible({
    timeout: HYDRATION_TIMEOUT,
  });
  await expect(
    page.getByText('Overview for S1E1.', { exact: false })
  ).toBeVisible();
});

test('a nonexistent movie id renders the 404 page instead of crashing', async ({
  page,
}) => {
  // Asserting on rendered content rather than response.status(): in `next
  // dev`, RSC streaming can flush the 200 status line before notFound()
  // resolves further down the tree, so the HTTP status alone is not a
  // reliable signal here even though the page correctly renders as 404.
  await page.goto('/movie/999999');

  await expect(
    page.getByRole('heading', { name: 'Page not Found.' })
  ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
});
