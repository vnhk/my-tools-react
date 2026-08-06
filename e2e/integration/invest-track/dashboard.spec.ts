import { test, expect, loginViaApi } from '../fixtures'

test.describe('Invest Track — Dashboard integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('loads dashboard with KPIs and comparison toggles, switches tabs', async ({ page }) => {
    await page.goto('/invest-track/dashboard')

    // Inner tab navigation
    await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Balance', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Earnings', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'FIRE', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Short Term Strategies', exact: true })).toBeVisible()

    // KPI sections render (proves the dashboard finished loading, not stuck on "Loading…")
    await expect(page.getByText('Investments', { exact: true })).toBeVisible()
    await expect(page.getByText('Savings & Net Worth')).toBeVisible()

    // Index/benchmark comparison toggles, including the fixed-deposit line
    await expect(page.getByText('Compare with:')).toBeVisible()
    const bankFixedCheckbox = page.getByLabel('Bank Fixed Deposit 3.5%')
    await expect(bankFixedCheckbox).toBeVisible()
    await bankFixedCheckbox.check()
    await expect(bankFixedCheckbox).toBeChecked()
    // Page keeps rendering after the toggle — no crash
    await expect(page.getByText('Investment Portfolio: Balance vs Deposits')).toBeVisible()

    // Switch to Balance tab — wallet filter panel appears
    await page.getByRole('button', { name: 'Balance', exact: true }).click()
    await expect(page.getByText('Compare with:')).toBeVisible()

    // Switch to FIRE tab
    await page.getByRole('button', { name: 'FIRE', exact: true }).click()
    await expect(page.getByText('Investments', { exact: true })).not.toBeVisible()
  })
})
