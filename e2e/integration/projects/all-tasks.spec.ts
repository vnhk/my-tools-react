import { test, expect, setupAuth, pageResponse } from '../fixtures'

const TASKS = [
  {
    id: 't1', name: 'Fix login bug', number: 'TSK-001', status: 'Open', type: 'Bug', priority: 'High',
    description: null, dueDate: null, assignee: null, estimatedHours: null, completionPercentage: null,
    tags: null, modificationDate: null, projectId: 'p1', projectNumber: 'PRJ-001',
  },
  {
    id: 't2', name: 'Write docs', number: 'TSK-002', status: 'Done', type: 'Task', priority: 'Low',
    description: null, dueDate: null, assignee: null, estimatedHours: null, completionPercentage: 100,
    tags: null, modificationDate: null, projectId: 'p1', projectNumber: 'PRJ-001',
  },
]

test.describe('All tasks', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.route('**/api/project-management/tasks**', (route) =>
      route.fulfill({ json: pageResponse(TASKS) })
    )
  })

  test('displays all tasks', async ({ page }) => {
    await page.goto('/projects/all-tasks')
    await expect(page.getByRole('cell', { name: /Fix login bug/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: /Write docs/ })).toBeVisible()
  })

  test('navigates to task details on row click', async ({ page }) => {
    await page.route('**/api/project-management/tasks/t1', (route) =>
      route.fulfill({ json: { ...TASKS[0], projectName: 'Alpha', relations: [] } })
    )

    await page.goto('/projects/all-tasks')
    await page.getByRole('cell', { name: /Fix login bug/ }).click()

    await expect(page).toHaveURL(/\/projects\/tasks\/t1/)
  })

  test('edits a task', async ({ page }) => {
    let updated = false
    // List route (lower priority — added first)
    await page.route('**/api/project-management/tasks**', (route) => {
      route.fulfill({ json: pageResponse(updated ? [{ ...TASKS[0], name: 'Fix login bug (updated)' }, TASKS[1]] : TASKS) })
    })
    // Specific task route (higher priority — added last)
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PUT') {
        updated = true
        route.fulfill({ json: { ...TASKS[0], name: 'Fix login bug (updated)' } })
      } else {
        route.continue()
      }
    })

    await page.goto('/projects/all-tasks')
    await page.getByRole('row', { name: /Fix login bug/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Name').fill('Fix login bug (updated)')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: /Fix login bug \(updated\)/ })).toBeVisible()
  })

  test('deletes a task', async ({ page }) => {
    let deleted = false
    await page.route('**/api/project-management/tasks**', (route) => {
      route.fulfill({ json: pageResponse(deleted ? [TASKS[1]] : TASKS) })
    })
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })

    await page.goto('/projects/all-tasks')
    await page.getByRole('row', { name: /Fix login bug/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()

    await expect(page.getByRole('cell', { name: /Fix login bug/ })).not.toBeVisible()
    await expect(page.getByRole('cell', { name: /Write docs/ })).toBeVisible()
  })

  test('back button navigates to projects', async ({ page }) => {
    await page.route('**/api/project-management/projects**', (route) =>
      route.fulfill({ json: pageResponse([]) })
    )

    await page.goto('/projects/all-tasks')
    await page.getByRole('button', { name: /← Projects/i }).click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('filters tasks by search', async ({ page }) => {
    await page.route('**/api/project-management/tasks**', (route) => {
      const url = new URL(route.request().url())
      const search = url.searchParams.get('search')
      route.fulfill({ json: pageResponse(search ? [TASKS[0]] : TASKS) })
    })

    await page.goto('/projects/all-tasks')
    await page.getByPlaceholder('Search…').fill('Fix')
    await expect(page.getByRole('cell', { name: /Fix login bug/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: /Write docs/ })).not.toBeVisible()
  })

  test('shows task type icon in name cell', async ({ page }) => {
    await page.goto('/projects/all-tasks')
    // Bug type has 🐛 icon
    await expect(page.getByRole('cell', { name: /🐛/ })).toBeVisible()
  })
})
