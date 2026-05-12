import { useEffect, useState, useCallback } from 'react'
import { logsApi, type LogEntry, type LogParams } from '../../api/logs'
import { Button } from '../../components/ui/Button'
import { CustomSelect } from '../../components/fields/CustomSelect'
import { useNotification } from '../../components/ui/Notification'
import styles from './LogsPage.module.css'

const TIME_FILTERS = [
  { label: 'Last 5m', minutes: 5 },
  { label: 'Last 10m', minutes: 10 },
  { label: 'Last 30m', minutes: 30 },
  { label: 'Last 1h', minutes: 60 },
  { label: 'Last 2h', minutes: 120 },
  { label: 'Last 6h', minutes: 360 },
  { label: 'Last 24h', minutes: 1440 },
  { label: 'Last 3d', minutes: 4320 },
  { label: 'Last 7d', minutes: 10080 },
]

const LOG_LEVELS = ['', 'DEBUG', 'INFO', 'WARN', 'ERROR']
const PAGE_SIZE = 500

function formatTimestamp(ts: string): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('sv-SE').replace('T', ' ')
}

function getMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString().slice(0, 19)
}

function LogLevelBadge({ level }: { level: string }) {
  const cls = {
    ERROR: styles.levelError,
    WARN: styles.levelWarn,
    INFO: styles.levelInfo,
    DEBUG: styles.levelDebug,
  }[level] ?? styles.levelInfo
  return <span className={`${styles.levelBadge} ${cls}`}>{level}</span>
}

function ExpandableLog({ text }: { text: string }) {
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
  } catch { /* not json */ }

  return (
    <div className={styles.logCell}>
      {isJson && parsed ? (
        <pre className={styles.jsonLog}>{expanded ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed).slice(0, 300) + (isLong ? '…' : '')}</pre>
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
  const { showError } = useNotification()
  const [appNames, setAppNames] = useState<string[]>([])
  const [appName, setAppName] = useState('')
  const [activeMinutes, setActiveMinutes] = useState(60)
  const [logLevel, setLogLevel] = useState('')
  const [rows, setRows] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    logsApi.getAppNames().then((res) => {
      const names = Array.isArray(res.data) ? res.data : Array.from(res.data as Set<string>)
      setAppNames(names)
      if (names.length > 0) setAppName(names[0])
    }).catch(() => showError('Failed to load app names'))
  }, [])

  const load = useCallback(() => {
    if (!appName) return
    setLoading(true)
    const params: LogParams = {
      appName,
      fromTime: getMinutesAgo(activeMinutes),
      logLevel: logLevel || undefined,
      page,
      size: PAGE_SIZE,
      sort: 'timestamp',
      direction: 'asc',
    }
    logsApi.getLogs(params)
      .then((res) => {
        const data = res.data
        setRows(data.content ?? [])
        setTotal(data.totalElements ?? 0)
      })
      .catch(() => showError('Failed to load logs'))
      .finally(() => setLoading(false))
  }, [appName, activeMinutes, logLevel, page])

  useEffect(() => {
    load()
  }, [load])

  const handleTimeFilter = (minutes: number) => {
    setActiveMinutes(minutes)
    setPage(0)
  }

  const handleExport = () => {
    const params: LogParams = {
      appName,
      fromTime: getMinutesAgo(activeMinutes),
      logLevel: logLevel || undefined,
    }
    const url = logsApi.getExportUrl(params)
    const link = document.createElement('a')
    link.href = url
    link.click()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <CustomSelect
            options={appNames.map((n) => ({ value: n, label: n }))}
            value={appName}
            onChange={(v) => { setAppName(String(v)); setPage(0) }}
            size="sm"
          />
          <CustomSelect
            options={LOG_LEVELS.map((l) => ({ value: l, label: l || 'All Levels' }))}
            value={logLevel}
            onChange={(v) => { setLogLevel(String(v)); setPage(0) }}
            size="sm"
          />
        </div>
        <div className={styles.timeFilters}>
          {TIME_FILTERS.map((tf) => (
            <button
              key={tf.minutes}
              className={`${styles.timeBtn} ${activeMinutes === tf.minutes ? styles.timeBtnActive : ''}`}
              onClick={() => handleTimeFilter(tf.minutes)}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          ↓ Export
        </Button>
      </div>

      <div className={styles.stats}>
        {loading ? 'Loading…' : `${total} logs`}
        {total > PAGE_SIZE && ` — page ${page + 1} / ${totalPages}`}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colTimestamp}>Timestamp</th>
              <th className={styles.colLevel}>Level</th>
              <th className={styles.colApp}>App</th>
              <th className={styles.colProcess}>Process</th>
              <th className={styles.colModule}>Module</th>
              <th className={styles.colLog}>Log</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={styles.row}>
                <td className={styles.colTimestamp}>{formatTimestamp(row.timestamp)}</td>
                <td className={styles.colLevel}><LogLevelBadge level={row.logLevel} /></td>
                <td className={styles.colApp}>{row.applicationName}</td>
                <td className={styles.colProcess}>{row.processName}</td>
                <td className={styles.colModule}>{row.moduleName}</td>
                <td className={styles.colLog}><ExpandableLog text={row.fullLog} /></td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>No logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="ghost" size="sm" onClick={() => setPage(0)} disabled={page === 0}>«</Button>
          <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</Button>
          <span className={styles.pageInfo}>Page {page + 1} / {totalPages}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</Button>
          <Button variant="ghost" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</Button>
        </div>
      )}
    </div>
  )
}
