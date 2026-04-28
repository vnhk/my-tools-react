import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { TextField } from '../../components/fields/TextField'
import { Button } from '../../components/ui/Button'
import styles from './TvPairingPage.module.css'

export default function TvPairingPage() {
  const [pairCode, setPairCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const connect = async () => {
    const code = pairCode.trim()
    if (!code) return
    setBusy(true)
    setError('')
    try {
      await client.post('/tv/pair/assign', { pairCode: code })
      setDone(true)
    } catch {
      setError('Pairing failed — check the code and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/streaming" className={styles.backBtn}>←</Link>
        <h1>TV Pairing</h1>
      </div>

      <p className={styles.description}>
        Enter the pairing code displayed on your TV to connect it to your account.
        The TV will then be able to use your streaming library without a separate login.
      </p>

      {done ? (
        <div className={styles.success}>
          ✓ TV connected successfully! You can close this page.
        </div>
      ) : (
        <div className={styles.form}>
          <TextField
            label="Pairing Code"
            inputMode="numeric"
            placeholder="123456"
            maxLength={10}
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            error={error}
            autoFocus
          />
          <Button variant="primary" onClick={connect} disabled={busy || !pairCode.trim()}>
            {busy ? 'Connecting…' : 'Connect TV'}
          </Button>
        </div>
      )}
    </div>
  )
}
