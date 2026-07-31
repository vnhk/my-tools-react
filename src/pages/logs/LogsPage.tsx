import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {type LogEntry, logsApi} from '../../api/logs'
import {DataTable} from '../../components/table/DataTable'
import {EntityFilters} from '../../components/ui/EntityFilters'
import {ImportExportBar} from '../../components/ui/ImportExportBar'
import {buildColumnsFromConfig} from '../../components/table/configColumns'
import {useTableState} from '../../hooks/useTableState'
import {useTableActions} from '../../hooks/useTableActions'
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

// Cap on how many new rows we pull per tick — the tail buffer trims down to
// pageSize right after anyway, this just bounds a single request's payload.
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
    const {showError} = useNotification()
    // Sorted newest-first by default so page 1 is always the most recent slice —
    // for other entities defaulting to page 1 is fine, but for an ever-growing
    // log table "page 1, oldest first" would bury the newest entries on later pages.
    const table = useTableState({sortBy: 'timestamp', sortDir: 'desc'}, 'logs-list')
    const [appNames, setAppNames] = useState<string[]>([])
    const [appName, setAppName] = useState('')
    const [activeMinutes, setActiveMinutes] = useState(0)
    const {filters, setFilter, clearFilters} = useEntityFilters()
    const [rows, setRows] = useState<LogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [expandAll, setExpandAll] = useState(false)
    const [liveMode, setLiveMode] = useState(false)
    const [liveIntervalMs, setLiveIntervalMs] = useState(5000)
    const [hiddenJsonFields, setHiddenJsonFields] = useState<Set<string>>(loadHiddenJsonFields)

    // Cursor + dedupe set for the live tail — refs so updating them doesn't
    // itself trigger a render; they only matter to the next poll tick.
    const lastSeenTimestampRef = useRef<string | null>(null)
    const knownLogIdsRef = useRef<Set<number>>(new Set())
    // Bumped on every reset (filters/appName/pageSize change, or enabling live).
    // A fetch started under an older generation discards its response instead
    // of applying it, so a slow request from before a filter change can't
    // land after — and overwrite — the fresher one.
    const liveGenerationRef = useRef(0)

    const handleTimeFilter = (minutes: number) => {
        setActiveMinutes(minutes)
        //2026-06-20T00:15
        const now = new Date()
        const start = new Date(now.getTime() - minutes * 60 * 1000)
        // const startStr = start.toISOString().split('T')[0] + 'T' + start.toTimeString().slice(0, 5)
        const startStr = start.toISOString().slice(0, 16)
        const endStr = now.toISOString().slice(0, 16)
        setFilter("timestamp_from", startStr)
        setFilter("timestamp_to", endStr)
        load()
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

    const columns = [
        ...buildColumnsFromConfig<LogEntry>('LogEntity', {
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
    ]

    useEffect(() => {
        // Set default time filter to last 1 hour
        handleTimeFilter(60)

        logsApi.getAppNames().then((res) => {
            const names = Array.isArray(res.data) ? res.data : Array.from(res.data as Set<string>)
            setAppNames(names)
            if (names.length > 0) setAppName(names[0])
        }).catch(() => showError('Failed to load app names'))
    }, []);

    useEffect(() => {
        if (liveMode) return
        let cancelled = false
        setLoading(true)

        logsApi
            .getAll({
                page: table.page,
                size: table.pageSize,
                sort: table.sortBy,
                direction: table.sortDir,
                ...filters,
            })
            .then((res) => {
                if (cancelled) return
                const p = toPage(res.data)
                setRows(p.content)
                setTotal(p.totalElements)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [table.page, table.pageSize, table.sortBy, table.sortDir, refreshKey, JSON.stringify(filters), liveMode])

    const load = () => setRefreshKey(k => k + 1)

    // Live tail: first tick snapshots the newest `pageSize` entries; every tick
    // after that only asks for what's newer than the last-seen timestamp, so we
    // append rather than re-fetch the whole window. Ids are deduped via a ref
    // since the same boundary row can come back depending on backend inclusivity.
    const fetchLiveLogs = useCallback(async () => {
        if (!appName) return
        const generation = liveGenerationRef.current
        const since = lastSeenTimestampRef.current

        if (!since) {
            const res = await logsApi.getAll({
                appName,
                ...filters,
                timestamp_to: undefined,
                sort: 'timestamp',
                direction: 'desc',
                page: 0,
                size: table.pageSize,
            })
            if (liveGenerationRef.current !== generation) return // superseded by a newer reset
            const p = toPage(res.data)
            const initial = [...p.content].reverse()
            knownLogIdsRef.current = new Set(initial.map(r => r.id))
            setRows(initial)
            setTotal(p.totalElements)
            lastSeenTimestampRef.current = initial.length
                ? initial[initial.length - 1].timestamp
                : new Date().toISOString()
            return
        }

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
        if (liveGenerationRef.current !== generation) return // superseded by a newer reset
        const p = toPage(res.data)
        if (p.content.length === 0) return

        lastSeenTimestampRef.current = p.content[p.content.length - 1].timestamp
        const freshEntries = p.content.filter(entry => !knownLogIdsRef.current.has(entry.id))
        if (freshEntries.length === 0) return

        freshEntries.forEach(entry => knownLogIdsRef.current.add(entry.id))
        setRows(prev => {
            const merged = [...prev, ...freshEntries]
            const overflow = merged.length - table.pageSize
            return overflow > 0 ? merged.slice(overflow) : merged
        })
        setTotal(t => t + freshEntries.length)
    }, [appName, filters, table.pageSize])

    const {lastUpdated, refresh: refreshLive} = useAutoRefresh(fetchLiveLogs, {
        intervalMs: liveIntervalMs,
        enabled: liveMode,
    })

    // Filters/appName/pageSize changing mid-stream restarts the tail from a
    // fresh snapshot instead of mixing rows from two different filter sets.
    useEffect(() => {
        if (!liveMode) return
        lastSeenTimestampRef.current = null
        knownLogIdsRef.current = new Set()
        setRows([])
        void refreshLive()
    }, [appName, JSON.stringify(filters), table.pageSize, liveMode, refreshLive])

    const actions = useTableActions<LogEntry>({
        onRefresh: load,
        onCopy: (selected) => selected.map(r => r.fullLog || r.message).join('\n\n'),
    })

    const displayedRows = table.search
        ? rows.filter(r => r.fullLog?.toLowerCase().includes(table.search.toLowerCase()))
        : rows

    return (
        <div className={styles.page}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <CustomSelect
                        options={appNames.map((n) => ({value: n, label: n}))}
                        value={appName}
                        onChange={(v) => {
                            setAppName(String(v));
                            load()
                        }}
                        size="sm"
                    />
                    <Button
                        variant={liveMode ? 'success' : 'secondary'}
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
                </div>
                <div className={styles.timeFilters}>
                    {TIME_FILTERS.map((tf) => (
                        <button
                            key={tf.minutes}
                            className={`${styles.timeBtn} ${activeMinutes === tf.minutes ? styles.timeBtnActive : ''}`}
                            onClick={() => handleTimeFilter(tf.minutes)}>
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>


            <h2>Logs</h2>
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
            <DataTable
                columns={columns}
                rows={displayedRows}
                rowKey={(r) => r.id.toString()}
                loading={loading}
                page={liveMode ? 0 : table.page}
                pageSize={table.pageSize}
                totalElements={total}
                onPageChange={liveMode ? undefined : table.setPage}
                onPageSizeChange={table.setPageSize}
                sortBy={table.sortBy}
                sortDir={table.sortDir}
                onSort={liveMode ? undefined : table.toggleSort}
                searchValue={table.search}
                onSearchChange={table.setSearch}
                actions={actions}
            />
        </div>
    )
}
