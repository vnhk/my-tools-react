import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRemoteControlSender } from './hooks/useRemoteControl'
import { TextField } from '../../components/fields/TextField'
import { Button } from '../../components/ui/Button'
import styles from './RemoteControlPage.module.css'

export default function RemoteControlPage() {
  const [roomIdInput, setRoomIdInput] = useState('')
  const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null)
  const { connected, send } = useRemoteControlSender(connectedRoomId)

  const connect = () => {
    const id = roomIdInput.trim()
    if (id) setConnectedRoomId(id)
  }

  const btn = (label: string, action: string, data?: Record<string, number | string>, large = false) => (
    <button
      className={large ? styles.remoteBtnLg : styles.remoteBtn}
      disabled={!connected}
      onClick={() => send(action, data)}
    >
      {label}
    </button>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/streaming" className={styles.backBtn}>←</Link>
        <h1>Remote Control</h1>
        <div className={`${styles.connDot} ${connected ? styles.on : styles.off}`} />
      </div>

      {!connectedRoomId ? (
        <div className={styles.connectSection}>
          <p>Enter the Room ID shown on the player screen (📱 badge in the top bar):</p>
          <TextField
            inputMode="numeric"
            placeholder="12345"
            maxLength={5}
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            autoFocus
            className={styles.roomInput}
          />
          <Button variant="primary" onClick={connect}>Connect</Button>
        </div>
      ) : (
        <>
          <div className={styles.status}>
            <span>Room: <strong>{connectedRoomId}</strong></span>
            <span className={`${styles.statusDot} ${connected ? styles.green : styles.red}`}>
              {connected ? '● Connected' : '● Disconnected'}
            </span>
            <Button variant="ghost" onClick={() => setConnectedRoomId(null)}>Disconnect</Button>
          </div>

          <div className={styles.controls}>
            <div className={styles.section}>
              <div className={styles.row}>
                {btn('⏮ Prev Ep', 'PREV_EPISODE')}
                {btn('Next Ep ⏭', 'NEXT_EPISODE')}
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.row}>
                {btn('⏪ −10s', 'SEEK', { relative: -10 })}
                {btn('⏯ Play/Pause', 'TOGGLE_PLAY', undefined, true)}
                {btn('+10s ⏩', 'SEEK', { relative: 10 })}
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.row}>
                {btn('🔉 Vol −', 'VOLUME', { relative: -0.1 })}
                {btn('Vol + 🔊', 'VOLUME', { relative: 0.1 })}
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.row}>
                {btn('⛶ Fullscreen', 'FULLSCREEN_PROMPT')}
                {btn('⧉ PiP', 'PIP')}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
