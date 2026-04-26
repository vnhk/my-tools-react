import { test as base, Page } from '@playwright/test'

export const MOCK_USER = { id: '1', username: 'testuser', role: 'USER' }

export const MOCK_CONFIG = {
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
