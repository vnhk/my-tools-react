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
    // exact: true avoids matching the breadcrumb div which also contains 'TSK-001'
    await expect(page.getByText('TSK-001', { exact: true })).toBeVisible()
    await expect(page.getByText('Fix login bug')).toBeVisible()
    // exact: true avoids matching the breadcrumb div ('Alpha (PRJ-001) / TSK-001')
    await expect(page.getByText('Alpha (PRJ-001)', { exact: true })).toBeVisible()
  })

  test('displays progress bar', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    // Progress value is shown as a number; no '%' suffix in the InlineEditableField display
    await expect(page.getByText('25', { exact: true })).toBeVisible()
  })

  test('displays tags', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    await expect(page.getByText('frontend')).toBeVisible()
    // 'auth' also appears inside 'Setup OAuth'; .first() picks the tag which comes first in DOM
    await expect(page.getByText('auth').first()).toBeVisible()
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

  test('edits description', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, description: 'New description' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, description: 'New description' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.locator('textarea').fill('New description')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('New description')).toBeVisible()
  })

  test('edits status via inline field', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, status: 'Done' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, status: 'Done' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    // Status inline field shows "Open" — first occurrence on the page
    await page.getByText('Open').first().click()
    await page.getByRole('option', { name: 'Done' }).click()

    await expect(page.getByText('Done')).toBeVisible()
  })

  test('edits assignee via inline field', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, assignee: 'Bob' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, assignee: 'Bob' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByText('Alice').click()
    // Input auto-focuses after click
    await page.locator('input:focus').fill('Bob')
    await page.locator('input:focus').press('Enter')

    await expect(page.getByText('Bob')).toBeVisible()
  })

  test('edits completion percentage', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, completionPercentage: 75 } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, completionPercentage: 75 } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    // Progress field shows '25'; exact: true avoids matching parent containers or other elements
    await page.getByText('25', { exact: true }).click()
    await page.locator('input[type="number"]').fill('75')
    await page.locator('input[type="number"]').press('Enter')

    // Value shows as number without '%'
    await expect(page.getByText('75', { exact: true })).toBeVisible()
  })

  test('adds a tag', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, tags: 'frontend,auth,backend' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, tags: 'frontend,auth,backend' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByPlaceholder('Add tag…').fill('backend')
    await page.getByPlaceholder('Add tag…').press('Enter')
    await expect(page.getByText('backend')).toBeVisible()
  })

  test('removes a tag', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, tags: 'auth' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, tags: 'auth' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    // frontend is the first tag — its × is the first × button on the page
    await page.getByRole('button', { name: '×' }).first().click()

    await expect(page.getByText('frontend')).not.toBeVisible()
    // 'auth' also appears in 'Setup OAuth'; .first() picks the remaining tag
    await expect(page.getByText('auth').first()).toBeVisible()
  })

  test('removes a relation', async ({ page }) => {
    let deleted = false
    await page.route('**/api/project-management/tasks/t1/relations/r1', (route) => {
      deleted = true
      route.fulfill({ status: 204, body: '' })
    })
    await page.route('**/api/project-management/tasks/t1', (route) => {
      route.fulfill({ json: deleted ? { ...TASK, relations: [] } : TASK })
    })

    await page.goto('/projects/tasks/t1')
    // Relation group is expanded by default; click × inside the relation row
    await page.getByText('Setup OAuth').locator('..').getByRole('button').click()

    await expect(page.getByText('Setup OAuth')).not.toBeVisible()
  })

  test('edits priority via inline field', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, priority: 'Critical' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, priority: 'Critical' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByText('High').first().click()
    await page.getByRole('option', { name: 'Critical' }).click()

    await expect(page.getByText('Critical')).toBeVisible()
  })

  test('edits type via inline field', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, type: 'Story' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, type: 'Story' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    // exact: true avoids case-insensitive match on task name 'Fix login bug'
    await page.getByText('Bug', { exact: true }).click()
    await page.getByRole('option', { name: 'Story' }).click()

    await expect(page.getByText('Story')).toBeVisible()
  })

  test('edits due date via inline field', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, dueDate: '2024-03-15T00:00' } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, dueDate: '2024-03-15T00:00' } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByText('2024-02-01').click()
    await page.locator('input[type="datetime-local"]').fill('2024-03-15T00:00')
    await page.locator('input[type="datetime-local"]').press('Enter')

    await expect(page.getByText('2024-03-15')).toBeVisible()
  })

  test('edits estimated hours via inline field', async ({ page }) => {
    let patched = false
    await page.route('**/api/project-management/tasks/t1', (route) => {
      if (route.request().method() === 'PATCH') {
        patched = true
        route.fulfill({ json: { ...TASK, estimatedHours: 8 } })
      } else {
        route.fulfill({ json: patched ? { ...TASK, estimatedHours: 8 } : TASK })
      }
    })

    await page.goto('/projects/tasks/t1')
    // exact: true avoids matching '4' inside the due date '2024-02-01'
    await page.getByText('4', { exact: true }).click()
    await page.locator('input[type="number"]').fill('8')
    await page.locator('input[type="number"]').press('Enter')

    await expect(page.getByText('8')).toBeVisible()
  })

  test('cancels description edit', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.locator('textarea')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('textarea')).not.toBeVisible()
    await expect(page.getByText('Steps to reproduce...')).toBeVisible()
  })

  test('collapses and expands relation group', async ({ page }) => {
    await page.goto('/projects/tasks/t1')
    // relation row is visible initially (expanded)
    await expect(page.getByText('Setup OAuth')).toBeVisible()
    // click the group header to collapse
    await page.getByText('Is blocked by').click()
    await expect(page.getByText('Setup OAuth')).not.toBeVisible()
    // click again to expand
    await page.getByText('Is blocked by').click()
    await expect(page.getByText('Setup OAuth')).toBeVisible()
  })

  test('navigates to project via breadcrumb', async ({ page }) => {
    await page.route('**/api/project-management/projects/p1', (route) =>
      route.fulfill({ json: { id: 'p1', name: 'Alpha', number: 'PRJ-001', status: 'Open', priority: 'High', description: null, modificationDate: null } })
    )
    await page.route('**/api/project-management/projects/p1/stats', (route) =>
      route.fulfill({ json: { total: 0, open: 0, inProgress: 0, done: 0, overdue: 0 } })
    )
    // Regex matches /tasks with optional query string but NOT /tasks/t1, so the beforeEach
    // route for /tasks/t1 still handles the task detail fetch without being shadowed
    await page.route(/\/api\/project-management\/tasks(\?.*)?$/, (route) =>
      route.fulfill({ json: { content: [], totalElements: 0, totalPages: 1, number: 0, size: 20 } })
    )

    await page.goto('/projects/tasks/t1')
    // exact: true avoids matching the breadcrumb div that contains 'Alpha (PRJ-001) / TSK-001'
    await page.getByText('Alpha (PRJ-001)', { exact: true }).click()
    await expect(page).toHaveURL(/\/projects\/p1/)
  })

  test('shows empty description placeholder', async ({ page }) => {
    await page.route('**/api/project-management/tasks/t1', (route) =>
      route.fulfill({ json: { ...TASK, description: null } })
    )

    await page.goto('/projects/tasks/t1')
    await expect(page.getByText(/No description/i)).toBeVisible()
  })

  test('shows empty relations placeholder', async ({ page }) => {
    await page.route('**/api/project-management/tasks/t1', (route) =>
      route.fulfill({ json: { ...TASK, relations: [] } })
    )

    await page.goto('/projects/tasks/t1')
    await expect(page.getByText(/No relations yet/i)).toBeVisible()
  })

  test('adds two relations, reload shows both, navigate to related task shows back-relation', async ({ page }) => {
    const t3 = { id: 't3', number: 'TSK-003', name: 'Login flow', status: 'Open', type: 'Task' }
    const t4 = { id: 't4', number: 'TSK-004', name: 'Refactor auth', status: 'Open', type: 'Task' }

    const rel2 = {
      id: 'r2', direction: 'PARENT', type: 'CHILD_IS_PART_OF', displayName: 'Parent of',
      relatedTaskId: 't3', relatedTaskNumber: 'TSK-003', relatedTaskName: 'Login flow',
      relatedTaskStatus: 'Open', relatedTaskType: 'Task',
    }
    const rel3 = {
      id: 'r3', direction: 'PARENT', type: 'CHILD_IS_PART_OF', displayName: 'Parent of',
      relatedTaskId: 't4', relatedTaskNumber: 'TSK-004', relatedTaskName: 'Refactor auth',
      relatedTaskStatus: 'Open', relatedTaskType: 'Task',
    }

    // Mutable — starts with existing relation, gains rel2 and rel3 as they are added
    const relations = [...TASK.relations]

    // Overrides beforeEach route: returns current mutable relations on each GET
    await page.route('**/api/project-management/tasks/t1', (route) => {
      route.fulfill({ json: { ...TASK, relations } })
    })

    await page.route('**/api/project-management/tasks/search**', (route) => {
      const url = new URL(route.request().url())
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      if (q.includes('login')) route.fulfill({ json: [t3] })
      else if (q.includes('refactor')) route.fulfill({ json: [t4] })
      else route.fulfill({ json: [] })
    })

    await page.route('**/api/project-management/tasks/t1/relations', (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}')
      if (body.childTaskId === 't3') { relations.push(rel2); route.fulfill({ json: rel2 }) }
      else if (body.childTaskId === 't4') { relations.push(rel3); route.fulfill({ json: rel3 }) }
      else route.fulfill({ status: 400, body: '' })
    })

    // t3 detail — has a back-relation pointing to t1
    const backRel = {
      id: 'r2-rev', direction: 'CHILD', type: 'CHILD_IS_PART_OF', displayName: 'Is part of',
      relatedTaskId: 't1', relatedTaskNumber: 'TSK-001', relatedTaskName: 'Fix login bug',
      relatedTaskStatus: 'Open', relatedTaskType: 'Bug',
    }
    await page.route('**/api/project-management/tasks/t3', (route) =>
      route.fulfill({ json: { ...TASK, id: 't3', name: 'Login flow', number: 'TSK-003', type: 'Task', relations: [backRel] } })
    )

    await page.goto('/projects/tasks/t1')

    // Add first relation
    await page.getByPlaceholder('Search task to link…').fill('Login')
    await page.waitForSelector('text=TSK-003 — Login flow')
    await page.locator('text=TSK-003 — Login flow').click()
    await expect(page.getByText('Login flow')).toBeVisible()

    // Add second relation
    await page.getByPlaceholder('Search task to link…').fill('Refactor')
    await page.waitForSelector('text=TSK-004 — Refactor auth')
    await page.locator('text=TSK-004 — Refactor auth').click()
    await expect(page.getByText('Refactor auth')).toBeVisible()

    // Reload — both relations must persist
    await page.reload()
    await expect(page.getByText('Login flow')).toBeVisible()
    await expect(page.getByText('Refactor auth')).toBeVisible()

    // Navigate to t3 and verify the back-relation to t1 is shown
    await page.getByText('Login flow').click()
    await expect(page).toHaveURL(/\/projects\/tasks\/t3/)
    await expect(page.getByText('TSK-001', { exact: true })).toBeVisible()
    await expect(page.getByText('Fix login bug')).toBeVisible()
  })

  test('searches and adds a relation', async ({ page }) => {
    const searchResult = { id: 't3', number: 'TSK-003', name: 'Login flow', status: 'Open', type: 'Task' }
    const newRelation = {
      id: 'r2', direction: 'PARENT' as const, type: 'CHILD_IS_PART_OF', displayName: 'Parent of',
      relatedTaskId: 't3', relatedTaskNumber: 'TSK-003', relatedTaskName: 'Login flow',
      relatedTaskStatus: 'Open', relatedTaskType: 'Task',
    }
    let linked = false

    await page.route('**/api/project-management/tasks/search**', (route) =>
      route.fulfill({ json: [searchResult] })
    )
    await page.route('**/api/project-management/tasks/t1', (route) => {
      route.fulfill({ json: linked ? { ...TASK, relations: [...TASK.relations, newRelation] } : TASK })
    })
    await page.route('**/api/project-management/tasks/t1/relations**', (route) => {
      if (route.request().method() === 'POST') {
        linked = true
        route.fulfill({ json: newRelation })
      }
    })

    await page.goto('/projects/tasks/t1')
    await page.getByPlaceholder('Search task to link…').fill('Login')
    await page.waitForSelector('text=TSK-003 — Login flow')
    await page.locator('text=TSK-003 — Login flow').click()

    await expect(page.getByText('Login flow')).toBeVisible()
  })
})
