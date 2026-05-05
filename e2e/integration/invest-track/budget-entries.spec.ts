import { test, expect, loginViaApi } from '../fixtures'

test.describe('Invest Track — Budget Entries integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create budget entry, verify it appears, then delete it', async ({ page }) => {
    await page.goto('/invest-track/budget')

    await page.getByRole('button', { name: /\+ New Entry/i }).click()

    await page.getByLabel('Category').fill('E2ECategory')
    await page.getByLabel('Name').fill('E2EBudgetEntry')
    await page.getByLabel('Value').fill('99')
    await page.getByLabel('Date').fill(new Date().toISOString().slice(0, 10))

    const saveResponse = page.waitForResponse(
      r => r.url().includes('/invest-track/budget-entries') && r.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Save' }).click()
    const resp = await saveResponse
    const respBody = await resp.text()
    expect(resp.status(), `POST /invest-track/budget-entries failed [${resp.status()}]: ${respBody}`).toBeLessThan(300)

    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.getByRole('button', { name: 'Expand All' }).click()
    await expect(page.getByText('E2EBudgetEntry')).toBeVisible()

    await page.getByText('E2EBudgetEntry').click()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByText('E2EBudgetEntry')).not.toBeVisible()
  })
})
