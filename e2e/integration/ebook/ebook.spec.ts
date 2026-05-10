import { test, expect, loginViaApi, apiRequest } from '../fixtures'

test.describe('Ebook English Stats — integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  // ── Navigation & layout ──────────────────────────────────────────────────

  test('navigates to ebooks page and shows tabs', async ({ page }) => {
    await page.goto('/ebook/ebooks')

    await expect(page.getByRole('link', { name: /Not Learned Words/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ebooks/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Ebook/i })).toBeVisible()
  })

  test('navigates to not-learned-words page and shows empty state', async ({ page }) => {
    await page.goto('/ebook/words')

    await expect(page.getByRole('link', { name: /Not Learned Words/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ebooks/i })).toBeVisible()
    // No ebooks in test env → selector empty or shows no words
    await expect(page.getByText(/No unknown words|Select an ebook|unknown words/i)).toBeVisible({ timeout: 10_000 })
  })

  test('switches tabs between Ebooks and Not Learned Words', async ({ page }) => {
    await page.goto('/ebook/ebooks')
    await expect(page.getByRole('button', { name: /Add Ebook/i })).toBeVisible()

    await page.getByRole('link', { name: /Not Learned Words/i }).click()
    await expect(page).toHaveURL(/\/ebook\/words/)
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible()

    await page.getByRole('link', { name: /Ebooks/i }).click()
    await expect(page).toHaveURL(/\/ebook\/ebooks/)
    await expect(page.getByRole('button', { name: /Add Ebook/i })).toBeVisible()
  })

  // ── Ebooks CRUD ──────────────────────────────────────────────────────────

  test('add ebook dialog opens and shows ebookName field', async ({ page }) => {
    await page.goto('/ebook/ebooks')

    await page.getByRole('button', { name: /Add Ebook/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel(/Ebook Name/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible()

    // Close dialog
    await page.getByRole('button', { name: /Cancel|✕/i }).first().click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('add ebook with empty name shows error notification', async ({ page }) => {
    await page.goto('/ebook/ebooks')

    await page.getByRole('button', { name: /Add Ebook/i }).click()
    await page.getByRole('button', { name: 'Add' }).click()

    // Validation error — name is required
    await expect(page.getByText(/required|is required/i)).toBeVisible()
  })

  // ── Mark as learned via API ───────────────────────────────────────────────

  test('mark-learned API accepts a word and returns 200', async ({ page, request }) => {
    const token = await loginViaApi(page)

    const res = await apiRequest(request, 'POST', '/api/ebook/mark-learned', token, { word: 'E2ETestWord' })
    expect(res.status()).toBe(200)
  })

  test('add-flashcard API accepts a word and returns 200', async ({ page, request }) => {
    const token = await loginViaApi(page)

    const res = await apiRequest(request, 'POST', '/api/ebook/add-flashcard', token, { word: 'E2EFlashcardWord' })
    expect(res.status()).toBe(200)
  })

  // ── Not Learned Words UI ─────────────────────────────────────────────────

  test('not-learned-words page has ebook selector and upload button', async ({ page }) => {
    await page.goto('/ebook/words')

    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Upload Known Words/i })).toBeVisible()
  })
})
