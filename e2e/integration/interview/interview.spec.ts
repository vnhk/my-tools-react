import { test, expect, loginViaApi, apiRequest, BACKEND_URL } from '../fixtures'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function deleteByName(
  request: Parameters<typeof apiRequest>[0],
  path: string,
  token: string,
  name: string,
) {
  const res = await apiRequest(request, 'GET', `${path}?page=0&size=200`, token)
  if (!res.ok()) return
  const body = await res.json()
  const items: Array<{ id: string; name: string }> = body.content ?? body
  for (const item of items) {
    if (item.name === name) {
      await apiRequest(request, 'DELETE', `${path}/${item.id}`, token)
    }
  }
}

// ── Questions CRUD ────────────────────────────────────────────────────────────

test.describe('Interview — Questions', () => {
  let token = ''

  test.beforeEach(async ({ page }) => {
    token = await loginViaApi(page)
  })

  test('create question, verify in table, delete', async ({ page, request }) => {
    await deleteByName(request, '/api/interview/questions', token, 'E2EQuestion Basic Java')

    await page.goto('/interview/questions')
    await expect(page.getByRole('heading', { name: 'Interview Questions' })).toBeVisible()

    // ── Create question ──
    await page.getByRole('button', { name: /New Question/i }).click()
    await page.getByLabel('Name').fill('E2EQuestion Basic Java')
    await page.getByLabel('Tags (comma-separated)').fill('java')
    await page.getByLabel('Difficulty').click()
    await page.getByRole('option', { name: '3' }).click()
    await page.getByLabel('Max Points').fill('10')
    await page.getByRole('button', { name: 'Save' }).click()

    // ── Verify in table ──
    await expect(page.getByRole('cell', { name: 'E2EQuestion Basic Java' })).toBeVisible()

    // ── Cleanup ──
    await page.getByRole('row', { name: /E2EQuestion Basic Java/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    const deletePromise = page.waitForResponse(
      r => r.url().includes('/interview/questions') && r.request().method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await deletePromise
    await expect(page.getByRole('cell', { name: 'E2EQuestion Basic Java' })).not.toBeVisible()
  })

  test('edit question name', async ({ page, request }) => {
    await deleteByName(request, '/api/interview/questions', token, 'E2EQuestion ToEdit')
    await deleteByName(request, '/api/interview/questions', token, 'E2EQuestion Edited')

    await page.goto('/interview/questions')

    // ── Create question ──
    await page.getByRole('button', { name: /New Question/i }).click()
    await page.getByLabel('Name').fill('E2EQuestion ToEdit')
    await page.getByLabel('Tags (comma-separated)').fill('java')
    await page.getByLabel('Difficulty').click()
    await page.getByRole('option', { name: '2' }).click()
    await page.getByLabel('Max Points').fill('5')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EQuestion ToEdit' })).toBeVisible()

    // ── Edit ──
    await page.getByRole('row', { name: /E2EQuestion ToEdit/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Name').fill('E2EQuestion Edited')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2EQuestion Edited' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2EQuestion ToEdit', exact: true })).not.toBeVisible()

    // ── Cleanup — reload first so selection state is clean ──
    await page.reload()
    await expect(page.getByRole('cell', { name: 'E2EQuestion Edited' })).toBeVisible()
    await page.getByRole('row', { name: /E2EQuestion Edited/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    const deletePromise = page.waitForResponse(
      r => r.url().includes('/interview/questions') && r.request().method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await deletePromise
    await expect(page.getByRole('cell', { name: 'E2EQuestion Edited' })).not.toBeVisible()
  })

  test('search filters question list', async ({ page, request }) => {
    await apiRequest(request, 'POST', '/api/interview/questions', token, {
      name: 'E2EQuestion SearchTarget', tags: 'python', difficulty: 1, maxPoints: 5,
    })
    await apiRequest(request, 'POST', '/api/interview/questions', token, {
      name: 'E2EQuestion OtherItem', tags: 'java', difficulty: 1, maxPoints: 5,
    })

    await page.goto('/interview/questions')
    // Wait for initial load to finish before searching (prevents stale-fetch race)
    await expect(page.getByRole('cell', { name: 'E2EQuestion OtherItem' })).toBeVisible()
    await page.getByPlaceholder(/search/i).fill('SearchTarget')
    await expect(page.getByRole('cell', { name: 'E2EQuestion SearchTarget' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2EQuestion OtherItem' })).not.toBeVisible()

    // ── Cleanup ──
    await deleteByName(request, '/api/interview/questions', token, 'E2EQuestion SearchTarget')
    await deleteByName(request, '/api/interview/questions', token, 'E2EQuestion OtherItem')
  })
})

// ── Coding Tasks CRUD ─────────────────────────────────────────────────────────

test.describe('Interview — Coding Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create coding task, verify in table, delete', async ({ page }) => {
    await page.goto('/interview/coding-tasks')
    await expect(page.getByRole('heading', { name: 'Coding Tasks' })).toBeVisible()

    // ── Create ──
    await page.getByRole('button', { name: /New Coding Task/i }).click()
    await page.getByLabel('Name').fill('E2ECodingTask FizzBuzz')
    await page.getByLabel('Initial Code').fill('def solution():\n    pass')
    await page.getByRole('button', { name: 'Save' }).click()

    // ── Verify ──
    await expect(page.getByRole('cell', { name: 'E2ECodingTask FizzBuzz' })).toBeVisible()

    // ── Delete ──
    await page.getByRole('row', { name: /E2ECodingTask FizzBuzz/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2ECodingTask FizzBuzz' })).not.toBeVisible()
  })

  test('edit coding task', async ({ page }) => {
    await page.goto('/interview/coding-tasks')

    // ── Create ──
    await page.getByRole('button', { name: /New Coding Task/i }).click()
    await page.getByLabel('Name').fill('E2ECodingTask EditMe')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2ECodingTask EditMe' })).toBeVisible()

    // ── Edit ──
    await page.getByRole('row', { name: /E2ECodingTask EditMe/ }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.getByLabel('Name').fill('E2ECodingTask Renamed')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'E2ECodingTask Renamed' })).toBeVisible()

    // ── Cleanup ──
    await page.reload()
    await expect(page.getByRole('cell', { name: 'E2ECodingTask Renamed' })).toBeVisible()
    await page.getByRole('row', { name: /E2ECodingTask Renamed/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2ECodingTask Renamed' })).not.toBeVisible()
  })
})

// ── Question Configs CRUD ─────────────────────────────────────────────────────

test.describe('Interview — Question Configs', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('create config with valid percentages, verify, delete', async ({ page }) => {
    await page.goto('/interview/configs')
    await expect(page.getByRole('heading', { name: 'Question Configs' })).toBeVisible()

    // ── Create ──
    await page.getByRole('button', { name: /New Config/i }).click()
    await page.getByLabel('Name').fill('E2EConfig JuniorJava')
    await page.getByLabel('Level 1 %').fill('20')
    await page.getByLabel('Level 2 %').fill('30')
    await page.getByLabel('Level 3 %').fill('25')
    await page.getByLabel('Level 4 %').fill('15')
    await page.getByLabel('Level 5 %').fill('10')
    await page.getByLabel('Coding Tasks Amount').fill('2')
    await page.getByRole('button', { name: 'Save' }).click()

    // ── Verify ──
    await expect(page.getByRole('cell', { name: 'E2EConfig JuniorJava' })).toBeVisible()

    // ── Delete ──
    await page.getByRole('row', { name: /E2EConfig JuniorJava/ }).getByRole('checkbox').check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByRole('cell', { name: 'E2EConfig JuniorJava' })).not.toBeVisible()
  })

  test('config with percentages not summing to 100 shows warning', async ({ page }) => {
    await page.goto('/interview/configs')

    await page.getByRole('button', { name: /New Config/i }).click()
    await page.getByLabel('Name').fill('E2EConfig InvalidSum')
    await page.getByLabel('Level 1 %').fill('10')
    // Levels 2-5 remain 0 → sum = 10
    await page.getByRole('button', { name: 'Save' }).click()

    // Warning notification should appear, dialog stays open
    await expect(page.getByText(/Percentages must sum to 100% \(currently/i)).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
  })
})

// ── Interview Plan ────────────────────────────────────────────────────────────

test.describe('Interview — Plan', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  test('save and reload interview plan template', async ({ page }) => {
    await page.goto('/interview/plan')
    await expect(page.getByRole('heading', { name: 'Interview Plan Template' })).toBeVisible()

    const editor = page.locator('textarea')
    await editor.fill('E2E Plan: Welcome {candidateName}! Questions: {questions}')
    await page.getByRole('button', { name: 'Save' }).click()

    // Notification confirms save
    await expect(page.getByText('Interview plan saved.')).toBeVisible()

    // Reload and verify content persists
    await page.reload()
    await expect(editor).not.toBeDisabled()
    await expect(editor).toHaveValue('E2E Plan: Welcome {candidateName}! Questions: {questions}')

    // ── Cleanup: clear the plan ──
    await editor.fill('')
    await page.getByRole('button', { name: 'Save' }).click()
  })
})

// ── Full Session Flow ─────────────────────────────────────────────────────────

test.describe('Interview — Session flow', () => {
  let token = ''

  test.beforeEach(async ({ page }) => {
    token = await loginViaApi(page)
  })

  test('create session via API, open session page, mark question, complete', async ({ page, request }) => {
    // ── Setup: create question + config via API ──
    const qRes = await apiRequest(request, 'POST', '/api/interview/questions', token, {
      name: 'E2ESession Question One',
      tags: 'java',
      difficulty: 2,
      maxPoints: 10,
    })
    const question = await qRes.json()

    const cfgRes = await apiRequest(request, 'POST', '/api/interview/question-configs', token, {
      name: 'E2ESession Config',
      difficulty1Percent: 0,
      difficulty2Percent: 100,
      difficulty3Percent: 0,
      difficulty4Percent: 0,
      difficulty5Percent: 0,
      codingTasksAmount: 0,
    })
    const config = await cfgRes.json()

    // ── Create session via API ──
    const sessRes = await apiRequest(request, 'POST', '/api/interview/sessions', token, {
      candidateName: 'E2ECandidate',
      configName: config.name,
      mainTags: 'java',
      secondaryTags: '',
      skillLevelConfig: 'java:MID:1',
      questionIds: [question.id],
      codingTaskIds: [],
    })
    const session = await sessRes.json()

    // ── Open session page ──
    await page.goto(`/interview/sessions/${session.id}`)
    await expect(page.getByRole('heading', { name: /E2ECandidate/ })).toBeVisible()
    await expect(page.getByText('E2ESession Question One')).toBeVisible()

    // ── Mark question as Correct ──
    await page.getByRole('button', { name: 'Correct' }).first().click()
    await expect(page.getByRole('button', { name: 'Correct' }).first()).toHaveClass(/active|selected|current/i)

    // ── Save session ──
    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(page.getByText('Session saved.')).toBeVisible()

    // ── Complete interview ──
    await page.getByRole('button', { name: /Complete Interview/i }).click()
    await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible()

    // ── Cleanup ──
    await apiRequest(request, 'DELETE', `/api/interview/sessions/${session.id}`, token)
    await apiRequest(request, 'DELETE', `/api/interview/questions/${question.id}`, token)
    await apiRequest(request, 'DELETE', `/api/interview/question-configs/${config.id}`, token)
  })

  test('sessions list shows created session', async ({ page, request }) => {
    // ── Setup ──
    const qRes = await apiRequest(request, 'POST', '/api/interview/questions', token, {
      name: 'E2ESessionList Question',
      tags: 'python',
      difficulty: 1,
      maxPoints: 5,
    })
    const question = await qRes.json()

    const sessRes = await apiRequest(request, 'POST', '/api/interview/sessions', token, {
      candidateName: 'E2EListCandidate',
      configName: 'E2EListConfig',
      mainTags: 'python',
      secondaryTags: '',
      skillLevelConfig: 'python:JUNIOR:1',
      questionIds: [question.id],
      codingTaskIds: [],
    })
    const session = await sessRes.json()

    // ── Check list page ──
    await page.goto('/interview/sessions')
    await expect(page.getByRole('heading', { name: 'Interview Sessions' })).toBeVisible()
    await expect(page.getByText('E2EListCandidate')).toBeVisible()

    // ── Cleanup ──
    await apiRequest(request, 'DELETE', `/api/interview/sessions/${session.id}`, token)
    await apiRequest(request, 'DELETE', `/api/interview/questions/${question.id}`, token)
  })
})
