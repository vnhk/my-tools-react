import { test, expect, setupAuth, pageResponse } from '../fixtures'

const PROJECTS = [
  { id: 'p1', name: 'Alpha', number: 'PRJ-001', status: 'Open', priority: 'High', description: null, modificationDate: null },
  { id: 'p2', name: 'Beta', number: 'PRJ-002', status: 'Done', priority: 'Low', description: 'desc', modificationDate: null },
]

test.describe('Project list', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.route('**/api/project-management/projects**', (route) =>
      route.fulfill({ json: pageResponse(PROJECTS) })
    )
  })

  test('displays project list', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('cell', { name: 'Alpha' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Beta' })).toBeVisible()
  })

  test('navigates to project details on row click', async ({ page }) => {
    await page.route('**/api/project-management/projects/p1', (route) =>
      route.fulfill({ json: PROJECTS[0] })
    )
    await page.route('**/api/project-management/projects/p1/stats', (route) =>
      route.fulfill({ json: { total: 0, open: 0, inProgress: 0, done: 0, overdue: 0 } })
    )
    await page.route('**/api/project-management/tasks**', (route) =>
      route.fulfill({ json: pageResponse([]) })
    )
    await page.goto('/projects')
    await page.getByRole('cell', { name: 'Alpha' }).click()
    await expect(page).toHaveURL(/\/projects\/p1/)
  })

  test('opens new project dialog', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await expect(page.getByLabel('Name')).toBeVisible()
  })

  test('creates a new project', async ({ page }) => {
    const newProject = { id: 'p3', name: 'Gamma', number: 'PRJ-003', status: 'Open', priority: 'Medium', description: null, modificationDate: null }
    let created = false
    await page.route('**/api/project-management/projects**', (route) => {
      if (route.request().method() === 'POST') {
        created = true
        route.fulfill({ json: newProject })
      } else {
        route.fulfill({ json: pageResponse(created ? [...PROJECTS, newProject] : PROJECTS) })
      }
    })

    await page.goto('/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await page.getByLabel('Name').fill('Gamma')
    await page.getByLabel('Number').fill('PRJ-003')
    await page.getByLabel('Status').click()
    await page.getByRole('option', { name: 'Open' }).click()
    await page.getByLabel('Priority').click()
    await page.getByRole('option', { name: 'Medium' }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'Gamma' })).toBeVisible()
  })

  test('edits a project', async ({ page }) => {
    let updated = false
    await page.route('**/api/project-management/projects**', (route) => {
      if (route.request().method() === 'PUT') {
        updated = true
        route.fulfill({ json: { ...PROJECTS[0], name: 'Alpha Updated' } })
      } else {
        route.fulfill({ json: pageResponse(updated ? [{ ...PROJECTS[0], name: 'Alpha Updated' }, PROJECTS[1]] : PROJECTS) })
      }
    })

    await page.goto('/projects')
    await page.getByRole('row', { name: /Alpha/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Name').fill('Alpha Updated')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'Alpha Updated' })).toBeVisible()
  })

  test('deletes a project', async ({ page }) => {
    let deleted = false
    await page.route('**/api/project-management/projects**', (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true
        route.fulfill({ status: 204, body: '' })
      } else {
        route.fulfill({ json: pageResponse(deleted ? [PROJECTS[1]] : PROJECTS) })
      }
    })

    await page.goto('/projects')
    await page.getByRole('row', { name: /Alpha/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()

    await expect(page.getByRole('cell', { name: 'Alpha' })).not.toBeVisible()
  })

  test('navigates to all-tasks page', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /All Tasks/i }).click()
    await expect(page).toHaveURL(/\/projects\/all-tasks/)
  })

  test('filters projects by search', async ({ page }) => {
    let lastSearch: string | null = null
    await page.route('**/api/project-management/projects**', (route) => {
      const url = new URL(route.request().url())
      lastSearch = url.searchParams.get('search')
      route.fulfill({ json: pageResponse(lastSearch ? [PROJECTS[0]] : PROJECTS) })
    })

    await page.goto('/projects')
    await page.getByPlaceholder('Search…').fill('Alpha')
    await expect(page.getByRole('cell', { name: 'Alpha' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Beta' })).not.toBeVisible()
  })

  test('shows validation error when name is missing', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await page.getByLabel('Number').fill('PRJ-999')
    await page.getByRole('button', { name: 'Save' }).click()
    // Multiple 'required' errors may appear (name, status, priority); .first() avoids strict mode
    await expect(page.getByText(/required/i).first()).toBeVisible()
  })

  test('closes dialog on cancel', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await expect(page.getByLabel('Name')).toBeVisible()
    await page.getByRole('button', { name: /Cancel/i }).click()
    await expect(page.getByLabel('Name')).not.toBeVisible()
  })
})
