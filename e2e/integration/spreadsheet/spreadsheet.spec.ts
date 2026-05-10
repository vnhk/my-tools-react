import { test, expect, loginViaApi, apiRequest } from '../fixtures'

test.describe('Spreadsheet — integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('navigates to spreadsheet list and shows New Spreadsheet button', async ({ page }) => {
    await page.goto('/spreadsheet')
    await expect(page.getByRole('button', { name: /New Spreadsheet/i })).toBeVisible()
  })

  test('new spreadsheet dialog opens and validates empty name', async ({ page }) => {
    await page.goto('/spreadsheet')
    await page.getByRole('button', { name: /New Spreadsheet/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /^Create$/i }).click()
    await expect(page.getByText(/Name is required/i)).toBeVisible()
  })

  test('GET /api/spreadsheet returns 200 and array', async ({ page, request }) => {
    const token = await loginViaApi(page)
    const res = await apiRequest(request, 'GET', '/api/spreadsheet', token)
    expect(res.status()).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })

  test('POST creates, GET /data loads rows, DELETE removes', async ({ page, request }) => {
    const token = await loginViaApi(page)

    const createRes = await apiRequest(request, 'POST', '/api/spreadsheet', token, {
      name: 'E2E Spreadsheet',
      description: 'test',
    })
    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    expect(created.id).toBeTruthy()
    expect(created.name).toBe('E2E Spreadsheet')

    const dataRes = await apiRequest(request, 'GET', `/api/spreadsheet/${created.id}/data`, token)
    expect(dataRes.status()).toBe(200)
    const data = await dataRes.json()
    expect(Array.isArray(data.rows)).toBe(true)
    expect(data.rows.length).toBeGreaterThan(0)

    const deleteRes = await apiRequest(request, 'DELETE', `/api/spreadsheet/${created.id}`, token)
    expect(deleteRes.status()).toBe(204)

    const listRes = await apiRequest(request, 'GET', '/api/spreadsheet', token)
    const list = await listRes.json()
    expect(list.find((s: { id: string }) => s.id === created.id)).toBeUndefined()
  })

  test('editor page loads and shows toolbar', async ({ page, request }) => {
    const token = await loginViaApi(page)

    const createRes = await apiRequest(request, 'POST', '/api/spreadsheet', token, {
      name: 'E2E Editor Test',
    })
    const created = await createRes.json()

    await page.goto(`/spreadsheet/${created.id}`)
    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Row/i })).toBeVisible()

    await apiRequest(request, 'DELETE', `/api/spreadsheet/${created.id}`, token)
  })
})
