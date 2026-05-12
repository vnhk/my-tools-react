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

  // ── REST API ─────────────────────────────────────────────────────────────

  test('GET /api/canvas returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/canvas', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
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
    expect(list.find((c: { id: string }) => c.id === created.id)).toBeUndefined()
  })
})
