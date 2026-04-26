import { test, expect, setupAuth, pageResponse } from '../fixtures'

const POCKETS = [
  { id: '1', name: 'Work', pocketSize: 3, creationDate: '2024-01-01', modificationDate: '2024-01-10', deleted: false },
  { id: '2', name: 'Personal', pocketSize: 1, creationDate: '2024-01-02', modificationDate: '2024-01-09', deleted: false },
]

test.describe('Pocket list', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.route('**/api/pocket-app/pockets**', (route) =>
      route.fulfill({ json: pageResponse(POCKETS) })
    )
  })

  test('displays pocket list', async ({ page }) => {
    await page.goto('/pocket')
    await expect(page.getByRole('cell', { name: 'Work' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Personal' })).toBeVisible()
  })

  test('navigates to pocket items on row click', async ({ page }) => {
    await page.route('**/api/pocket-app/all-pocket-items**', (route) =>
      route.fulfill({ json: pageResponse([]) })
    )
    await page.goto('/pocket')
    await page.getByRole('cell', { name: 'Work' }).click()
    await expect(page).toHaveURL(/\/pocket\/Work/)
  })

  test('opens new pocket dialog', async ({ page }) => {
    await page.goto('/pocket')
    await page.getByRole('button', { name: /New Pocket/i }).click()
    await expect(page.getByText('New Pocket', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
  })

  test('creates a new pocket', async ({ page }) => {
    const newPocket = { id: '3', name: 'Ideas', pocketSize: 0, creationDate: null, modificationDate: null, deleted: false }
    let created = false
    await page.route('**/api/pocket-app/pockets**', (route) => {
      if (route.request().method() === 'POST') {
        created = true
        route.fulfill({ json: newPocket })
      } else {
        route.fulfill({ json: pageResponse(created ? [...POCKETS, newPocket] : POCKETS) })
      }
    })

    await page.goto('/pocket')
    await page.getByRole('button', { name: /New Pocket/i }).click()
    await page.getByLabel('Name').fill('Ideas')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'Ideas' })).toBeVisible()
  })

  test('edits a pocket name', async ({ page }) => {
    let updated = false
    await page.route('**/api/pocket-app/pockets**', (route) => {
      const method = route.request().method()
      if (method === 'PUT') {
        updated = true
        route.fulfill({ json: { ...POCKETS[0], name: 'Work Updated' } })
      } else {
        route.fulfill({ json: pageResponse(updated ? [{ ...POCKETS[0], name: 'Work Updated' }, POCKETS[1]] : POCKETS) })
      }
    })

    await page.goto('/pocket')
    await page.getByRole('row', { name: /Work/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Name').fill('Work Updated')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'Work Updated' })).toBeVisible()
  })

  test('deletes a pocket', async ({ page }) => {
    let deleted = false
    await page.route('**/api/pocket-app/pockets**', (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true
        route.fulfill({ status: 204, body: '' })
      } else {
        route.fulfill({ json: pageResponse(deleted ? [POCKETS[1]] : POCKETS) })
      }
    })

    await page.goto('/pocket')
    await page.getByRole('row', { name: /Work/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()

    await expect(page.getByRole('cell', { name: 'Work' })).not.toBeVisible()
  })
})
