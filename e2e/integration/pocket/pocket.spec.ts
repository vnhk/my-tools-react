import { test, expect, loginViaApi, apiRequest } from '../fixtures'

test.describe('Pocket — integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create pocket, verify it appears in list, then delete it', async ({ page, request }) => {
    // ── Login and navigate ──
    await page.goto('/pocket')
    await expect(page.getByRole('heading', { name: 'Pockets' })).toBeVisible()

    // ── Create pocket via UI ──
    await page.getByRole('button', { name: /New Pocket/i }).click()
    await page.getByLabel('Name').fill('E2EPocket')
    await page.getByRole('button', { name: 'Save' }).click()

    // ── Verify pocket appears in table ──
    await expect(page.getByRole('cell', { name: 'E2EPocket' })).toBeVisible()

    // ── Delete pocket ──
    await page.getByRole('row', { name: /E2EPocket/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EPocket' })).not.toBeVisible()
  })

  test('create pocket, add item, delete item, then delete pocket', async ({ page }) => {
    await page.goto('/pocket')

    // ── Create pocket ──
    await page.getByRole('button', { name: /New Pocket/i }).click()
    await page.getByLabel('Name').fill('E2EItemsPocket')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EItemsPocket' })).toBeVisible()

    // ── Open pocket ──
    await page.getByRole('cell', { name: 'E2EItemsPocket' }).click()
    await expect(page).toHaveURL(/\/pocket\/E2EItemsPocket/)

    // ── Create item ──
    await page.getByRole('button', { name: /New Item/i }).click()
    await page.getByLabel('Summary').fill('E2ETestItem')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2ETestItem' })).toBeVisible()

    // ── Delete item ──
    await page.getByRole('row', { name: /E2ETestItem/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2ETestItem' })).not.toBeVisible()

    // ── Go back and delete pocket ──
    await page.getByRole('link', { name: /← Pockets/i }).click()
    await expect(page).toHaveURL('/pocket')
    await page.getByRole('row', { name: /E2EItemsPocket/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EItemsPocket' })).not.toBeVisible()
  })

  test('edit pocket name', async ({ page }) => {
    await page.goto('/pocket')

    // ── Create pocket ──
    await page.getByRole('button', { name: /New Pocket/i }).click()
    await page.getByLabel('Name').fill('E2EEditPocket')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EEditPocket' })).toBeVisible()

    // ── Edit pocket name ──
    await page.getByRole('row', { name: /E2EEditPocket/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Name').fill('E2EEditPocketRenamed')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EEditPocketRenamed' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2EEditPocket', exact: true })).not.toBeVisible()

    // ── Cleanup ──
    await page.getByRole('row', { name: /E2EEditPocketRenamed/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EEditPocketRenamed' })).not.toBeVisible()
  })
})
