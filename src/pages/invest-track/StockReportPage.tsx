import { useEffect, useRef, useState } from 'react'
import { useNotification } from '../../components/ui/Notification'
import { stockReportApi, type StockDto, type StockReportDto } from '../../api/investments'
import styles from './StockReportPage.module.css'

type Tab = 'best' | 'good' | 'risky'

function StockTable({ title, stocks, morningMap }: {
  title: string
  stocks: StockDto[]
  morningMap?: Record<string, number>
}) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? stocks.filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()))
    : stocks
  const sorted = [...filtered].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))

  return (
    <div className={styles.tableBlock}>
      <div className={styles.tableTitle}>{title}</div>
      <input
        className={styles.searchInput}
        placeholder="Search symbol..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Change %</th>
              <th>Transactions</th>
              {morningMap && <th>Diff vs Morning (%)</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={morningMap ? 4 : 3} className={styles.empty}>No data</td></tr>
            ) : sorted.map(s => {
              const pct = Number(s.changePercent ?? 0)
              const diff = morningMap ? (morningMap[s.symbol] != null ? pct - morningMap[s.symbol] : null) : null
              return (
                <tr key={s.symbol}>
                  <td className={styles.symbol}>{s.symbol}</td>
                  <td className={pct >= 0 ? styles.positive : styles.negative}>
                    {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                  </td>
                  <td>{s.transactions ?? '—'}</td>
                  {morningMap && (
                    <td className={diff == null ? '' : diff >= 0 ? styles.positive : styles.negative}>
                      {diff == null ? '—' : (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabContent({ report, tab }: { report: StockReportDto; tab: Tab }) {
  let main: StockDto[]
  let good: StockDto[]
  let bad: StockDto[]
  let probability: number | null

  if (tab === 'best') {
    main = report.bestToInvest
    good = report.goodInvestmentsBasedOnBestRecommendation
    bad = report.badInvestmentsBasedOnBestRecommendation
    probability = report.goodInvestmentProbabilityBasedOnBestToday != null
      ? Number(report.goodInvestmentProbabilityBasedOnBestToday) * 100 : null
  } else if (tab === 'good') {
    main = report.goodToInvest
    good = report.goodInvestmentsBasedOnGoodRecommendation
    bad = report.badInvestmentsBasedOnGoodRecommendation
    probability = report.goodInvestmentProbabilityBasedOnGoodToday != null
      ? Number(report.goodInvestmentProbabilityBasedOnGoodToday) * 100 : null
  } else {
    main = report.riskyToInvest
    good = report.goodInvestmentsBasedOnRiskyRecommendation
    bad = report.badInvestmentsBasedOnRiskyRecommendation
    probability = report.goodInvestmentProbabilityBasedOnRiskyToday != null
      ? Number(report.goodInvestmentProbabilityBasedOnRiskyToday) * 100 : null
  }

  const morningMap = Object.fromEntries(main.map(s => [s.symbol, Number(s.changePercent ?? 0)]))

  const label = tab === 'best' ? 'Best' : tab === 'good' ? 'Good' : 'Risky'

  if (!main.length) {
    return <div className={styles.empty}>No stocks found for today. Data may not be loaded yet.</div>
  }

  return (
    <div className={styles.tabContent}>
      <StockTable title={`${label} to invest today`} stocks={main} />
      {good.length > 0 && (
        <>
          {probability != null && (
            <div className={styles.probability}>
              Probability of good investment today: <strong>{probability.toFixed(1)}%</strong>
            </div>
          )}
          <StockTable
            title="Good investments based on recommendations"
            stocks={good}
            morningMap={morningMap}
          />
          <StockTable
            title="Bad investments based on recommendations"
            stocks={bad}
            morningMap={morningMap}
          />
        </>
      )}
    </div>
  )
}

export function StockReportPage() {
  const { showSuccess, showError } = useNotification()
  const [strategies, setStrategies] = useState<string[]>([])
  const [strategy, setStrategy] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<StockReportDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState<'morning' | 'evening' | null>(null)
  const [tab, setTab] = useState<Tab>('best')
  const loadRef = useRef(0)

  useEffect(() => {
    stockReportApi.getStrategies()
      .then(res => {
        const list: string[] = res.data
        setStrategies(list)
        if (list.length) setStrategy(list[0])
      })
      .catch(() => showError('Failed to load strategies'))
  }, [])

  useEffect(() => {
    if (!strategy) return
    const id = ++loadRef.current
    setLoading(true)
    stockReportApi.getReport(date, strategy)
      .then(res => { if (loadRef.current === id) setReport(res.data) })
      .catch(() => showError('Failed to load report'))
      .finally(() => { if (loadRef.current === id) setLoading(false) })
  }, [date, strategy])

  const trigger = (type: 'morning' | 'evening') => {
    setTriggering(type)
    const fn = type === 'morning' ? stockReportApi.triggerMorning : stockReportApi.triggerEvening
    fn()
      .then(() => showSuccess(`${type === 'morning' ? 'Morning' : 'Evening'} report generation started`))
      .catch(() => showError('Failed to trigger report'))
      .finally(() => setTriggering(null))
  }

  const totalProb = report?.goodInvestmentTotalProbabilityBasedOnToday != null
    ? Number(report.goodInvestmentTotalProbabilityBasedOnToday) * 100 : null

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <button
          className={`${styles.toolBtn} ${styles.primary}`}
          onClick={() => trigger('morning')}
          disabled={triggering != null}
        >
          {triggering === 'morning' ? 'Loading...' : 'Trigger Morning'}
        </button>
        <button
          className={`${styles.toolBtn} ${styles.warning}`}
          onClick={() => trigger('evening')}
          disabled={triggering != null}
        >
          {triggering === 'evening' ? 'Loading...' : 'Trigger Evening'}
        </button>
        <select
          className={styles.select}
          value={strategy}
          onChange={e => setStrategy(e.target.value)}
        >
          {strategies.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="date"
          className={styles.dateInput}
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {totalProb != null && (
        <div className={styles.totalProb}>
          Total probability of good investment today: <strong>{totalProb.toFixed(1)}%</strong>
        </div>
      )}

      <div className={styles.innerTabRow}>
        {(['best', 'good', 'risky'] as Tab[]).map(t => (
          <button
            key={t}
            className={`${styles.innerTabBtn} ${tab === t ? styles.innerTabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'best' ? 'Best' : t === 'good' ? 'Good' : 'Risky'} to invest today
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.empty}>Loading...</div>}
        {!loading && !report && <div className={styles.empty}>Select a strategy and date to load report</div>}
        {!loading && report && <TabContent report={report} tab={tab} />}
      </div>
    </div>
  )
}
