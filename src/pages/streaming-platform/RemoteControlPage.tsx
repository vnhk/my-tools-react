import {useEffect, useMemo, useState} from 'react'
import {Link} from 'react-router-dom'
import {useRemoteControlSender} from './hooks/useRemoteControl'
import {TextField} from '../../components/fields/TextField'
import {Button} from '../../components/ui/Button'
import {fetchProductionDetails, fetchProductions} from './api'
import type {ProductionDetails, ProductionSummary} from './types'
import styles from './RemoteControlPage.module.css'

export default function RemoteControlPage() {
    const [roomIdInput, setRoomIdInput] = useState('')
    const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null)
    const {connected, send} = useRemoteControlSender(connectedRoomId)

    const [productions, setProductions] = useState<ProductionSummary[]>([])
    const [loadingProds, setLoadingProds] = useState(false)
    const [query, setQuery] = useState('')

    useEffect(() => {
        let mounted = true

        setLoadingProds(true)

        fetchProductions()
            .then((res) => {
                if (mounted) setProductions(res.data)
            })
            .catch(() => {
            })
            .finally(() => {
                if (mounted) setLoadingProds(false)
            })

        return () => {
            mounted = false
        }
    }, [])

    const normalizedQuery = query.trim().toLowerCase()

    const filtered = useMemo(() => {
        if (!normalizedQuery) return []

        return productions
            .filter((p) => {
                const hay = [
                    p.title ?? '',
                    p.productionName ?? '',
                    ...(p.categories ?? []),
                    ...(p.tags ?? []),
                ]
                    .join(' ')
                    .toLowerCase()

                return hay.includes(normalizedQuery)
            })
            .slice(0, 12)
    }, [productions, normalizedQuery])

    const connect = () => {
        const id = roomIdInput.trim()
        if (id) setConnectedRoomId(id)
    }

    const navigateOnTv = (url: string) => {
        if (!connected) return
        send('NAVIGATE', {url})
    }

    const openProduction = (name: string) => {
        navigateOnTv(`/streaming/production/${encodeURIComponent(name)}`)
    }

    const playFirstAvailable = async (name: string) => {
        if (!connected) return

        try {
            const res = await fetchProductionDetails(name)
            const details: ProductionDetails = res.data

            const direct = details.episodes?.[0]?.id
            const firstFromSeason = details.seasons?.[0]?.episodes?.[0]?.id
            const videoId = direct ?? firstFromSeason

            if (videoId) {
                navigateOnTv(
                    `/streaming/player/${encodeURIComponent(name)}/${videoId}`
                )
            } else {
                openProduction(name)
            }
        } catch {
            openProduction(name)
        }
    }

    const btn = (
        label: string,
        action: string,
        data?: Record<string, number | string>,
        large = false
    ) => (
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
                <Link to="/streaming" className={styles.backBtn}>
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
                        Enter the Room ID shown on the player screen (📱 badge in the top
                        bar):
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

                        <Button
                            variant="ghost"
                            onClick={() => setConnectedRoomId(null)}
                        >
                            Disconnect
                        </Button>
                    </div>

                    <div className={styles.searchSection}>
                        <label className={styles.searchLabel}>
                            Search to play
                        </label>

                        <input
                            type="search"
                            className={styles.searchInput}
                            placeholder={
                                loadingProds
                                    ? 'Loading…'
                                    : 'Search movie or series…'
                            }
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />

                        {normalizedQuery && (
                            <div className={styles.results}>
                                {filtered.length === 0 && !loadingProds && (
                                    <div className={styles.noResults}>
                                        No results
                                    </div>
                                )}

                                {filtered.map((p) => (
                                    <div
                                        key={p.productionName}
                                        className={styles.resultItem}
                                    >
                                        <div className={styles.resultInfo}>
                                            <div className={styles.resultTitle}>
                                                {p.title ?? p.productionName}
                                            </div>

                                            <div className={styles.resultMeta}>
                                                {p.type?.toLowerCase() ?? 'unknown'} ·{' '}
                                                {p.releaseYearStart ?? ''}
                                            </div>
                                        </div>

                                        <div className={styles.resultActions}>
                                            <button
                                                className={styles.resultBtn}
                                                disabled={!connected}
                                                onClick={() =>
                                                    openProduction(p.productionName)
                                                }
                                                title="Open details on TV"
                                            >
                                                Open
                                            </button>

                                            <button
                                                className={`${styles.resultBtn} ${styles.playBtn}`}
                                                disabled={!connected}
                                                onClick={() =>
                                                    void playFirstAvailable(
                                                        p.productionName
                                                    )
                                                }
                                                title="Play now on TV"
                                            >
                                                ▶ Play
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                {btn('⏪ −10s', 'SEEK', {
                                    relative: -10,
                                })}

                                {btn(
                                    '⏯ Play/Pause',
                                    'TOGGLE_PLAY',
                                    undefined,
                                    true
                                )}

                                {btn('+10s ⏩', 'SEEK', {
                                    relative: 10,
                                })}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.row}>
                                {btn('🔉 Vol −', 'VOLUME', {
                                    relative: -0.1,
                                })}

                                {btn('Vol + 🔊', 'VOLUME', {
                                    relative: 0.1,
                                })}
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