import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, loginWithOtp } from '../api/auth'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'otp'
        ? await loginWithOtp(otp)
        : await login(username, password)

      localStorage.setItem('token', res.data.token)
      setUser({ id: '', username: res.data.username, role: res.data.role })
      navigate('/', { replace: true })
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
        <h2>Sign in</h2>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setMode('password')}
            style={{ fontWeight: mode === 'password' ? 'bold' : 'normal' }}>
            Password
          </button>
          <button type="button" onClick={() => setMode('otp')}
            style={{ fontWeight: mode === 'otp' ? 'bold' : 'normal' }}>
            OTP
          </button>
        </div>

        {mode === 'password' ? (
          <>
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </>
        ) : (
          <input placeholder="OTP code" value={otp} onChange={e => setOtp(e.target.value)} required />
        )}

        {error && <span style={{ color: 'red' }}>{error}</span>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
