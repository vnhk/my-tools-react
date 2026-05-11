import { useState } from 'react'
import { generateOtp } from '../api/auth'
import { Button } from '../components/ui/Button'
import { useNotification } from '../components/ui/Notification'
import styles from './otp.module.css'

export function OtpGeneratePage() {
  const { showError } = useNotification()
  const [otpCode, setOtpCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setOtpCode(null)
    setLoading(true)
    try {
      const res = await generateOtp('ROLE_STREAMING')
      setOtpCode(res.data.otp)
    } catch (err: any) {
      showError(err?.response?.data?.error ?? 'Could not generate OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>OTP Generator</h1>
      <div className={styles.card}>
        <p className={styles.hint}>
          Generate a one-time password for streaming access. The code is valid for 5 minutes.
        </p>
        <Button variant="primary" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate OTP'}
        </Button>
        {otpCode && (
          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>Your OTP code:</span>
            <span className={styles.code}>{otpCode}</span>
            <span className={styles.codeNote}>Valid for 5 minutes · Use it to log in as Streaming user</span>
          </div>
        )}
      </div>
    </div>
  )
}
