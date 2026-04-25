import client from './client'

export interface LoginResponse {
  token: string
  username: string
  role: string
}

export interface MeResponse {
  id: string
  username: string
  role: string
}

export const login = (username: string, password: string) =>
  client.post<LoginResponse>('/auth/login', { username, password })

export const loginWithOtp = (otp: string) =>
  client.post<LoginResponse>('/auth/login', { otp })

export const logout = () =>
  client.post('/auth/logout')

export const me = () =>
  client.get<MeResponse>('/auth/me')
