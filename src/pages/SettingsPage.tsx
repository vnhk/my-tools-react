import { FormEvent, useEffect, useState } from 'react'
import { getSettings, verifyCipher, saveCipher, UserSettings } from '../api/auth'
import { Button } from '../components/ui/Button'
import { useNotification } from '../components/ui/Notification'
import { Dialog } from '../components/ui/Dialog'
import styles from './settings.module.css'

const THEMES = ['default', 'cyberpunk', 'bloodmoon', 'ocean', 'sunset', 'darkula', 'intellij', 'earth', 'frost', 'blossom']

export function SettingsPage() {
  const { showSuccess, showError } = useNotification()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [cipher, setCipher] = useState('')
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('theme') ?? 'default')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    getSettings().then(r => setSettings(r.data)).catch(() => {})
  }, [])

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await verifyCipher(cipher)
      if (res.data.valid) showSuccess('Cipher password is correct!')
      else showError('Cipher password is incorrect!')
    } catch {
      showError('Could not verify cipher.')
    }
  }

  const doSave = async () => {
    try {
      await saveCipher(cipher)
      setSettings(s => s ? { ...s, hasCipher: true } : s)
      showSuccess('Cipher password saved!')
      setCipher('')
    } catch (err: any) {
      showError(err?.response?.data?.error ?? 'Could not save cipher.')
    }
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    if (settings?.hasCipher) {
      setShowConfirm(true)
    } else {
      doSave()
    }
  }

  const applyTheme = (theme: string) => {
    setActiveTheme(theme)
    localStorage.setItem('theme', theme)
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  const isUser = settings?.role === 'ROLE_USER'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      {isUser && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data Cipher Password</h2>
          <p className={styles.sectionHint}>
            Used to encrypt sensitive pocket data.
            {settings?.hasCipher ? ' A cipher is currently set.' : ' No cipher is set yet.'}
          </p>
          <form className={styles.cipherForm} onSubmit={handleVerify}>
            <input
              className={styles.input}
              type="password"
              placeholder="Enter cipher password"
              value={cipher}
              onChange={e => setCipher(e.target.value)}
              minLength={5}
              required
            />
            <div className={styles.cipherActions}>
              <Button type="submit" variant="secondary">Check</Button>
              <Button type="button" variant="primary" onClick={handleSave}>Save</Button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Theme</h2>
        <div className={styles.themeGrid}>
          {THEMES.map(t => (
            <button
              key={t}
              className={`${styles.themeBtn} ${activeTheme === t ? styles.themeBtnActive : ''}`}
              onClick={() => applyTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Warning"
        footer={
          <>
            <Button variant="danger" onClick={() => { setShowConfirm(false); doSave() }}>
              I understand, save anyway
            </Button>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
          </>
        }
      >
        <p>
          Setting a new cipher may result in data loss. Data encrypted with the previous password
          will not be decryptable.
        </p>
      </Dialog>
    </div>
  )
}
