import {useState} from 'react'
import {Link} from 'react-router-dom'
import {REMOTE_LAST_ROOM_ID_KEY, type RemoteCommand, useRemoteControlSender} from '../../common/hooks/useRemoteControl'
import {TextField} from '../../components/fields/TextField'
import {Button} from '../../components/ui/Button'
import {StreamingRemoteTab} from './StreamingRemoteTab'
import {InvestTrackRemoteTab} from './InvestTrackRemoteTab'
import {FilesRemoteTab} from './FilesRemoteTab'
import styles from './RemoteControlPage.module.css'

type App = 'streaming' | 'invest-track' | 'files'

const APP_HOME: Record<App, string> = {
    streaming: '/streaming',
    'invest-track': '/invest-track/dashboard',
    files: '/files/tv-view',
}

export default function RemoteControlPage() {
    const [roomIdInput, setRoomIdInput] = useState('')
    const [connectedRoomId, setConnectedRoomId] = useState<string | null>(
        () => localStorage.getItem(REMOTE_LAST_ROOM_ID_KEY)
    )
    const [investMonths, setInvestMonths] = useState<{ key: string; label: string }[]>([])
    const [investExpandedKeys, setInvestExpandedKeys] = useState<string[]>([])

    const {connected, send, status} = useRemoteControlSender(connectedRoomId, (cmd: RemoteCommand) => {
        if (cmd.action === 'INVEST_MONTHS') {
            setInvestMonths(cmd.months ?? [])
            setInvestExpandedKeys(cmd.expandedKeys ?? [])
        }
    })
    const [activeApp, setActiveApp] = useState<App>('streaming')

    const connect = () => {
        const id = roomIdInput.trim()
        if (id) {
            localStorage.setItem(REMOTE_LAST_ROOM_ID_KEY, id)
            setConnectedRoomId(id)
        }
    }

    const disconnect = () => {
        localStorage.removeItem(REMOTE_LAST_ROOM_ID_KEY)
        setConnectedRoomId(null)
    }

    const switchApp = (app: App) => {
        setActiveApp(app)
        // The TV follows the remote's active app so switching tabs here is
        // enough to drive it there too — no need to touch the TV itself.
        if (connected) send('NAVIGATE', {url: APP_HOME[app]})
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <Link to="/home" className={styles.backBtn}>
                    ←
                </Link>

                <h1>Remote Control</h1>

                <div
                    className={`${styles.connDot} ${
                        connected ? styles.on : styles.off
                    }`}
                />
            </div>

            {!connectedRoomId ? (
                <div className={styles.connectSection}>
                    <p>
                        Enter the Room ID shown on the TV screen (📱 badge in the top
                        right):
                    </p>

                    <TextField
                        inputMode="numeric"
                        placeholder="12345"
                        maxLength={5}
                        value={roomIdInput}
                        onChange={(e) =>
                            setRoomIdInput(e.target.value.replace(/\D/g, ''))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && connect()}
                        autoFocus
                        className={styles.roomInput}
                    />

                    <Button variant="primary" onClick={connect}>
                        Connect
                    </Button>
                </div>
            ) : (
                <>
                    <div className={styles.status}>
                        <span>
                            Room: <strong>{connectedRoomId}</strong>
                        </span>

                        <span
                            className={`${styles.statusDot} ${
                                connected ? styles.green : styles.red
                            }`}
                        >
                            {connected ? '● Connected' : '● Disconnected'}
                        </span>

                        <Button variant="ghost" onClick={disconnect}>
                            Disconnect
                        </Button>
                    </div>

                    <div className={styles.tabBar}>
                        <button
                            className={activeApp === 'streaming' ? styles.tabBtnActive : styles.tabBtn}
                            onClick={() => switchApp('streaming')}
                        >
                            🎬 Streaming
                        </button>
                        <button
                            className={activeApp === 'invest-track' ? styles.tabBtnActive : styles.tabBtn}
                            onClick={() => switchApp('invest-track')}
                        >
                            📈 Invest
                        </button>
                        <button
                            className={activeApp === 'files' ? styles.tabBtnActive : styles.tabBtn}
                            onClick={() => switchApp('files')}
                        >
                            🗂 Files
                        </button>
                    </div>

                    {activeApp === 'streaming' && (
                        <StreamingRemoteTab connected={connected} send={send} status={status}/>
                    )}
                    {activeApp === 'invest-track' && (
                        <InvestTrackRemoteTab
                            connected={connected}
                            send={send}
                            months={investMonths}
                            expandedKeys={investExpandedKeys}
                        />
                    )}
                    {activeApp === 'files' && (
                        <FilesRemoteTab connected={connected} send={send}/>
                    )}
                </>
            )}
        </div>
    )
}
