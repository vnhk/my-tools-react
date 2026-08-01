import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import {type LogEntry, logsApi} from '../../api/logs'
import {type Column} from '../../components/table/DataTable'
import tableStyles from '../../components/table/DataTable.module.css'
import {EntityFilters} from '../../components/ui/EntityFilters'
import {ImportExportBar} from '../../components/ui/ImportExportBar'
import {Toolbar} from '../../components/ui/Toolbar'
import {buildColumnsFromConfig} from '../../components/table/configColumns'
import {useEntityFilters} from '../../hooks/useEntityFilters'
import {useAutoRefresh} from '../../common/hooks/useAutoRefresh'
import {toPage} from '../../api/crud'
import styles from './LogsPage.module.css'
import {CustomSelect} from "../../components/fields/CustomSelect.tsx";
import {useNotification} from "../../components/ui/Notification.tsx";
import {Button} from "../../components/ui/Button.tsx";

const TIME_FILTERS = [
    {label: 'Last 5m', minutes: 5},
    {label: 'Last 10m', minutes: 10},
    {label: 'Last 30m', minutes: 30},
    {label: 'Last 1h', minutes: 60},
    {label: 'Last 2h', minutes: 120},
    {label: 'Last 6h', minutes: 360},
    {label: 'Last 24h', minutes: 1440},
    {label: 'Last 3d', minutes: 4320},
    {label: 'Last 7d', minutes: 10080},
]

const LIVE_INTERVALS = [
    {label: '1s', ms: 1000},
    {label: '2s', ms: 2000},
    {label: '5s', ms: 5000},
    {label: '10s', ms: 10000},
    {label: '30s', ms: 30000},
    {label: '1m', ms: 60000},
    {label: '5m', ms: 300000},
]

// CloudWatch-style default: last 50, scrolling up loads 50 more at a time.
const LOGS_BATCH_SIZE = 50
// Cap on how many new rows a single live tick pulls in.
const LIVE_FETCH_SIZE = 200

// Which JSON log fields to hide is a display preference, not data — kept
// entirely client-side and persisted so it survives reloads.
const HIDDEN_JSON_FIELDS_KEY = 'logs.hiddenJsonFields'

function loadHiddenJsonFields(): Set<string> {
    try {
        const raw = localStorage.getItem(HIDDEN_JSON_FIELDS_KEY)
        return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
        return new Set()
    }
}

function saveHiddenJsonFields(fields: Set<string>) {
    try {
        localStorage.setItem(HIDDEN_JSON_FIELDS_KEY, JSON.stringify([...fields]))
    } catch {
        // ignore quota errors
    }
}

function ExpandableLog({text, forceExpanded, hiddenFields}: {
    text: string
    forceExpanded?: boolean
    hiddenFields?: Set<string>
}) {
    const [localExpanded, setLocalExpanded] = useState(false)
    const expanded = forceExpanded ?? localExpanded
    const isLong = text && text.length > 300
    const display = expanded || !isLong ? text : text.slice(0, 300) + '…'

    let isJson = false
    let parsed: Record<string, unknown> | null = null
    try {
        if (text && text.trimStart().startsWith('{')) {
            const raw = JSON.parse(text)
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                parsed = hiddenFields && hiddenFields.size > 0
                    ? Object.fromEntries(Object.entries(raw).filter(([k]) => !hiddenFields.has(k)))
                    : raw
                isJson = true
            }
        }
    } catch { /* not json */
    }

    return (
        <div className={styles.logCell}>
            {isJson && parsed ? (
                <pre
                    className={styles.jsonLog}>{expanded ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed).slice(0, 300) + (isLong ? '…' : '')}</pre>
            ) : (
                <span className={styles.logText}>{display}</span>
            )}
            {isLong && forceExpanded === undefined && (
                <button className={styles.expandBtn} onClick={() => setLocalExpanded(!localExpanded)}>
                    {expanded ? 'Collapse' : 'Expand'}
                </button>
            )}
        </div>
    )
}

function JsonFieldsMenu({fields, hidden, onToggle}: {
    fields: string[]
    hidden: Set<string>
    onToggle: (field: string) => void
}) {
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    const visibleCount = fields.length - hidden.size

    return (
        <div className={styles.fieldsMenu} ref={wrapperRef}>
            <Button variant="secondary" size="sm" onClick={() => setOpen(v => !v)}>
                Fields {fields.length > 0 ? `(${visibleCount}/${fields.length})` : ''}
            </Button>
            {open && (
                <div className={styles.fieldsDropdown}>
                    {fields.length === 0 ? (
                        <div className={styles.fieldsEmpty}>No JSON fields seen yet</div>
                    ) : (
                        fields.map(f => (
                            <label key={f} className={styles.fieldsOption}>
                                <input
                                    type="checkbox"
                                    checked={!hidden.has(f)}
                                    onChange={() => onToggle(f)}
                                />
                                {f}
                            </label>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export function LogsPage() {
    const {showError, showSuccess} = useNotification()
    const [appNames, setAppNames] = useState<string[]>([])
    const [appName, setAppName] = useState('')
    const [activeMinutes, setActiveMinutes] = useState(0)
    const {filters, setFilter, clearFilters} = useEntityFilters()

    // Rows are always ascending by timestamp (oldest first) — scrolling up
    // prepends older batches, live mode appends new ones at the bottom.
    const [rows, setRows] = useState<LogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [initialLoading, setInitialLoading] = useState(false)
    const [loadingOlder, setLoadingOlder] = useState(false)
    const [hasMoreOlder, setHasMoreOlder] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

    const [expandAll, setExpandAll] = useState(false)
    const [liveMode, setLiveMode] = useState(false)
    const [liveIntervalMs, setLiveIntervalMs] = useState(5000)
    const [hiddenJsonFields, setHiddenJsonFields] = useState<Set<string>>(loadHiddenJsonFields)

    const knownLogIdsRef = useRef<Set<number>>(new Set())
    // Bottom cursor for live-tail appends — only meaningful once resetView() has run.
    const lastSeenTimestampRef = useRef<string | null>(null)
    // Bumped on every reset (filters/appName change). A fetch (initial load,
    // load-older, or live tick) started under an older generation discards its
    // response instead of applying it, so a slow request from before a filter
    // change can't land after — and corrupt — the fresher view.
    const viewGenerationRef = useRef(0)

    const scrollRef = useRef<HTMLDivElement>(null)
    // Set right before prepending older rows so the layout effect can keep the
    // viewport anchored to the same content instead of jumping on the prepend.
    const prependAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)
    // Whether the user is parked at the bottom (following along) — only then
    // do live-appended rows auto-scroll into view instead of leaving the user
    // wherever they scrolled up to read history.
    const isNearBottomRef = useRef(true)

    const handleTimeFilter = (minutes: number) => {
        setActiveMinutes(minutes)
        const now = new Date()
        const start = new Date(now.getTime() - minutes * 60 * 1000)
        const startStr = start.toISOString().slice(0, 16)
        const endStr = now.toISOString().slice(0, 16)
        setFilter("timestamp_from", startStr)
        setFilter("timestamp_to", endStr)
    }

    const toggleJsonField = (field: string) => {
        setHiddenJsonFields(prev => {
            const next = new Set(prev)
            next.has(field) ? next.delete(field) : next.add(field)
            saveHiddenJsonFields(next)
            return next
        })
    }

    // Union of JSON keys seen across whatever rows are currently loaded — grows
    // as new/rarer fields (e.g. moduleName) show up, including while live.
    const knownJsonFields = useMemo(() => {
        const fields = new Set<string>()
        for (const row of rows) {
            if (!row.fullLog?.trimStart().startsWith('{')) continue
            try {
                const parsed = JSON.parse(row.fullLog)
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    Object.keys(parsed).forEach(k => fields.add(k))
                }
            } catch { /* not json */
            }
        }
        return [...fields].sort()
    }, [rows])

    const columns: Column<LogEntry>[] = buildColumnsFromConfig<LogEntry>('LogEntity', {
        fullLog: {
            render: (row) => (
                <ExpandableLog
                    text={row.fullLog}
                    forceExpanded={expandAll ? true : undefined}
                    hiddenFields={hiddenJsonFields}
                />
            ),
            width: '480px',
        },
    })

    useEffect(() => {
        logsApi.getAppNames().then((res) => {
            const names = Array.isArray(res.data) ? res.data : Array.from(res.data as Set<string>)
            setAppNames(names)
            if (names.length > 0) setAppName(names[0])
        }).catch(() => showError('Failed to load app names'))
    }, []);

    useEffect(() => {
        handleTimeFilter(60)
    }, [])

    // Loads the newest LOGS_BATCH_SIZE entries and replaces the view — run on
    // mount and whenever appName/filters change, regardless of live mode.
    const resetView = useCallback(async () => {
        if (!appName) return
        viewGenerationRef.current += 1
        const generation = viewGenerationRef.current
        knownLogIdsRef.current = new Set()
        lastSeenTimestampRef.current = null
        setSelectedIds(new Set())
        setHasMoreOlder(true)
        setRows([])
        setInitialLoading(true)
        try {
            const res = await logsApi.getAll({
                appName,
                ...filters,
                timestamp_to: undefined,
                sort: 'timestamp',
                direction: 'desc',
                page: 0,
                size: LOGS_BATCH_SIZE,
            })
            if (viewGenerationRef.current !== generation) return
            const p = toPage(res.data)
            const initial = [...p.content].reverse()
            knownLogIdsRef.current = new Set(initial.map(r => r.id))
            isNearBottomRef.current = true
            setRows(initial)
            setTotal(p.totalElements)
            setHasMoreOlder(p.content.length === LOGS_BATCH_SIZE)
            lastSeenTimestampRef.current = initial.length
                ? initial[initial.length - 1].timestamp
                : new Date().toISOString()
        } finally {
            if (viewGenerationRef.current === generation) setInitialLoading(false)
        }
    }, [appName, filters])

    useEffect(() => {
        void resetView()
    }, [appName, JSON.stringify(filters), resetView])

    // Scrolling near the top pulls in the next-older batch and prepends it.
    const loadOlder = useCallback(async () => {
        if (loadingOlder || !hasMoreOlder || rows.length === 0 || !appName) return
        const generation = viewGenerationRef.current
        const oldestTimestamp = rows[0].timestamp
        setLoadingOlder(true)
        try {
            const res = await logsApi.getAll({
                appName,
                ...filters,
                timestamp_to: oldestTimestamp,
                sort: 'timestamp',
                direction: 'desc',
                page: 0,
                size: LOGS_BATCH_SIZE,
            })
            if (viewGenerationRef.current !== generation) return
            const p = toPage(res.data)
            const older = [...p.content].reverse().filter(entry => !knownLogIdsRef.current.has(entry.id))
            if (older.length > 0) {
                older.forEach(entry => knownLogIdsRef.current.add(entry.id))
                if (scrollRef.current) {
                    prependAnchorRef.current = {
                        scrollHeight: scrollRef.current.scrollHeight,
                        scrollTop: scrollRef.current.scrollTop,
                    }
                }
                setRows(prev => [...older, ...prev])
            }
            if (p.content.length < LOGS_BATCH_SIZE) setHasMoreOlder(false)
        } finally {
            if (viewGenerationRef.current === generation) setLoadingOlder(false)
        }
    }, [loadingOlder, hasMoreOlder, rows, appName, filters])

    // Live tail: only appends what's newer than the last-seen timestamp set by
    // resetView — the initial snapshot is always resetView's job now.
    const fetchLiveLogs = useCallback(async () => {
        if (!appName) return
        const since = lastSeenTimestampRef.current
        if (!since) return
        const generation = viewGenerationRef.current

        const res = await logsApi.getAll({
            appName,
            ...filters,
            timestamp_from: since,
            timestamp_to: undefined,
            sort: 'timestamp',
            direction: 'asc',
            page: 0,
            size: LIVE_FETCH_SIZE,
        })
        if (viewGenerationRef.current !== generation) return
        const p = toPage(res.data)
        if (p.content.length === 0) return

        lastSeenTimestampRef.current = p.content[p.content.length - 1].timestamp
        const freshEntries = p.content.filter(entry => !knownLogIdsRef.current.has(entry.id))
        if (freshEntries.length === 0) return

        freshEntries.forEach(entry => knownLogIdsRef.current.add(entry.id))
        setRows(prev => [...prev, ...freshEntries])
        setTotal(t => t + freshEntries.length)
    }, [appName, filters])

    const {lastUpdated} = useAutoRefresh(fetchLiveLogs, {
        intervalMs: liveIntervalMs,
        enabled: liveMode,
    })

    // Keep the viewport anchored: restore scroll position after a prepend, or
    // follow to the bottom on append if the user was already parked there.
    useLayoutEffect(() => {
        const el = scrollRef.current
        if (!el) return
        if (prependAnchorRef.current) {
            const {scrollHeight: oldHeight, scrollTop: oldTop} = prependAnchorRef.current
            el.scrollTop = oldTop + (el.scrollHeight - oldHeight)
            prependAnchorRef.current = null
        } else if (isNearBottomRef.current) {
            el.scrollTop = el.scrollHeight
        }
    }, [rows])

    const handleScroll = () => {
        const el = scrollRef.current
        if (!el) return
        if (el.scrollTop < 150) void loadOlder()
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        isNearBottomRef.current = distanceFromBottom < 100
    }

    const displayedRows = search
        ? rows.filter(r => r.fullLog?.toLowerCase().includes(search.toLowerCase()))
        : rows

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        setSelectedIds(prev =>
            prev.size === displayedRows.length && displayedRows.length > 0
                ? new Set()
                : new Set(displayedRows.map(r => r.id))
        )
    }

    const handleCopySelected = async () => {
        const selected = displayedRows.filter(r => selectedIds.has(r.id))
        if (selected.length === 0) return
        try {
            await navigator.clipboard.writeText(selected.map(r => r.fullLog || r.message).join('\n\n'))
            showSuccess(`Copied ${selected.length} row(s)`)
            setSelectedIds(new Set())
        } catch {
            showError('Failed to copy to clipboard')
        }
    }

    return (
        <div className={styles.page}>
            <Toolbar>
                <ImportExportBar
                    exportUrl="/logs/export"
                    importUrl=""
                    entityLabel="Logs"
                    filters={filters}
                />
                <EntityFilters
                    entityName="LogEntity"
                    filters={filters}
                    onFiltersChange={setFilter}
                    onClear={clearFilters}
                />
                <CustomSelect
                    size="sm"
                    options={appNames.map((n) => ({value: n, label: n}))}
                    value={appName}
                    onChange={(v) => setAppName(String(v))}
                />
                <CustomSelect
                    size="sm"
                    options={TIME_FILTERS.map((tf) => ({value: tf.minutes, label: tf.label}))}
                    value={activeMinutes}
                    onChange={(v) => handleTimeFilter(Number(v))}
                />
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setLiveMode(v => !v)}
                >
                    {liveMode ? '● Live' : 'Go Live'}
                </Button>
                <CustomSelect
                    size="sm"
                    options={LIVE_INTERVALS.map(i => ({value: i.ms, label: i.label}))}
                    value={liveIntervalMs}
                    onChange={(v) => setLiveIntervalMs(Number(v))}
                    disabled={!liveMode}
                />
                {liveMode && lastUpdated && (
                    <span className={styles.stats}>updated {lastUpdated.toLocaleTimeString()}</span>
                )}
                <Button variant="secondary" size="sm" onClick={() => setExpandAll(v => !v)}>
                    {expandAll ? 'Collapse All' : 'Expand All'}
                </Button>
                <JsonFieldsMenu fields={knownJsonFields} hidden={hiddenJsonFields} onToggle={toggleJsonField}/>
                {selectedIds.size > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleCopySelected}>
                        Copy ({selectedIds.size})
                    </Button>
                )}
                <span className={styles.stats}>{total} total</span>
            </Toolbar>

            <input
                className={styles.searchInput}
                placeholder="Search loaded logs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className={styles.scrollContainer} ref={scrollRef} onScroll={handleScroll}>
                <table className={tableStyles.table}>
                    <thead>
                    <tr>
                        <th className={tableStyles.checkCell}>
                            <input
                                type="checkbox"
                                checked={displayedRows.length > 0 && selectedIds.size === displayedRows.length}
                                onChange={toggleSelectAll}
                            />
                        </th>
                        {columns.map((col) => (
                            <th key={col.key} style={{width: col.width}}>{col.header}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {loadingOlder && (
                        <tr>
                            <td colSpan={columns.length + 1} className={styles.loadingRow}>Loading earlier
                                logs…
                            </td>
                        </tr>
                    )}
                    {!hasMoreOlder && rows.length > 0 && (
                        <tr>
                            <td colSpan={columns.length + 1} className={styles.beginningRow}>— Beginning of
                                results —
                            </td>
                        </tr>
                    )}
                    {displayedRows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className={tableStyles.empty}>
                                {initialLoading ? 'Loading…' : 'No data'}
                            </td>
                        </tr>
                    ) : (
                        displayedRows.map((row) => (
                            <tr
                                key={row.id}
                                className={`${tableStyles.row} ${selectedIds.has(row.id) ? tableStyles.selectedRow : ''}`}
                            >
                                <td className={tableStyles.checkCell} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(row.id)}
                                        onChange={() => toggleSelect(row.id)}
                                    />
                                </td>
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        style={col.width ? {width: col.width, maxWidth: col.width} : undefined}
                                    >
                                        {col.render ? col.render(row) : String((row as unknown as Record<string, unknown>)[col.key] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
