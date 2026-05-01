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
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: 'Gamma' })).toBeVisible()
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
})
