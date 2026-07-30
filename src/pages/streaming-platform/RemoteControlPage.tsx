import {useEffect, useMemo, useState} from 'react'
import {Link} from 'react-router-dom'
import {useRemoteControlSender} from './hooks/useRemoteControl'
import {TextField} from '../../components/fields/TextField'
import {Button} from '../../components/ui/Button'
import {fetchProductionDetails, fetchProductions} from './api'
import type {ProductionDetails, ProductionSummary} from './types'
import styles from './RemoteControlPage.module.css'

const LAST_ROOM_ID_KEY = 'remoteControl.lastRoomId'

function fmtTime(secs: number) {
    if (!isFinite(secs) || secs < 0) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
}

export default function RemoteControlPage() {
    const [roomIdInput, setRoomIdInput] = useState('')
    const [connectedRoomId, setConnectedRoomId] = useState<string | null>(
        () => localStorage.getItem(LAST_ROOM_ID_KEY)
    )
    const {connected, send, status} = useRemoteControlSender(connectedRoomId)
    const [scrubTime, setScrubTime] = useState<number | null>(null)

    const [productions, setProductions] = useState<ProductionSummary[]>([])
    const [loadingProds, setLoadingProds] = useState(false)
    const [query, setQuery] = useState('')

    const [showFilters, setShowFilters] = useState(false)
    const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set())
    const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set())

    const [expanded, setExpanded] = useState<string | null>(null)
    const [detailsCache, setDetailsCache] = useState<Record<string, ProductionDetails>>({})
    const [detailsLoadingName, setDetailsLoadingName] = useState<string | null>(null)
    const [openSeason, setOpenSeason] = useState<Record<string, string>>({})

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

    const categoryOptions = useMemo(() => {
        const cats = new Set<string>()
        productions.forEach((p) => p.categories?.forEach((c) => cats.add(c)))
        return [...cats].sort()
    }, [productions])

    const filtersActive =
        normalizedQuery !== '' || filterTypes.size > 0 || filterCategories.size > 0

    const toggleTypeFilter = (t: string) => {
        setFilterTypes((prev) => {
            const next = new Set(prev)
            next.has(t) ? next.delete(t) : next.add(t)
            return next
        })
    }

    const toggleCategoryFilter = (c: string) => {
        setFilterCategories((prev) => {
            const next = new Set(prev)
            next.has(c) ? next.delete(c) : next.add(c)
            return next
        })
    }

    const clearFilters = () => {
        setFilterTypes(new Set())
        setFilterCategories(new Set())
        setQuery('')
    }

    const filtered = useMemo(() => {
        if (!filtersActive) return []

        return productions
            .filter((p) => {
                if (normalizedQuery) {
                    const hay = [
                        p.title ?? '',
                        p.productionName ?? '',
                        p.description ?? '',
                        ...(p.categories ?? []),
                        ...(p.tags ?? []),
                    ]
                        .join(' ')
                        .toLowerCase()

                    if (!hay.includes(normalizedQuery)) return false
                }

                if (filterTypes.size > 0 && !filterTypes.has(p.type ?? '')) return false

                if (
                    filterCategories.size > 0 &&
                    !p.categories?.some((c) => filterCategories.has(c))
                )
                    return false

                return true
            })
            .slice(0, 20)
    }, [productions, normalizedQuery, filterTypes, filterCategories, filtersActive])

    const connect = () => {
        const id = roomIdInput.trim()
        if (id) {
            localStorage.setItem(LAST_ROOM_ID_KEY, id)
            setConnectedRoomId(id)
        }
    }

    const disconnect = () => {
        localStorage.removeItem(LAST_ROOM_ID_KEY)
        setConnectedRoomId(null)
    }

    const navigateOnTv = (url: string) => {
        if (!connected) return
        send('NAVIGATE', {url})
    }

    const openProduction = (name: string) => {
        navigateOnTv(`/streaming/production/${encodeURIComponent(name)}`)
    }

    const playEpisode = (name: string, episodeId: string) => {
        navigateOnTv(`/streaming/player/${encodeURIComponent(name)}/${episodeId}`)
    }

    const toggleExpanded = async (name: string) => {
        if (expanded === name) {
            setExpanded(null)
            return
        }
        setExpanded(name)

        if (!detailsCache[name]) {
            setDetailsLoadingName(name)
            try {
                const res = await fetchProductionDetails(name)
                const details: ProductionDetails = res.data
                setDetailsCache((prev) => ({...prev, [name]: details}))
                if (details.seasons && details.seasons.length > 0) {
                    setOpenSeason((prev) => ({
                        ...prev,
                        [name]: prev[name] ?? details.seasons![0].name,
                    }))
                }
            } catch {
                // leave expanded with no details; user can retry by collapsing/expanding
            } finally {
                setDetailsLoadingName(null)
            }
        }
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

    const seekTo = (time: number) => {
        if (!connected) return
        send('SEEK_TO', {currentTime: time})
    }

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
                            onClick={disconnect}
                        >
                            Disconnect
                        </Button>
                    </div>

                    <div className={styles.searchSection}>
                        <div className={styles.searchHeader}>
                            <label className={styles.searchLabel}>
                                Search to play
                            </label>

                            <button
                                className={
                                    showFilters
                                        ? styles.filterToggleActive
                                        : styles.filterToggle
                                }
                                onClick={() => setShowFilters((p) => !p)}
                            >
                                ⚙ Filters
                                {(filterTypes.size > 0 ||
                                    filterCategories.size > 0) &&
                                    !showFilters
                                    ? ' •'
                                    : ''}
                            </button>
                        </div>

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

                        {showFilters && (
                            <div className={styles.filterPanel}>
                                <div className={styles.filterRow}>
                                    <span className={styles.filterLabel}>
                                        Type
                                    </span>
                                    <div className={styles.filterChips}>
                                        {(
                                            [
                                                ['MOVIE', 'Movies'],
                                                ['TV_SERIES', 'Series'],
                                                ['OTHER', 'Other'],
                                            ] as const
                                        ).map(([value, label]) => (
                                            <button
                                                key={value}
                                                className={
                                                    filterTypes.has(value)
                                                        ? styles.chipActive
                                                        : styles.chip
                                                }
                                                onClick={() =>
                                                    toggleTypeFilter(value)
                                                }
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {categoryOptions.length > 0 && (
                                    <div className={styles.filterRow}>
                                        <span className={styles.filterLabel}>
                                            Category
                                        </span>
                                        <div className={styles.filterChips}>
                                            {categoryOptions.map((c) => (
                                                <button
                                                    key={c}
                                                    className={
                                                        filterCategories.has(c)
                                                            ? styles.chipActive
                                                            : styles.chip
                                                    }
                                                    onClick={() =>
                                                        toggleCategoryFilter(c)
                                                    }
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filtersActive && (
                                    <button
                                        className={styles.filterClearBtn}
                                        onClick={clearFilters}
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        )}

                        {filtersActive && (
                            <div className={styles.results}>
                                {filtered.length === 0 && !loadingProds && (
                                    <div className={styles.noResults}>
                                        No results
                                    </div>
                                )}

                                {filtered.map((p) => {
                                    const isSeries = p.type === 'TV_SERIES'
                                    const isExpanded =
                                        expanded === p.productionName
                                    const details =
                                        detailsCache[p.productionName]
                                    const currentSeasonName =
                                        openSeason[p.productionName]
                                    const episodesToShow =
                                        details?.seasons?.find(
                                            (s) => s.name === currentSeasonName
                                        )?.episodes ?? details?.episodes ?? []

                                    return (
                                        <div
                                            key={p.productionName}
                                            className={styles.resultItem}
                                        >
                                            <div className={styles.resultRow}>
                                                <div
                                                    className={
                                                        styles.resultInfo
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.resultTitle
                                                        }
                                                    >
                                                        {p.title ??
                                                            p.productionName}
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.resultMeta
                                                        }
                                                    >
                                                        {p.type?.toLowerCase() ??
                                                            'unknown'}{' '}
                                                        ·{' '}
                                                        {p.releaseYearStart ??
                                                            ''}
                                                    </div>
                                                </div>

                                                <div
                                                    className={
                                                        styles.resultActions
                                                    }
                                                >
                                                    <button
                                                        className={
                                                            styles.resultBtn
                                                        }
                                                        disabled={!connected}
                                                        onClick={() =>
                                                            openProduction(
                                                                p.productionName
                                                            )
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

                                                    {isSeries && (
                                                        <button
                                                            className={
                                                                isExpanded
                                                                    ? styles.resultBtnActive
                                                                    : styles.resultBtn
                                                            }
                                                            onClick={() =>
                                                                void toggleExpanded(
                                                                    p.productionName
                                                                )
                                                            }
                                                            title="Choose season / episode"
                                                        >
                                                            {isExpanded
                                                                ? '▲'
                                                                : 'Episodes ▾'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div
                                                    className={
                                                        styles.episodesPanel
                                                    }
                                                >
                                                    {detailsLoadingName ===
                                                        p.productionName && (
                                                        <div
                                                            className={
                                                                styles.epLoading
                                                            }
                                                        >
                                                            Loading…
                                                        </div>
                                                    )}

                                                    {details?.seasons &&
                                                        details.seasons.length >
                                                            0 && (
                                                            <div
                                                                className={
                                                                    styles.seasonTabs
                                                                }
                                                            >
                                                                {details.seasons.map(
                                                                    (s) => (
                                                                        <button
                                                                            key={
                                                                                s.name
                                                                            }
                                                                            className={
                                                                                currentSeasonName ===
                                                                                s.name
                                                                                    ? styles.seasonTabActive
                                                                                    : styles.seasonTab
                                                                            }
                                                                            onClick={() =>
                                                                                setOpenSeason(
                                                                                    (
                                                                                        prev
                                                                                    ) => ({
                                                                                        ...prev,
                                                                                        [p.productionName]:
                                                                                            s.name,
                                                                                    })
                                                                                )
                                                                            }
                                                                        >
                                                                            {
                                                                                s.name
                                                                            }
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}

                                                    {details &&
                                                        episodesToShow.length ===
                                                            0 &&
                                                        detailsLoadingName !==
                                                            p.productionName && (
                                                            <div
                                                                className={
                                                                    styles.noResults
                                                                }
                                                            >
                                                                No episodes
                                                            </div>
                                                        )}

                                                    {episodesToShow.length >
                                                        0 && (
                                                        <div
                                                            className={
                                                                styles.episodeList
                                                            }
                                                        >
                                                            {episodesToShow.map(
                                                                (ep) => (
                                                                    <button
                                                                        key={
                                                                            ep.id
                                                                        }
                                                                        className={
                                                                            styles.episodeItem
                                                                        }
                                                                        disabled={
                                                                            !connected
                                                                        }
                                                                        onClick={() =>
                                                                            playEpisode(
                                                                                p.productionName,
                                                                                ep.id
                                                                            )
                                                                        }
                                                                    >
                                                                        <span
                                                                            className={
                                                                                styles.epName
                                                                            }
                                                                        >
                                                                            {
                                                                                ep.name
                                                                            }
                                                                        </span>
                                                                        <span>
                                                                            ▶
                                                                        </span>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {status && (
                        <div className={styles.nowPlaying}>
                            <div className={styles.nowPlayingTitle}>
                                <span>{status.playing ? '▶' : '⏸'}</span>
                                <span className={styles.nowPlayingName}>
                                    {status.title ?? 'Playing…'}
                                </span>
                            </div>

                            <input
                                type="range"
                                className={styles.seekBar}
                                min={0}
                                max={Math.max(status.duration, 1)}
                                step={1}
                                disabled={!connected}
                                value={scrubTime ?? status.currentTime}
                                onChange={(e) =>
                                    setScrubTime(Number(e.target.value))
                                }
                                onMouseUp={() => {
                                    if (scrubTime != null) {
                                        seekTo(scrubTime)
                                        setScrubTime(null)
                                    }
                                }}
                                onTouchEnd={() => {
                                    if (scrubTime != null) {
                                        seekTo(scrubTime)
                                        setScrubTime(null)
                                    }
                                }}
                            />

                            <div className={styles.seekTimes}>
                                <span>
                                    {fmtTime(scrubTime ?? status.currentTime)}
                                </span>
                                <span>{fmtTime(status.duration)}</span>
                            </div>
                        </div>
                    )}

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