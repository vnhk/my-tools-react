import { test, expect, setupAuth, pageResponse } from '../fixtures'

const ITEMS = [
  {
    id: '1', summary: 'Buy groceries', content: '<p>Milk, eggs, bread</p>',
    orderInPocket: 0, encrypted: false, deleted: false,
    creationDate: '2024-01-01', modificationDate: '2024-01-05', pocketName: 'Work',
  },
  {
    id: '2', summary: 'Secret note', content: '',
    orderInPocket: 1, encrypted: true, deleted: false,
    creationDate: '2024-01-01', modificationDate: '2024-01-05', pocketName: 'Work',
  },
]

test.describe('Pocket items', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.route('**/api/pocket-app/all-pocket-items**', (route) =>
      route.fulfill({ json: pageResponse(ITEMS) })
    )
  })

  test('displays items for a pocket', async ({ page }) => {
    await page.goto('/pocket/Work')
    await expect(page.getByRole('cell', { name: 'Buy groceries' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Secret note' })).toBeVisible()
  })

  test('shows encrypted badge for encrypted items', async ({ page }) => {
    await page.goto('/pocket/Work')
    await expect(page.getByText('🔒 encrypted')).toBeVisible()
  })

  test('opens new item dialog', async ({ page }) => {
    await page.goto('/pocket/Work')
    await page.getByRole('button', { name: /New Item/i }).click()
    await expect(page.getByText('New Item', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Summary')).toBeVisible()
  })

  test('creates a new item', async ({ page }) => {
    const newItem = {
      id: '3', summary: 'New task', content: '', orderInPocket: 2,
      encrypted: false, deleted: false, creationDate: null, modificationDate: null, pocketName: 'Work',
    }
    let created = false
    await page.route('**/api/pocket-app/all-pocket-items**', (route) => {
      if (route.request().method() === 'POST') {
        created = true
        route.fulfill({ json: newItem })
      } else {
        route.fulfill({ json: pageResponse(created ? [...ITEMS, newItem] : ITEMS) })
      }
    })

    await page.goto('/pocket/Work')
    await page.getByRole('button', { name: /New Item/i }).click()
    await page.getByLabel('Summary').fill('New task')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'New task' })).toBeVisible()
  })

  test('opens decrypt dialog for encrypted item', async ({ page }) => {
    await page.goto('/pocket/Work')
    await page.getByRole('button', { name: /🔓 Decrypt/i }).click()
    await expect(page.getByText(/Decrypt: Secret note/i)).toBeVisible()
    await expect(page.getByPlaceholder('Enter decryption password')).toBeVisible()
  })

  test('decrypts item with correct password', async ({ page }) => {
    await page.route('**/api/pocket-app/all-pocket-items/2/decrypt', (route) =>
      route.fulfill({ json: { content: '<p>Top secret content</p>' } })
    )

    await page.goto('/pocket/Work')
    await page.getByRole('button', { name: /🔓 Decrypt/i }).click()
    await page.getByPlaceholder('Enter decryption password').fill('correct-password')
    await page.getByRole('button', { name: 'Decrypt', exact: true }).click()

    await expect(page.getByText('Top secret content')).toBeVisible()
  })

  test('shows error on wrong decrypt password', async ({ page }) => {
    await page.route('**/api/pocket-app/all-pocket-items/2/decrypt', (route) =>
      route.fulfill({ status: 403, json: { message: 'Forbidden' } })
    )

    await page.goto('/pocket/Work')
    await page.getByRole('button', { name: /🔓 Decrypt/i }).click()
    await page.getByPlaceholder('Enter decryption password').fill('wrong-password')
    await page.getByRole('button', { name: 'Decrypt', exact: true }).click()

    await expect(page.getByText(/Decryption failed/i)).toBeVisible()
  })

  test('navigates back to pockets list', async ({ page }) => {
    await page.route('**/api/pocket-app/pockets**', (route) =>
      route.fulfill({ json: pageResponse([]) })
    )
    await page.goto('/pocket/Work')
    await page.getByRole('link', { name: /← Pockets/i }).click()
    await expect(page).toHaveURL('/pocket')
  })

  test('deletes an item', async ({ page }) => {
    let deleted = false
    await page.route('**/api/pocket-app/all-pocket-items**', (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true
        route.fulfill({ status: 204, body: '' })
      } else {
        route.fulfill({ json: pageResponse(deleted ? [ITEMS[1]] : ITEMS) })
      }
    })

    await page.goto('/pocket/Work')
    await page.getByRole('row', { name: /Buy groceries/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()

    await expect(page.getByRole('cell', { name: 'Buy groceries' })).not.toBeVisible()
  })
})
