import { test, expect, loginViaApi } from '../fixtures'

test.describe('Language Learning — English integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create English word, verify it appears in list, then delete it', async ({ page }) => {
    await page.goto('/english/words')

    await page.getByRole('button', { name: /Add Word/i }).click()
    await page.getByLabel('Text').fill('E2EWordEN')
    await page.getByLabel('Translation').first().fill('E2ETransEN')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByRole('cell', { name: 'E2EWordEN' })).toBeVisible({ timeout: 15_000 })

    // Cleanup
    await page.getByRole('row', { name: /E2EWordEN/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EWordEN' })).not.toBeVisible()
  })

  test('edit English word text', async ({ page }) => {
    await page.goto('/english/words')

    // Create
    await page.getByRole('button', { name: /Add Word/i }).click()
    await page.getByLabel('Text').fill('E2EWordEdit')
    await page.getByLabel('Translation').first().fill('E2ETransEdit')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2EWordEdit' })).toBeVisible({ timeout: 15_000 })

    // Edit
    await page.getByRole('row', { name: /E2EWordEdit/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Text').fill('E2EWordEdited')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EWordEdited' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2EWordEdit', exact: true })).not.toBeVisible()

    // Cleanup
    await page.getByRole('row', { name: /E2EWordEdited/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EWordEdited' })).not.toBeVisible()
  })

  test('shows validation error when Text is missing', async ({ page }) => {
    await page.goto('/english/words')
    await page.getByRole('button', { name: /Add Word/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/required/i).first()).toBeVisible()
  })

  test('tabs navigate correctly — English', async ({ page }) => {
    await page.goto('/english/words')
    await expect(page).toHaveURL('/english/words')

    await page.getByRole('link', { name: /Flashcards/i }).click()
    await expect(page).toHaveURL('/english/flashcards')

    await page.getByRole('link', { name: /Quiz/i }).click()
    await expect(page).toHaveURL('/english/quiz')

    await page.getByRole('link', { name: /Crossword/i }).click()
    await expect(page).toHaveURL('/english/crossword')
  })

  test('Flashcards page shows Start button before loading', async ({ page }) => {
    await page.goto('/english/flashcards')
    await expect(page.getByRole('button', { name: /Start/i })).toBeVisible()
    await expect(page.getByText(/Click.*Start/i)).toBeVisible()
  })

  test('Quiz page shows New Quiz button before loading', async ({ page }) => {
    await page.goto('/english/quiz')
    await expect(page.getByRole('button', { name: /New Quiz/i })).toBeVisible()
    await expect(page.getByText(/Click.*New Quiz/i)).toBeVisible()
  })

  test('Crossword page shows Generate button before loading', async ({ page }) => {
    await page.goto('/english/crossword')
    await expect(page.getByRole('button', { name: /Generate Crossword/i })).toBeVisible()
    await expect(page.getByText(/Click.*Generate/i)).toBeVisible()
  })
})

test.describe('Language Learning — Spanish integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create Spanish word, verify it appears in list, then delete it', async ({ page }) => {
    await page.goto('/spanish/words')

    await page.getByRole('button', { name: /Add Word/i }).click()
    await page.getByLabel('Text').fill('E2EWordES')
    await page.getByLabel('Translation').first().fill('E2ETransES')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByRole('cell', { name: 'E2EWordES' })).toBeVisible({ timeout: 15_000 })

    // Cleanup
    await page.getByRole('row', { name: /E2EWordES/ }).getByRole('checkbox').check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EWordES' })).not.toBeVisible()
  })

  test('tabs navigate correctly — Spanish', async ({ page }) => {
    await page.goto('/spanish/words')
    await page.getByRole('link', { name: /Flashcards/i }).click()
    await expect(page).toHaveURL('/spanish/flashcards')
  })
})
