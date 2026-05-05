import { test, expect, loginViaApi } from '../fixtures'

test.describe('Invest Track — Budget Entries integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create budget entry, verify it appears, then delete it', async ({ page }) => {
    await page.goto('/invest-track/budget')

    await page.getByRole('button', { name: /\+ New Entry/i }).click()

    // DynamicForm fields — labels from BudgetEntry.yml
    await page.getByLabel('Name').fill('E2EBudgetEntry')
    await page.getByLabel('Owners').fill('testUser')
    await page.getByLabel('Value').fill('99')
    // entryDate field rendered via DynamicForm — label is "Date"
    await page.getByLabel('Date').fill(new Date().toISOString().slice(0, 10))

    await page.getByRole('button', { name: 'Save' }).click()
    // Wait for dialog to close before interacting with elements behind it
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Entries are grouped in a month+category accordion — expand all to reveal them
    await page.getByRole('button', { name: 'Expand All' }).click()
    await expect(page.getByText('E2EBudgetEntry')).toBeVisible()

    // Select the item row and delete
    await page.getByText('E2EBudgetEntry').click()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByText('E2EBudgetEntry')).not.toBeVisible()
  })
})
