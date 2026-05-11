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

export interface QrGenerateResponse {
  uuid: number
  number: number
  pollToken: string
  qrImage: string
}

export interface QrPollResponse {
  done: boolean
  token?: string
  username?: string
  role?: string
}

export const qrGenerate = () =>
  client.post<QrGenerateResponse>('/auth/qr/generate')

export const qrPoll = (pollToken: string) =>
  client.get<QrPollResponse>('/auth/qr/poll', { params: { pollToken } })

export const qrConfirm = (uuid: number, number: number) =>
  client.post('/auth/qr/confirm', null, { params: { uuid, number } })

export interface UserSettings {
  hasCipher: boolean
  role: string
}

export const getSettings = () =>
  client.get<UserSettings>('/auth/settings')

export const verifyCipher = (cipher: string) =>
  client.post<{ valid: boolean }>('/auth/settings/cipher/verify', { cipher })

export const saveCipher = (cipher: string) =>
  client.post('/auth/settings/cipher', { cipher })

export const generateOtp = (role = 'ROLE_STREAMING') =>
  client.post<{ otp: string; role: string }>('/auth/otp/generate', null, { params: { role } })
