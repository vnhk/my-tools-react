import { test as base, Page, APIRequestContext } from '@playwright/test'

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:9091'

export const TEST_USER = {
  username: 'testUser',
  password: 'testUser!2#4%6',
}

/**
 * Logs in via the real backend API and stores the JWT in localStorage so
 * the React app treats the browser session as authenticated.
 * Returns the raw JWT token.
 */
export async function loginViaApi(page: Page): Promise<string> {
  const response = await page.request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { username: TEST_USER.username, password: TEST_USER.password, otp: null },
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok()) {
    throw new Error(`Login failed: HTTP ${response.status()} — ${await response.text()}`)
  }

  const { token } = await response.json()

  // addInitScript runs before page scripts on every navigation, setting the token
  await page.addInitScript((jwt: string) => {
    localStorage.setItem('token', jwt)
  }, token)

  return token
}

/**
 * Makes an authenticated API request directly to the backend.
 * Useful for test setup/teardown without going through the UI.
 */
export async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  token: string,
  data?: unknown,
) {
  const url = `${BACKEND_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
  switch (method) {
    case 'GET':    return request.get(url, { headers })
    case 'POST':   return request.post(url, { headers, data })
    case 'PUT':    return request.put(url, { headers, data })
    case 'DELETE': return request.delete(url, { headers })
  }
}

export const test = base.extend<{ authedPage: Page; token: string }>({
  token: async ({ page }, use) => {
    const jwt = await loginViaApi(page)
    await use(jwt)
  },
  authedPage: async ({ page, token: _token }, use) => {
    await use(page)
  },
})

export { expect } from '@playwright/test'

/**
 * Authenticates the page via the real backend JWT login.
 * Call this in beforeEach instead of mocking auth headers.
 */
export async function setupAuth(page: Page): Promise<void> {
  await loginViaApi(page)
}

/**
 * Wraps an array into the Spring Page response shape used by all list endpoints.
 */
export function pageResponse<T>(items: T[]): {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
} {
  return { content: items, totalElements: items.length, totalPages: 1, number: 0, size: items.length }
}
