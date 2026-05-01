import { test, expect, setupAuth, pageResponse } from '../fixtures'

const PROJECT = {
  id: 'p1', name: 'Alpha', number: 'PRJ-001', status: 'Open', priority: 'High',
  description: 'Project description', modificationDate: '2024-01-10',
}
const STATS = { total: 2, open: 1, inProgress: 1, done: 0, overdue: 0 }
const TASKS = [
  { id: 't1', name: 'Fix login bug', number: 'TSK-001', status: 'Open', type: 'Bug', priority: 'High', description: null, dueDate: null, assignee: null, estimatedHours: null, completionPercentage: null, tags: null, modificationDate: null, projectId: 'p1', projectNumber: 'PRJ-001' },
]

test.describe('Project details', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.route('**/api/project-management/projects/p1', (route) =>
      route.fulfill({ json: PROJECT })
    )
    await page.route('**/api/project-management/projects/p1/stats', (route) =>
      route.fulfill({ json: STATS })
    )
    await page.route('**/api/project-management/tasks**', (route) =>
      route.fulfill({ json: pageResponse(TASKS) })
    )
  })

  test('displays project header and stats', async ({ page }) => {
    await page.goto('/projects/p1')
    await expect(page.getByText('PRJ-001')).toBeVisible()
    await expect(page.getByText('Alpha')).toBeVisible()
    await expect(page.getByText('2')).toBeVisible()  // total stat
  })

  test('shows task list', async ({ page }) => {
    await page.goto('/projects/p1')
    await expect(page.getByRole('cell', { name: /Fix login bug/ })).toBeVisible()
  })

  test('navigates to task details on row click', async ({ page }) => {
    await page.route('**/api/project-management/tasks/t1', (route) =>
      route.fulfill({ json: { ...TASKS[0], projectName: 'Alpha', relations: [] } })
    )
    await page.goto('/projects/p1')
    await page.getByRole('cell', { name: /Fix login bug/ }).click()
    await expect(page).toHaveURL(/\/projects\/tasks\/t1/)
  })

  test('back button navigates to project list', async ({ page }) => {
    await page.route('**/api/project-management/projects**', (route) =>
      route.fulfill({ json: pageResponse([PROJECT]) })
    )
    await page.goto('/projects/p1')
    await page.getByRole('button', { name: /← Projects/i }).click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('edits description', async ({ page }) => {
    await page.route('**/api/project-management/projects/p1', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ json: { ...PROJECT, description: 'Updated description' } })
      } else {
        route.fulfill({ json: PROJECT })
      }
    })

    await page.goto('/projects/p1')
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.locator('textarea').fill('Updated description')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Updated description')).toBeVisible()
  })
})
