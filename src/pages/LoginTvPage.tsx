import {useEffect, useRef, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {qrGenerate, QrGenerateResponse, qrPoll} from '../api/auth'
import {useAuth} from '../auth/AuthContext'
import {Button} from '../components/ui/Button'
import {getOrCreateRoomId} from '../common/hooks/useRemoteControl'
import {setIsTv} from '../common/hooks/useIsTv'
import styles from './login.module.css'

type Mode = 'qr'

export function LoginTvPage() {
    const {setUser} = useAuth()
    const navigate = useNavigate()

    const [mode, setMode] = useState<Mode>('qr')

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
            const isTv = localStorage.getItem('isTv') === 'true'
            const res = await qrGenerate(isTv ? getOrCreateRoomId() : undefined)
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
                        setUser({id: '', username: poll.data.username!, role: poll.data.role!})
                        navigate('/streaming', {replace: true})
                    }
                } catch {
                    // network blip — keep polling
                }
            }, 2000)
        } catch {
            console.log('Could not generate QR code')
        } finally {
            setQrLoading(false)
        }
    }

    useEffect(() => {
        setIsTv(true)

        if (mode === 'qr') startQr()
        else stopPolling()
        return stopPolling
    }, [mode])

    return (
        <div className={`${styles.page} ${styles.tvPage}`}>
            <div className={styles.card}>
                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.subtitle}>Sign in to My Tools</p>

                <div className={styles.tabs}>
                    {(['qr'] as Mode[]).map(m => (
                        <button
                            key={m}
                            type="button"
                            className={`${styles.tab} ${mode === m ? styles.tabActive : ''}`}
                            onClick={() => {
                                setMode(m)
                            }}
                        >
                            {'QR Code'}
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
                                    <span className={styles.qrStatusDot}/>
                                    Waiting for confirmation…
                                </div>
                                <Button variant="ghost" size="sm" onClick={startQr}>Regenerate</Button>
                            </>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
