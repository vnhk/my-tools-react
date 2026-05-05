import { test, expect, loginViaApi } from '../fixtures'

test.describe('Invest Track — Wallets integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create wallet, verify it appears in list, then delete it', async ({ page }) => {
    await page.goto('/invest-track/wallets')

    await page.getByRole('button', { name: /New Wallet/i }).click()
    await page.getByLabel('Name').fill('E2EWallet')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'E2EWallet' })).toBeVisible()

    await page.getByRole('row', { name: /E2EWallet/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EWallet' })).not.toBeVisible()
  })

  test('edit wallet name', async ({ page }) => {
    await page.goto('/invest-track/wallets')

    // ── Create ──
    await page.getByRole('button', { name: /New Wallet/i }).click()
    await page.getByLabel('Name').fill('E2EWalletEdit')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EWalletEdit' })).toBeVisible()

    // ── Edit ──
    await page.getByRole('row', { name: /E2EWalletEdit/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Name').fill('E2EWalletRenamed')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EWalletRenamed' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2EWalletEdit', exact: true })).not.toBeVisible()

    // ── Cleanup ──
    await page.getByRole('row', { name: /E2EWalletRenamed/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EWalletRenamed' })).not.toBeVisible()
  })

  test('navigate to wallet detail and back', async ({ page }) => {
    await page.goto('/invest-track/wallets')

    // ── Create wallet to navigate to ──
    await page.getByRole('button', { name: /New Wallet/i }).click()
    await page.getByLabel('Name').fill('E2EWalletNav')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EWalletNav' })).toBeVisible()

    // ── Click row to open detail ──
    await page.getByRole('cell', { name: 'E2EWalletNav' }).click()
    await expect(page).toHaveURL(/\/invest-track\/wallets\/.+/)
    await expect(page.getByText('← Wallets')).toBeVisible()

    // ── Navigate back ──
    await page.getByText('← Wallets').click()
    await expect(page).toHaveURL('/invest-track/wallets')

    // ── Cleanup ──
    await page.getByRole('row', { name: /E2EWalletNav/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EWalletNav' })).not.toBeVisible()
  })

  test('shows validation error when name is missing', async ({ page }) => {
    await page.goto('/invest-track/wallets')
    await page.getByRole('button', { name: /New Wallet/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/required/i).first()).toBeVisible()
  })

  test('add snapshot, verify it appears, edit it, then delete it', async ({ page }) => {
    await page.goto('/invest-track/wallets')

    // ── Create wallet ──
    await page.getByRole('button', { name: /New Wallet/i }).click()
    await page.getByLabel('Name').fill('E2EWalletSnapshot')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EWalletSnapshot' })).toBeVisible()

    // ── Navigate to detail ──
    await page.getByRole('cell', { name: 'E2EWalletSnapshot' }).click()
    await expect(page).toHaveURL(/\/invest-track\/wallets\/.+/)

    // ── Add snapshot ──
    // NumberField/TextField don't associate label via htmlFor, so use CSS sibling selector
    await page.getByRole('button', { name: /Add Snapshot/i }).click()
    await page.locator('label:has-text("Snapshot Date") + input').fill('2025-01-01')
    await page.locator('label:has-text("Portfolio Value") + input').fill('10000')
    await page.locator('label:has-text("Monthly Deposit") + input').fill('500')
    await page.locator('label:has-text("Monthly Withdrawal") + input').fill('0')
    await page.locator('label:has-text("Monthly Earnings") + input').fill('100')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: '2025-01-01' })).toBeVisible()

    // ── Edit snapshot ──
    await page.getByRole('row', { name: /2025-01-01/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.locator('label:has-text("Monthly Deposit") + input').fill('999')
    await page.getByRole('button', { name: 'Save' }).click()

    // ── Delete snapshot ──
    await page.getByRole('row', { name: /2025-01-01/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: '2025-01-01' })).not.toBeVisible()

    // ── Go back and delete wallet ──
    await page.getByText('← Wallets').click()
    await page.getByRole('row', { name: /E2EWalletSnapshot/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EWalletSnapshot' })).not.toBeVisible()
  })
})
