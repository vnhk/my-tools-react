import { test, expect, TEST_USER } from '../fixtures'

test.describe('Login — integration', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL('/login')
  })

  test('logs in with valid credentials and reaches home', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Enter username').fill(TEST_USER.username)
    await page.getByPlaceholder('Enter password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL('/home')
    await expect(page.getByText(TEST_USER.username)).toBeVisible()
  })

  test('shows an error on invalid credentials and stays on login', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Enter username').fill(TEST_USER.username)
    await page.getByPlaceholder('Enter password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Invalid credentials')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('logs out and can no longer reach a protected route', async ({ page }) => {
    // Logs in through the real form rather than loginViaApi(): that helper
    // installs an addInitScript that re-seeds the token on every subsequent
    // full navigation, which would silently defeat this test's whole point.
    await page.goto('/login')
    await page.getByPlaceholder('Enter username').fill(TEST_USER.username)
    await page.getByPlaceholder('Enter password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText(TEST_USER.username)).toBeVisible()

    await page.getByTitle('Logout').click()
    await expect(page).toHaveURL('/login')

    await page.goto('/home')
    await expect(page).toHaveURL('/login')
  })
})
