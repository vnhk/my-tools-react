import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  paramsSerializer: (params: Record<string, unknown>) => {
    const sp = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null && v !== '') sp.append(key, String(v))
        }
      } else if (value !== undefined && value !== null && value !== '') {
        sp.append(key, String(value))
      }
    }
    return sp.toString()
  },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // A stale/expired token sitting in localStorage makes AuthProvider's
      // initial me() call 401 on every load — including on /login-tv itself,
      // since AuthProvider wraps the whole app. Redirect to whichever login
      // screen this device actually uses, and never bounce away from a login
      // screen we're already on (that would kill an in-progress QR flow).
      const isTv = localStorage.getItem('isTv') === 'true'
      const loginPath = isTv ? '/login-tv' : '/login'
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath
      }
    }
    return Promise.reject(error)
  }
)

export default client
