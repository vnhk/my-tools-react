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
    // exact: true avoids matching '2' inside pagination buttons like '25 / page'
    await expect(page.getByText('2', { exact: true })).toBeVisible()
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

  test('edits project status via inline field', async ({ page }) => {
    let putCalled = false
    await page.route('**/api/project-management/projects/p1', (route) => {
      if (route.request().method() === 'PUT') {
        putCalled = true
        route.fulfill({ json: { ...PROJECT, status: 'In Progress' } })
      } else {
        route.fulfill({ json: putCalled ? { ...PROJECT, status: 'In Progress' } : PROJECT })
      }
    })

    await page.goto('/projects/p1')
    // Status inline field is first "Open" on the page (before stats and task table)
    await page.getByText('Open').first().click()
    await page.getByRole('option', { name: 'In Progress' }).click()

    await expect(page.getByText('In Progress').first()).toBeVisible()
  })

  test('edits project priority via inline field', async ({ page }) => {
    let putCalled = false
    await page.route('**/api/project-management/projects/p1', (route) => {
      if (route.request().method() === 'PUT') {
        putCalled = true
        route.fulfill({ json: { ...PROJECT, priority: 'Critical' } })
      } else {
        route.fulfill({ json: putCalled ? { ...PROJECT, priority: 'Critical' } : PROJECT })
      }
    })

    await page.goto('/projects/p1')
    await page.getByText('High').first().click()
    await page.getByRole('option', { name: 'Critical' }).click()

    await expect(page.getByText('Critical')).toBeVisible()
  })

  test('creates a new task', async ({ page }) => {
    const newTask = {
      ...TASKS[0], id: 't2', name: 'Write tests', number: 'TSK-002',
    }
    let created = false
    await page.route('**/api/project-management/tasks**', (route) => {
      if (route.request().method() === 'POST') {
        created = true
        route.fulfill({ json: newTask })
      } else {
        route.fulfill({ json: pageResponse(created ? [...TASKS, newTask] : TASKS) })
      }
    })

    await page.goto('/projects/p1')
    await page.getByRole('button', { name: /New Task/i }).click()
    await page.getByLabel('Name').fill('Write tests')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: /Write tests/ })).toBeVisible()
  })

  test('edits an existing task', async ({ page }) => {
    let patched = false
    // More specific route (added last) takes priority over beforeEach **/tasks** for /tasks/t1
    await page.route('**/api/project-management/tasks**', (route) => {
      route.fulfill({ json: pageResponse(patched ? [{ ...TASKS[0], name: 'Updated bug' }] : TASKS) })
    })
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASKS[0], name: 'Updated bug' } })
      } else {
        route.continue()
      }
    })

    await page.goto('/projects/p1')
    await page.getByRole('row', { name: /Fix login bug/ }).getByRole('checkbox').check()
    // .last() because description section also has an 'Edit' button that appears first in DOM
    await page.getByRole('button', { name: 'Edit' }).last().click()
    await page.getByLabel('Name').fill('Updated bug')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('cell', { name: /Updated bug/ })).toBeVisible()
  })

  test('deletes a task', async ({ page }) => {
    let deleted = false
    await page.route('**/api/project-management/tasks**', (route) => {
      route.fulfill({ json: pageResponse(deleted ? [] : TASKS) })
    })
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })

    await page.goto('/projects/p1')
    await page.getByRole('row', { name: /Fix login bug/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()

    await expect(page.getByRole('cell', { name: /Fix login bug/ })).not.toBeVisible()
  })

  test('edits description', async ({ page }) => {
    let putCalled = false
    await page.route('**/api/project-management/projects/p1', (route) => {
      if (route.request().method() === 'PUT') {
        putCalled = true
        route.fulfill({ json: { ...PROJECT, description: 'Updated description' } })
      } else {
        route.fulfill({ json: putCalled ? { ...PROJECT, description: 'Updated description' } : PROJECT })
      }
    })

    await page.goto('/projects/p1')
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.locator('textarea').fill('Updated description')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Updated description')).toBeVisible()
  })

  test('cancels description edit', async ({ page }) => {
    await page.goto('/projects/p1')
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.locator('textarea')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('textarea')).not.toBeVisible()
    await expect(page.getByText('Project description')).toBeVisible()
  })

  test('shows overdue stat', async ({ page }) => {
    await page.route('**/api/project-management/projects/p1/stats', (route) =>
      route.fulfill({ json: { total: 5, open: 2, inProgress: 1, done: 2, overdue: 3 } })
    )

    await page.goto('/projects/p1')
    await expect(page.getByText('3')).toBeVisible()
    await expect(page.getByText('Overdue')).toBeVisible()
  })

  test('shows task form validation error when name is missing', async ({ page }) => {
    await page.goto('/projects/p1')
    await page.getByRole('button', { name: /New Task/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/required/i)).toBeVisible()
  })

  test('filters tasks by search', async ({ page }) => {
    const TASKS2 = [
      { ...TASKS[0], id: 't2', name: 'Write tests', number: 'TSK-002' },
    ]
    await page.route('**/api/project-management/tasks**', (route) => {
      const url = new URL(route.request().url())
      const search = url.searchParams.get('search')
      route.fulfill({ json: pageResponse(search ? TASKS2 : TASKS) })
    })

    await page.goto('/projects/p1')
    await page.getByPlaceholder('Search…').fill('Write')
    await expect(page.getByRole('cell', { name: /Write tests/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: /Fix login bug/ })).not.toBeVisible()
  })
})
