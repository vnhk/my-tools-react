import { test, expect } from '@playwright/test';

test('unauthenticated visitors are redirected to the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('My Tools');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
