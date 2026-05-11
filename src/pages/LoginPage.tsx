import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, loginWithOtp, qrGenerate, qrPoll, QrGenerateResponse } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import styles from './login.module.css'

type Mode = 'password' | 'otp' | 'qr'

export function LoginPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [qrData, setQrData] = useState<QrGenerateResponse | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrExpired, setQrExpired] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startQr = async () => {
    stopPolling()
    setQrExpired(false)
    setQrData(null)
    setQrLoading(true)
    try {
      const res = await qrGenerate()
      setQrData(res.data)
      const startedAt = Date.now()

      pollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > 295_000) {
          stopPolling()
          setQrExpired(true)
          return
        }
        try {
          const poll = await qrPoll(res.data.pollToken)
          if (poll.status === 410) {
            stopPolling()
            setQrExpired(true)
            return
          }
          if (poll.data.done && poll.data.token) {
            stopPolling()
            localStorage.setItem('token', poll.data.token)
            setUser({ id: '', username: poll.data.username!, role: poll.data.role! })
            navigate('/', { replace: true })
          }
        } catch {
          // network blip — keep polling
        }
      }, 2000)
    } catch {
      setError('Could not generate QR code')
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'qr') startQr()
    else stopPolling()
    return stopPolling
  }, [mode])

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
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to My Tools</p>

        <div className={styles.tabs}>
          {(['password', 'otp', 'qr'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              className={`${styles.tab} ${mode === m ? styles.tabActive : ''}`}
              onClick={() => { setError(''); setMode(m) }}
            >
              {m === 'password' ? 'Password' : m === 'otp' ? 'OTP' : 'QR Code'}
            </button>
          ))}
        </div>

        {mode === 'qr' ? (
          <div className={styles.qrSection}>
            {qrLoading && <p className={styles.qrHint}>Generating QR code…</p>}
            {qrExpired && (
              <>
                <p className={`${styles.qrHint} ${styles.qrExpired}`}>QR code expired.</p>
                <Button variant="primary" onClick={startQr}>Generate New</Button>
              </>
            )}
            {qrData && !qrExpired && (
              <>
                <img
                  className={styles.qrImage}
                  src={`data:image/png;base64,${qrData.qrImage}`}
                  alt="QR code"
                />
                <div className={styles.qrNumber}>{String(qrData.number).padStart(2, '0')}</div>
                <p className={styles.qrHint}>
                  Scan with your phone, then enter the number shown above.
                </p>
                <div className={styles.qrStatus}>
                  <span className={styles.qrStatusDot} />
                  Waiting for confirmation…
                </div>
                <Button variant="ghost" size="sm" onClick={startQr}>Regenerate</Button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className={styles.form}>
            {mode === 'password' ? (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>Username</label>
                  <input
                    className={styles.input}
                    placeholder="Enter username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Password</label>
                  <input
                    className={styles.input}
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </>
            ) : (
              <div className={styles.field}>
                <label className={styles.label}>OTP Code</label>
                <input
                  className={styles.input}
                  placeholder="Enter OTP code"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  autoComplete="one-time-code"
                  required
                />
              </div>
            )}
            {error && <div className={styles.error}>{error}</div>}
            <Button
              type="submit"
              variant="primary"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
