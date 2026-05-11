import { test, expect, loginViaApi, apiRequest } from '../fixtures'

test.describe('Invest Track — Budget Tree integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  // ── Navigation & layout ──────────────────────────────────────────────────

  test('navigates to budget tree page and shows toolbar', async ({ page }) => {
    await page.goto('/invest-track/budget-tree')

    await expect(page.getByRole('button', { name: /Load/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Expand All/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Collapse All/i })).toBeVisible()
  })

  test('budget tree tab is visible in invest-track layout', async ({ page }) => {
    await page.goto('/invest-track/budget-tree')

    await expect(page.getByRole('link', { name: /Budget Tree/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Budget$/i })).toBeVisible()
  })

  test('shows empty state when no entries in period', async ({ page }) => {
    await page.goto('/invest-track/budget-tree')

    // Wait for the initial auto-load to finish before interacting (Load button is disabled while loading)
    await expect(page.getByRole('button', { name: /Load/i })).toBeEnabled({ timeout: 60_000 })

    // Use a future date range with no data
    const startInput = page.locator('input[type="date"]').first()
    const endInput = page.locator('input[type="date"]').nth(1)
    await startInput.fill('2099-01-01')
    await endInput.fill('2099-12-31')
    await page.getByRole('button', { name: /Load/i }).click()

    await expect(page.getByText(/No entries in this period/i)).toBeVisible({ timeout: 10_000 })
  })

  // ── Tree interaction ─────────────────────────────────────────────────────

  test('tree loads and first month is expanded automatically', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const today = new Date().toISOString().slice(0, 10)

    // Create a budget entry so the tree is not empty
    const createRes = await apiRequest(request, 'POST', '/api/invest-track/budget-entries', token, {
      name: 'E2EBudgetTreeEntry',
      category: 'E2ECategory',
      currency: 'PLN',
      value: 42.0,
      entryDate: today,
      entryType: 'Expense',
      paymentMethod: 'Cash',
      notes: null,
      isRecurring: false,
    })
    expect(createRes.status(), `POST budget-entry failed: ${createRes.status()}`).toBeLessThan(300)
    const created = await createRes.json()
    const entryId = created.id

    try {
      await page.goto('/invest-track/budget-tree')
      // Wait for the initial auto-load before clicking (Load button is disabled while loading)
      await expect(page.getByRole('button', { name: /Load/i })).toBeEnabled({ timeout: 60_000 })
      await page.getByRole('button', { name: /Load/i }).click()

      // The tree should load and show the entry's category
      await expect(page.getByText('E2ECategory')).toBeVisible({ timeout: 10_000 })
    } finally {
      await apiRequest(request, 'DELETE', `/api/invest-track/budget-entries/${entryId}`, token)
    }
  })

  test('expand all and collapse all buttons work', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const today = new Date().toISOString().slice(0, 10)

    const createRes = await apiRequest(request, 'POST', '/api/invest-track/budget-entries', token, {
      name: 'E2ETreeExpandEntry',
      category: 'E2EExpandCat',
      currency: 'PLN',
      value: 10.0,
      entryDate: today,
      entryType: 'Expense',
      paymentMethod: 'Card',
      notes: null,
      isRecurring: false,
    })
    expect(createRes.status()).toBeLessThan(300)
    const entryId = (await createRes.json()).id

    try {
      await page.goto('/invest-track/budget-tree')
      await expect(page.getByRole('button', { name: /Load/i })).toBeEnabled({ timeout: 60_000 })
      await page.getByRole('button', { name: /Load/i }).click()
      await expect(page.getByText('E2EExpandCat')).toBeVisible({ timeout: 10_000 })

      // Expand all — the entry name should become visible
      await page.getByRole('button', { name: /Expand All/i }).click()
      await expect(page.getByText('E2ETreeExpandEntry')).toBeVisible()

      // Collapse all — categories should be hidden
      await page.getByRole('button', { name: /Collapse All/i }).click()
      await expect(page.getByText('E2ETreeExpandEntry')).not.toBeVisible()
    } finally {
      await apiRequest(request, 'DELETE', `/api/invest-track/budget-entries/${entryId}`, token)
    }
  })

  // ── REST API ─────────────────────────────────────────────────────────────

  test('GET /api/invest-track/budget-tree returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/invest-track/budget-tree', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/invest-track/budget-tree with date range returns correct structure', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const today = new Date().toISOString().slice(0, 10)
    const createRes = await apiRequest(request, 'POST', '/api/invest-track/budget-entries', token, {
      name: 'E2ETreeApiEntry',
      category: 'E2EApiCat',
      currency: 'PLN',
      value: 77.5,
      entryDate: today,
      entryType: 'Income',
      paymentMethod: 'Card',
      notes: 'api test',
      isRecurring: false,
    })
    expect(createRes.status()).toBeLessThan(300)
    const entryId = (await createRes.json()).id

    try {
      const year = new Date().getFullYear()
      const res = await apiRequest(request, 'GET', `/api/invest-track/budget-tree?startDate=${year}-01-01&endDate=${today}`, token)
      expect(res.status()).toBe(200)
      const months = await res.json()
      expect(Array.isArray(months)).toBe(true)

      // Find a month that has our entry
      const hasEntry = months.some((m: { categories: { items: { name: string }[] }[] }) =>
        m.categories.some((c) => c.items.some((i) => i.name === 'E2ETreeApiEntry'))
      )
      expect(hasEntry, 'E2ETreeApiEntry should appear in budget tree response').toBe(true)

      // Check structure
      if (months.length > 0) {
        const month = months[0]
        expect(month).toHaveProperty('key')
        expect(month).toHaveProperty('label')
        expect(month).toHaveProperty('totalPln')
        expect(month).toHaveProperty('entryType')
        expect(month).toHaveProperty('categories')
        expect(Array.isArray(month.categories)).toBe(true)
      }
    } finally {
      await apiRequest(request, 'DELETE', `/api/invest-track/budget-entries/${entryId}`, token)
    }
  })
})
