import { expect, test } from '@playwright/test';

test('the privacy page renders static legal copy without any backend dependency', async ({
  page,
}) => {
  await page.goto('/privacy');

  await expect(
    page.getByRole('heading', { name: 'Privacy Policy' })
  ).toBeVisible();
});

test('a movie detail page renders from the mocked TMDB server', async ({
  page,
}) => {
  await page.goto('/movie/1');

  await expect(page.getByText('Mock Movie 1').first()).toBeVisible();
});
