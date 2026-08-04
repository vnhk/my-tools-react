import {FormEvent, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {qrConfirm} from '../api/auth'
import {Button} from '../components/ui/Button'
import {useNotification} from '../components/ui/Notification'
import {REMOTE_LAST_ROOM_ID_KEY} from '../common/hooks/useRemoteControl'
import styles from './login.module.css'

export function AcceptLoginPage() {
    const {uuid} = useParams<{ uuid: string }>()
    const navigate = useNavigate()
    const {showNotification} = useNotification()

    const [number, setNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState('')
    const [pairedForRemote, setPairedForRemote] = useState(false)

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        if (!uuid) return
        setError('')
        setLoading(true)
        try {
            const res = await qrConfirm(parseInt(uuid), parseInt(number))
            setDone(true)

            const roomId = res.data?.roomId
            if (roomId) {
                // The QR was shown by a TV — auto-pair this phone's remote
                // control to it instead of just confirming the login.
                localStorage.setItem(REMOTE_LAST_ROOM_ID_KEY, roomId)
                setPairedForRemote(true)
                showNotification('TV login confirmed! Opening remote…', 'success')
                setTimeout(() => navigate('/remote'), 1200)
            } else {
                showNotification('Login confirmed! You can close this page.', 'success')
                setTimeout(() => navigate('/'), 2000)
            }
        } catch (err: any) {
            const status = err?.response?.status
            if (status === 410) {
                setError('This QR code has expired or was already used.')
            } else if (status === 403) {
                setError('Wrong number. Please try again.')
                setNumber('')
            } else {
                setError('Something went wrong.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                {done ? (
                    <div className={styles.qrSection}>
                        <div style={{fontSize: '3rem'}}>✅</div>
                        <h1 className={styles.title}>Login confirmed!</h1>
                        <p className={styles.qrHint}>
                            {pairedForRemote
                                ? 'The TV is now logged in. Opening the remote control…'
                                : 'You can close this page. The other device is now logged in.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <h1 className={styles.title}>Confirm Login</h1>
                        <p className={styles.subtitle}>Enter the number shown on the QR code screen</p>
                        <form onSubmit={submit} className={styles.form}>
                            <div className={styles.field}>
                                <label className={styles.label}>Number (01–99)</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min={1}
                                    max={99}
                                    placeholder="e.g. 42"
                                    value={number}
                                    onChange={e => setNumber(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <div className={styles.error}>{error}</div>}
                            <Button
                                type="submit"
                                variant="primary"
                                className={styles.submitBtn}
                                disabled={loading}
                            >
                                {loading ? 'Confirming…' : 'Confirm Login'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className={styles.submitBtn}
                                onClick={() => navigate('/')}
                            >
                                Cancel
                            </Button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
