import {useEffect, useState} from 'react'
import {type LogEntry, logsApi} from '../../api/logs'
import {DataTable} from '../../components/table/DataTable'
import {EntityFilters} from '../../components/ui/EntityFilters'
import {ImportExportBar} from '../../components/ui/ImportExportBar'
import {buildColumnsFromConfig} from '../../components/table/configColumns'
import {useTableState} from '../../hooks/useTableState'
import {useTableActions} from '../../hooks/useTableActions'
import {useEntityFilters} from '../../hooks/useEntityFilters'
import {toPage} from '../../api/crud'
import styles from './LogsPage.module.css'
import {CustomSelect} from "../../components/fields/CustomSelect.tsx";
import {useNotification} from "../../components/ui/Notification.tsx";

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

function ExpandableLog({text}: { text: string }) {
    const [expanded, setExpanded] = useState(false)
    const isLong = text && text.length > 300
    const display = expanded || !isLong ? text : text.slice(0, 300) + '…'

    let isJson = false
    let parsed: unknown = null
    try {
        if (text && text.trimStart().startsWith('{')) {
            parsed = JSON.parse(text)
            isJson = true
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
            {isLong && (
                <button className={styles.expandBtn} onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Collapse' : 'Expand'}
                </button>
            )}
        </div>
    )
}

export function LogsPage() {
    const {showError} = useNotification()
    const table = useTableState({sortBy: 'name', sortDir: 'asc'}, 'interview-questions-list')
    const [appNames, setAppNames] = useState<string[]>([])
    const [appName, setAppName] = useState('')
    const [activeMinutes, setActiveMinutes] = useState(0)
    const {filters, setFilter, clearFilters} = useEntityFilters()
    const [rows, setRows] = useState<LogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

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

    const columns = [
        ...buildColumnsFromConfig<LogEntry>('LogEntity', {
            fullLog: {render: (row) => <ExpandableLog text={row.fullLog}/>},
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
    }, [table.page, table.pageSize, table.sortBy, table.sortDir, refreshKey, JSON.stringify(filters)])

    const load = () => setRefreshKey(k => k + 1)

    const actions = useTableActions<LogEntry>({
        onRefresh: load,
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
                page={table.page}
                pageSize={table.pageSize}
                totalElements={total}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
                sortBy={table.sortBy}
                sortDir={table.sortDir}
                onSort={table.toggleSort}
                searchValue={table.search}
                onSearchChange={table.setSearch}
                actions={actions}
            />
        </div>
    )
}

