import { test, expect, loginViaApi, apiRequest } from '../fixtures'

test.describe('Shopping Stats — integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  // ── Navigation & layout ──────────────────────────────────────────────────

  test('navigates to shopping products page and shows search bar', async ({ page }) => {
    await page.goto('/shopping/products')

    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible()
    await expect(page.getByText(/Shop/i).first()).toBeVisible()
  })

  test('shopping tabs are visible', async ({ page }) => {
    await page.goto('/shopping/products')

    await expect(page.getByRole('link', { name: /Products/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Best Offers/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Alerts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Shops/i })).toBeVisible()
  })

  test('product search shows empty state before searching', async ({ page }) => {
    await page.goto('/shopping/products')

    await expect(page.getByText(/Enter search criteria/i)).toBeVisible()
  })

  test('best-offers page shows search button', async ({ page }) => {
    await page.goto('/shopping/best-offers')

    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible()
    await expect(page.getByText(/Discount Min/i)).toBeVisible()
    await expect(page.getByText(/Months/i)).toBeVisible()
  })

  // ── Product Alerts CRUD ──────────────────────────────────────────────────

  test('product alerts page loads and shows new alert button', async ({ page }) => {
    await page.goto('/shopping/alerts')

    await expect(page.getByRole('button', { name: /\+ New Alert/i })).toBeVisible()
  })

  test('create product alert, verify it appears, then delete it', async ({ page, request }) => {
    const token = await loginViaApi(page)

    // Create via API
    const createRes = await apiRequest(request, 'POST', '/api/shopping/product-alerts', token, {
      name: 'E2EShoppingAlert',
      priceMin: 100,
      priceMax: 5000,
      discountMin: 10,
      discountMax: 80,
      productName: 'laptop',
      productCategories: [],
      emails: ['test@example.com'],
    })
    expect(createRes.status(), `POST product-alert failed: ${createRes.status()}`).toBeLessThan(300)
    const created = await createRes.json()
    const alertId = created.id

    try {
      await page.goto('/shopping/alerts')
      await expect(page.getByText('E2EShoppingAlert')).toBeVisible()
      await expect(page.getByText('laptop')).toBeVisible()
    } finally {
      // Cleanup
      await apiRequest(request, 'DELETE', `/api/shopping/product-alerts/${alertId}`, token)
    }
  })

  test('product alert dialog opens with correct fields', async ({ page }) => {
    await page.goto('/shopping/alerts')

    await page.getByRole('button', { name: /\+ New Alert/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('New Alert')).toBeVisible()
    await expect(page.getByText('Name *')).toBeVisible()
  })

  // ── Shop Config CRUD ─────────────────────────────────────────────────────

  test('shop config page loads', async ({ page }) => {
    await page.goto('/shopping/shop-config')

    await expect(page.getByRole('button', { name: /\+ New Shop/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Shop Name/i })).toBeVisible()
  })

  test('create shop config, verify it appears, then delete it', async ({ page, request }) => {
    const token = await loginViaApi(page)

    const createRes = await apiRequest(request, 'POST', '/api/shopping/shop-configs', token, {
      shopName: 'E2ETestShop',
      baseUrl: 'https://e2e-test-shop.example.com',
    })
    expect(createRes.status(), `POST shop-config failed: ${createRes.status()}`).toBeLessThan(300)
    const created = await createRes.json()
    const shopId = created.id

    try {
      await page.goto('/shopping/shop-config')
      await expect(page.getByText('E2ETestShop')).toBeVisible()
    } finally {
      await apiRequest(request, 'DELETE', `/api/shopping/shop-configs/${shopId}`, token)
    }
  })

  // ── Product Config CRUD ───────────────────────────────────────────────────

  test('product config page loads', async ({ page }) => {
    await page.goto('/shopping/product-config')

    await expect(page.getByRole('button', { name: /\+ New Config/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Name/i })).toBeVisible()
  })

  // ── Scrap Audit ──────────────────────────────────────────────────────────

  test('scrap audit page loads with date filter buttons', async ({ page }) => {
    await page.goto('/shopping/scrap-audit')

    await expect(page.getByRole('button', { name: /Today/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Yesterday/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible()
  })

  // ── REST API ─────────────────────────────────────────────────────────────

  test('GET /api/shopping/products/categories returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/shopping/products/categories', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/shopping/product-alerts returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/shopping/product-alerts', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/shopping/shop-configs returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/shopping/shop-configs', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/shopping/product-configs returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/shopping/product-configs', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/shopping/scrap-audits returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/shopping/scrap-audits', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/shopping/best-offers returns 200', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/shopping/best-offers?discountMin=10&months=3&page=0&size=5', token)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('allFound')
  })
})
