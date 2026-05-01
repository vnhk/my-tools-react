import { test as base, Page } from '@playwright/test'

export const MOCK_USER = { id: '1', username: 'testuser', role: 'USER' }

const col = (field: string, displayName: string, extras: object = {}) => ({
  field, displayName, internalName: field,
  inSaveForm: false, inEditForm: false, inTable: false,
  required: false, min: 0, max: 0, wysiwyg: false, sortable: true,
  filterable: false, fetchable: false, strValues: null,
  dynamicStrValues: false, dynamicStrValuesList: null,
  ...extras,
})

export const MOCK_CONFIG = {
  Project: {
    name:        col('name', 'Name', { inSaveForm: true, inEditForm: true, inTable: true, required: true }),
    number:      col('number', 'Number', { inSaveForm: true, inEditForm: false, inTable: true, required: true }),
    status:      col('status', 'Status', { inSaveForm: true, inEditForm: true, inTable: true, required: true, strValues: ['Open', 'In Progress', 'Done', 'Canceled'] }),
    priority:    col('priority', 'Priority', { inSaveForm: true, inEditForm: true, inTable: true, required: true, strValues: ['Low', 'Medium', 'High', 'Critical'] }),
    description: col('description', 'Description', { inSaveForm: true, inEditForm: true, inTable: true, wysiwyg: true }),
  },
  Task: {
    name:                 col('name', 'Name', { inSaveForm: true, inEditForm: true, inTable: true, required: true }),
    number:               col('number', 'Number', { inSaveForm: false, inEditForm: false, inTable: true, required: true }),
    status:               col('status', 'Status', { inSaveForm: true, inEditForm: true, inTable: true, required: true, strValues: ['Open', 'In Progress', 'Done', 'Canceled'] }),
    type:                 col('type', 'Type', { inSaveForm: true, inEditForm: true, inTable: true, required: true, strValues: ['Task', 'Bug', 'Story', 'Objective', 'Feature'] }),
    priority:             col('priority', 'Priority', { inSaveForm: true, inEditForm: true, inTable: true, required: true, strValues: ['Low', 'Medium', 'High', 'Critical'] }),
    description:          col('description', 'Description', { inSaveForm: true, inEditForm: true, inTable: true, wysiwyg: true }),
    dueDate:              col('dueDate', 'Due Date', { inSaveForm: true, inEditForm: true, inTable: true }),
    assignee:             col('assignee', 'Assignee', { inSaveForm: true, inEditForm: true, inTable: true }),
    estimatedHours:       col('estimatedHours', 'Est. Hours', { inSaveForm: true, inEditForm: true, inTable: true }),
    completionPercentage: col('completionPercentage', 'Progress', { inSaveForm: false, inEditForm: true, inTable: true }),
    tags:                 col('tags', 'Tags', { inSaveForm: true, inEditForm: true, inTable: false }),
  },
  Pocket: {
    name: {
      field: 'name', displayName: 'Name', internalName: 'name',
      inSaveForm: true, inEditForm: true, inTable: true,
      required: true, min: 1, max: 100, wysiwyg: false, sortable: true,
      filterable: true, fetchable: false, strValues: null,
      dynamicStrValues: false, dynamicStrValuesList: null,
    },
  },
  PocketItem: {
    summary: {
      field: 'summary', displayName: 'Summary', internalName: 'summary',
      inSaveForm: true, inEditForm: true, inTable: true,
      required: true, min: 1, max: 200, wysiwyg: false, sortable: true,
      filterable: false, fetchable: false, strValues: null,
      dynamicStrValues: false, dynamicStrValuesList: null,
    },
    content: {
      field: 'content', displayName: 'Content', internalName: 'content',
      inSaveForm: true, inEditForm: true, inTable: true,
      required: false, min: 0, max: 0, wysiwyg: true, sortable: false,
      filterable: false, fetchable: false, strValues: null,
      dynamicStrValues: false, dynamicStrValuesList: null,
    },
  },
}

export function pageResponse<T>(content: T[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 20 }
}

export async function setupAuth(page: Page) {
  await page.addInitScript(() => localStorage.setItem('token', 'test-token'))
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: MOCK_USER }))
  await page.route('**/api/config', (route) => route.fulfill({ json: MOCK_CONFIG }))
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await setupAuth(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
