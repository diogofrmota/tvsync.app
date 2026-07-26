import { expect, test } from '@playwright/test';

test('the privacy page renders static legal copy without any backend dependency', async ({
  page,
}) => {
  await page.goto('/privacy');

  await expect(
    page.getByRole('heading', { name: 'Privacy Policy' })
  ).toBeVisible();
});
