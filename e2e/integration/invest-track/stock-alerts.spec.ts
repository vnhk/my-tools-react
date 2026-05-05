import { test, expect, loginViaApi } from '../fixtures'

test.describe('Invest Track — Stock Alerts integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create alert, verify it appears, then delete it', async ({ page }) => {
    await page.goto('/invest-track/alerts')

    await page.getByRole('button', { name: /New Alert/i }).click()
    await page.getByLabel('Alert Name').fill('E2EAlert')
    await page.getByLabel('Symbol').fill('CDR')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'E2EAlert' })).toBeVisible()

    await page.getByRole('row', { name: /E2EAlert/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EAlert' })).not.toBeVisible()
  })

  test('edit alert name', async ({ page }) => {
    await page.goto('/invest-track/alerts')

    // ── Create ──
    await page.getByRole('button', { name: /New Alert/i }).click()
    await page.getByLabel('Alert Name').fill('E2EAlertEdit')
    await page.getByLabel('Symbol').fill('PKN')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EAlertEdit' })).toBeVisible()

    // ── Edit (click row to open edit dialog) ──
    await page.getByRole('row', { name: /E2EAlertEdit/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Alert Name').fill('E2EAlertRenamed')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EAlertRenamed' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2EAlertEdit', exact: true })).not.toBeVisible()

    // ── Cleanup ──
    await page.getByRole('row', { name: /E2EAlertRenamed/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EAlertRenamed' })).not.toBeVisible()
  })
})
