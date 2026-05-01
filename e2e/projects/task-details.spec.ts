import { test, expect, setupAuth } from '../fixtures'

const TASK = {
  id: 't1', name: 'Fix login bug', number: 'TSK-001', status: 'Open', type: 'Bug', priority: 'High',
  description: 'Steps to reproduce...', dueDate: '2024-02-01', assignee: 'Alice',
  estimatedHours: 4, completionPercentage: 25, tags: 'frontend,auth',
  modificationDate: '2024-01-15', projectId: 'p1', projectNumber: 'PRJ-001',
  projectName: 'Alpha',
  relations: [
    {
      id: 'r1', direction: 'CHILD', type: 'BLOCKS', displayName: 'Is blocked by',
      relatedTaskId: 't2', relatedTaskNumber: 'TSK-002', relatedTaskName: 'Setup OAuth',
      relatedTaskStatus: 'In Progress', relatedTaskType: 'Task',
    },
  ],
}

test.describe('Task details', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.route('**/api/project-management/tasks/t1', (route) =>
      route.fulfill({ json: TASK })
    )
  })

  test('displays task header', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    await expect(page.getByText('TSK-001')).toBeVisible()
    await expect(page.getByText('Fix login bug')).toBeVisible()
    await expect(page.getByText('Alpha (PRJ-001)')).toBeVisible()
  })

  test('displays progress bar', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    await expect(page.getByText('25%')).toBeVisible()
  })

  test('displays tags', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    await expect(page.getByText('frontend')).toBeVisible()
    await expect(page.getByText('auth')).toBeVisible()
  })

  test('displays relations', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    await expect(page.getByText('Is blocked by')).toBeVisible()
    await expect(page.getByText('Setup OAuth')).toBeVisible()
    await expect(page.getByText('TSK-002')).toBeVisible()
  })

  test('navigates to related task on click', async ({ page }) => {
    await page.route('**/api/project-management/tasks/t2', (route) =>
      route.fulfill({ json: { ...TASK, id: 't2', name: 'Setup OAuth', number: 'TSK-002', relations: [] } })
    )
    await page.goto('/projects/tasks/t1')
    await page.getByText('TSK-002').click()
    await expect(page).toHaveURL(/\/projects\/tasks\/t2/)
  })

  test('back button navigates back', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    await page.getByRole('button', { name: /← Back/i }).click()
    // go(-1) takes us back, URL depends on history — just verify we left the page
    await expect(page).not.toHaveURL(/\/projects\/tasks\/t1/)
  })

  test('adds a tag', async ({ page }) => {
    let updated = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PUT') {
        updated = true
        route.fulfill({ json: { ...TASK, tags: 'frontend,auth,backend' } })
      } else {
        route.fulfill({ json: updated ? { ...TASK, tags: 'frontend,auth,backend' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByPlaceholder('Add tag…').fill('backend')
    await page.getByPlaceholder('Add tag…').press('Enter')
    await expect(page.getByText('backend')).toBeVisible()
  })

  test('removes a relation', async ({ page }) => {
    await page.route('**/api/project-management/tasks/t1/relations/r1', (route) =>
      route.fulfill({ status: 204, body: '' })
    )
    let deleteCalled = false
    await page.route('**/api/project-management/tasks/t1/relations/r1', (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true
        route.fulfill({ status: 204, body: '' })
      }
    })
    // Reload returns task without the relation
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: deleteCalled ? { ...TASK, relations: [] } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByText('Is blocked by').click()  // expand group
    // click the × remove button for the relation row
    await page.locator('.relRow').first().getByRole('button').click()
  })
})
