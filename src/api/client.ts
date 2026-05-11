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
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
