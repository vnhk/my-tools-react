import { test, expect, loginViaApi, apiRequest } from '../fixtures'

test.describe('Canvas — integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  // ── Navigation & layout ──────────────────────────────────────────────────

  test('navigates to canvas page and shows sidebar', async ({ page }) => {
    await page.goto('/canvas')

    await expect(page.getByRole('button', { name: /New Page/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Search pages/i)).toBeVisible()
  })

  test('shows empty state when no page is selected', async ({ page }) => {
    await page.goto('/canvas')

    await expect(
      page.getByText(/Select a page or create a new one/i)
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── New page dialog ──────────────────────────────────────────────────────

  test('new page dialog opens and shows name and section fields', async ({ page }) => {
    await page.goto('/canvas')

    await page.getByRole('button', { name: /New Page/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByPlaceholder(/My Notes/i)).toBeVisible()
    await expect(page.getByPlaceholder(/e.g. Work, Personal/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Create$/i })).toBeVisible()
  })

  test('new page dialog closes on cancel', async ({ page }) => {
    await page.goto('/canvas')

    await page.getByRole('button', { name: /New Page/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: /Cancel|✕/i }).first().click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('new page dialog validates empty name', async ({ page }) => {
    await page.goto('/canvas')

    await page.getByRole('button', { name: /New Page/i }).click()
    await page.getByRole('button', { name: /^Create$/i }).click()

    await expect(page.getByText(/Name is required/i)).toBeVisible()
  })

  // ── Create, list, rename, delete via UI ─────────────────────────────────
  // Regression coverage for a bug where the sidebar list stayed empty (backend
  // returns a Page object, not a bare array) and inline saves (rename, content
  // autosave, re-category) all 400'd because the PUT endpoint validated partial
  // payloads as if they were full-object replacements.

  test('creates a page via the dialog, sees it in the sidebar, renames it, then deletes it', async ({ page }) => {
    await page.goto('/canvas')

    await page.getByRole('button', { name: /New Page/i }).click()
    await page.getByPlaceholder(/My Notes/i).fill('E2E Canvas Page')
    await page.getByPlaceholder(/e.g. Work, Personal/i).fill('E2E Section')
    await page.getByRole('button', { name: /^Create$/i }).click()

    // New page opens in the editor and its section auto-expands in the sidebar
    await expect(page.locator('input[placeholder="Untitled"]')).toHaveValue('E2E Canvas Page')
    await expect(page.getByText('E2E Section').first()).toBeVisible()
    await expect(page.getByText('E2E Canvas Page', { exact: true })).toBeVisible()

    // Rename via the title field (blur triggers a partial save)
    const titleInput = page.locator('input[placeholder="Untitled"]')
    await titleInput.fill('E2E Canvas Page Renamed')
    await titleInput.blur()
    await expect(page.getByText('E2E Canvas Page Renamed', { exact: true })).toBeVisible()

    // Reload to confirm the rename actually persisted server-side.
    // Sidebar sections start collapsed on a fresh load, so expand it first.
    await page.reload()
    await page.getByText('E2E Section').click()
    await expect(page.getByText('E2E Canvas Page Renamed', { exact: true })).toBeVisible()

    // Cleanup
    await page.getByText('E2E Canvas Page Renamed', { exact: true }).click()
    page.once('dialog', (d) => d.accept())
    await page.getByTitle('Delete page').click()
    await expect(page.getByText('E2E Canvas Page Renamed', { exact: true })).not.toBeVisible()
  })

  // ── REST API ─────────────────────────────────────────────────────────────

  test('GET /api/canvas returns 200 and a page of items', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/canvas', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.content)).toBe(true)
  })

  test('GET /api/canvas/categories returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/canvas/categories', token)
    expect(res.status()).toBe(200)
  })

  test('POST /api/canvas creates and DELETE removes page', async ({ page, request }) => {
    const token = await loginViaApi(page)

    const createRes = await apiRequest(request, 'POST', '/api/canvas', token, {
      name: 'E2E Test Page',
      category: 'E2E Tests',
    })
    expect(createRes.status()).toBe(200)
    const created = await createRes.json()
    expect(created.id).toBeTruthy()
    expect(created.name).toBe('E2E Test Page')

    // GET detail
    const detailRes = await apiRequest(request, 'GET', `/api/canvas/${created.id}`, token)
    expect(detailRes.status()).toBe(200)
    const detail = await detailRes.json()
    expect(detail.content).toBeDefined()

    // PUT content
    const updateRes = await apiRequest(request, 'PUT', `/api/canvas/${created.id}`, token, {
      content: '<p>Hello E2E</p>',
    })
    expect(updateRes.status()).toBe(200)

    // DELETE
    const deleteRes = await apiRequest(request, 'DELETE', `/api/canvas/${created.id}`, token)
    expect(deleteRes.status()).toBe(204)

    // Confirm gone
    const listRes = await apiRequest(request, 'GET', '/api/canvas', token)
    const list = await listRes.json()
    expect(list.content.find((c: { id: string }) => c.id === created.id)).toBeUndefined()
  })
})
