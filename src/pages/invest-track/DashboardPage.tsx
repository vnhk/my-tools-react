import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  investDashboardApi, recommendationsApi,
  type DashboardData, type DashboardKpi, type TimeSeriesPoint, type WalletTimeSeriesEntry,
  type InvestmentRecommendation,
} from '../../api/investments'
import { CustomSelect } from '../../components/fields/CustomSelect'
import styles from './DashboardPage.module.css'

// ── helpers ───────────────────────────────────────────────────────────────────

const PLN = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(v)

const PCT = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

const QUICK_FILTERS = ['MTD', 'YTD', '1Y', '3Y', '5Y', 'ALL'] as const
type Filter = typeof QUICK_FILTERS[number]

const INNER_TABS = ['Dashboard', 'Balance', 'Earnings', 'FIRE', 'Short Term Strategies'] as const
type InnerTab = typeof INNER_TABS[number]

type PeriodAgg = 'Monthly' | 'Two-Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly'
const PERIOD_OPTS: PeriodAgg[] = ['Monthly', 'Two-Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']
const AGG_OPTS = ['All Wallets', 'One Wallet'] as const
type AggMode = typeof AGG_OPTS[number]

const FIRE_STAGE_PCTS = [1, 2, 5, 10, 25, 35, 50, 60, 70, 75, 80, 100]
const FIRE_STAGE_NAMES = [
  'Initial Spark', 'First Milestone', 'Early Growth', 'Momentum Phase',
  'Quarter Mark', 'Steady Path', 'Halfway There', 'Comfort Zone',
  'Strong Position', 'Three-Quarters Mark', 'Lean FIRE', 'Full FIRE',
]

function applyDateRange(series: TimeSeriesPoint[], from: string, to: string): TimeSeriesPoint[] {
  return series.filter(p => (!from || p.date >= from) && (!to || p.date <= to))
}

function applyPeriodAgg(series: TimeSeriesPoint[], period: PeriodAgg): TimeSeriesPoint[] {
  if (period === 'Monthly' || series.length === 0) return series
  const step = period === 'Two-Monthly' ? 2 : period === 'Quarterly' ? 3 : period === 'Half-Yearly' ? 6 : 12
  const result: TimeSeriesPoint[] = []
  for (let i = 0; i < series.length; i++) {
    if (i % step === 0) result.push(series[i])
  }
  const last = series[series.length - 1]
  if (result[result.length - 1] !== last) result.push(last)
  return result
}

function aggregateAllWallets(walletSeries: WalletTimeSeriesEntry[]): WalletTimeSeriesEntry {
  const allDatesSet = new Set<string>()
  for (const w of walletSeries) w.series.forEach(p => allDatesSet.add(p.date))
  const allDates = [...allDatesSet].sort()
  const aggregated: TimeSeriesPoint[] = allDates.map(date => {
    let totalBalance = 0, totalCumDeposit = 0
    for (const w of walletSeries) {
      const pts = w.series.filter(p => p.date <= date)
      if (pts.length > 0) {
        const last = pts[pts.length - 1]
        totalBalance += last.balance
        totalCumDeposit += last.cumDeposit
      }
    }
    return { date, balance: totalBalance, cumDeposit: totalCumDeposit }
  })
  const last = aggregated[aggregated.length - 1]
  const returnRate = last && last.cumDeposit > 0
    ? ((last.balance - last.cumDeposit) / last.cumDeposit) * 100 : 0
  return {
    walletId: 'aggregated',
    walletName: `Aggregated Wallet (${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%)`,
    isInvestment: true,
    returnRate,
    series: aggregated,
  }
}

function filterSeries(series: TimeSeriesPoint[], filter: Filter): TimeSeriesPoint[] {
  if (!series.length) return series
  const now = new Date()
  const cutoff: Date = (() => {
    switch (filter) {
      case 'MTD': return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'YTD': return new Date(now.getFullYear(), 0, 1)
      case '1Y':  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      case '3Y':  return new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())
      case '5Y':  return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
      default:    return new Date(0)
    }
  })()
  return series.filter((p) => new Date(p.date) >= cutoff)
}

// ── FIRE maths ────────────────────────────────────────────────────────────────

function futureValue(current: number, monthly: number, rate: number, months: number): number {
  if (Math.abs(rate) < 1e-12) return current + monthly * months
  const factor = Math.pow(1 + rate, months)
  return current * factor + monthly * ((factor - 1) / rate)
}

function computeMonthlyReturn(balance: number, deposits: number, monthsSpan: number): number {
  if (deposits <= 0 || balance <= 0 || monthsSpan <= 0) return 0
  const years = monthsSpan / 12
  const multiplier = balance / deposits
  const annualReturn = Math.pow(multiplier, 1 / years) - 1
  const realAnnualReturn = (1 + annualReturn) / 1.038 - 1
  return Math.pow(1 + realAnnualReturn, 1 / 12) - 1
}

function estimateMonthsToTarget(
  investCurrent: number, savingsCurrent: number,
  monthlyInvest: number, monthlySavings: number,
  monthlyReturn: number, target: number,
): number {
  if (investCurrent + savingsCurrent >= target) return 0
  let low = 0, high = 1200
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2
    const fv = futureValue(investCurrent, monthlyInvest, monthlyReturn, mid)
              + savingsCurrent + monthlySavings * mid
    if (fv >= target) high = mid
    else low = mid
  }
  const fv = futureValue(investCurrent, monthlyInvest, monthlyReturn, high)
            + savingsCurrent + monthlySavings * high
  return fv < target - 0.5 ? Infinity : high
}

function formatMonths(months: number): string {
  if (!isFinite(months) || months > 1200) return 'Long term'
  const m = Math.ceil(months)
  if (m <= 0) return '—'
  const yrs = Math.floor(m / 12)
  const rem = m % 12
  if (yrs > 0 && rem > 0) return `${yrs} yr ${rem} mos`
  if (yrs > 0) return `${yrs} yr`
  return `${rem} mos`
}

function computeFireChartData(
  investBalance: number, savingsBalance: number,
  monthlyInvest: number, monthlySavings: number,
  monthlyReturn: number, yearsToProject: number,
) {
  const invest80 = monthlyInvest * 0.8
  const invest120 = monthlyInvest * 1.2

  return Array.from({ length: yearsToProject + 1 }, (_, y) => {
    const n = y * 12
    const savingsFV = savingsBalance + monthlySavings * n
    return {
      year: y,
      Baseline: Math.round(futureValue(investBalance, monthlyInvest, monthlyReturn, n) + savingsFV),
      'Plus 20%': Math.round(futureValue(investBalance, invest120, monthlyReturn, n) + savingsFV),
      'Minus 20%': Math.round(futureValue(investBalance, invest80, monthlyReturn, n) + savingsFV),
      'Only Deposits': Math.round(investBalance + savingsBalance + (monthlyInvest + monthlySavings) * n),
    }
  })
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: 'positive' | 'negative' | null
}) {
  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={[styles.kpiValue, trend ? styles[trend] : ''].join(' ')}>{value}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  )
}

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', fontSize: 12 }}>
          {p.name}: {PLN(p.value)}
        </p>
      ))}
    </div>
  )
}

function FilterRow({ filter, onChange }: { filter: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className={styles.filterRow}>
      {QUICK_FILTERS.map((f) => (
        <button
          key={f}
          className={`${styles.filterBtn} ${f === filter ? styles.filterActive : ''}`}
          onClick={() => onChange(f)}
        >{f}</button>
      ))}
    </div>
  )
}

function WalletFilterPanel({
  aggMode, period, fromDate, toDate, onAggMode, onPeriod, onFromDate, onToDate,
}: {
  aggMode: AggMode; period: PeriodAgg; fromDate: string; toDate: string
  onAggMode: (v: AggMode) => void; onPeriod: (v: PeriodAgg) => void
  onFromDate: (v: string) => void; onToDate: (v: string) => void
}) {
  return (
    <div className={styles.walletFilterRow}>
      <span className={styles.walletFilterLabel}>Aggregation:</span>
      <CustomSelect
        className={styles.walletFilterSelect}
        options={AGG_OPTS.map(o => ({ value: o, label: o }))}
        value={aggMode}
        onChange={v => onAggMode(v as AggMode)}
      />
      <span className={styles.walletFilterLabel}>Period:</span>
      <CustomSelect
        className={styles.walletFilterSelect}
        options={PERIOD_OPTS.map(o => ({ value: o, label: o }))}
        value={period}
        onChange={v => onPeriod(v as PeriodAgg)}
      />
      <span className={styles.walletFilterLabel}>From:</span>
      <input type="date" className={styles.walletFilterDate} value={fromDate}
        onChange={e => onFromDate(e.target.value)} />
      <span className={styles.walletFilterLabel}>To:</span>
      <input type="date" className={styles.walletFilterDate} value={toDate}
        onChange={e => onToDate(e.target.value)} />
    </div>
  )
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#ec4899','#14b8a6']

function AllocationPie({ data }: { data: { name: string; valuePln: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data} dataKey="valuePln" nameKey="name"
          cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}
          label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
          labelLine={false}
        >
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => PLN(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function ReturnsHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const entries = Object.entries(heatmap)
  if (!entries.length) return <div className={styles.empty}>No data</div>

  const years = [...new Set(entries.map(([k]) => k.split('-')[0]))].sort()
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12']
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const map = Object.fromEntries(entries)

  const color = (v: number | undefined) => {
    if (v === undefined) return 'transparent'
    if (v > 3)  return 'rgba(34,197,94,0.85)'
    if (v > 1)  return 'rgba(34,197,94,0.5)'
    if (v > 0)  return 'rgba(34,197,94,0.25)'
    if (v > -1) return 'rgba(239,68,68,0.25)'
    if (v > -3) return 'rgba(239,68,68,0.5)'
    return 'rgba(239,68,68,0.85)'
  }

  return (
    <div className={styles.heatmap}>
      <div className={styles.heatmapGrid}>
        <div className={styles.heatmapCorner} />
        {MONTH_LABELS.map((m, i) => <div key={i} className={styles.heatmapMonthLabel}>{m}</div>)}
        {years.map((year) => (
          <>
            <div key={year} className={styles.heatmapYearLabel}>{year}</div>
            {months.map((m) => {
              const key = `${year}-${m}`
              const val = map[key]
              return (
                <div key={key} className={styles.heatmapCell} style={{ background: color(val) }}
                  title={val !== undefined ? `${key}: ${PCT(val)}` : key}>
                  {val !== undefined && <span className={styles.heatmapVal}>{val.toFixed(1)}</span>}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

interface DashboardTabProps {
  data: DashboardData
  investSeries: TimeSeriesPoint[]
  netWorthSeries: TimeSeriesPoint[]
}

function DashboardTab({ data, investSeries, netWorthSeries }: DashboardTabProps) {
  const { kpi, allocation, heatmap, budget } = data
  return (
    <>
      <section className={styles.kpiSection}>
        <h4 className={styles.sectionLabel}>Investments</h4>
        <div className={styles.kpiRow}>
          <KpiCard label="Balance" value={PLN(kpi.investBalance)} />
          <KpiCard label="Net Deposits" value={PLN(kpi.investNetDeposits)} />
          <KpiCard label="Total Return" value={PLN(kpi.investReturn)}
            sub={PCT(kpi.investReturnPct)} trend={kpi.investReturn >= 0 ? 'positive' : 'negative'} />
          <KpiCard label="Return Rate" value={PCT(kpi.investReturnPct)}
            trend={kpi.investReturnPct >= 0 ? 'positive' : 'negative'} />
          <KpiCard label="CAGR" value={PCT(kpi.investCagr)} sub="Compound Annual"
            trend={kpi.investCagr >= 0 ? 'positive' : 'negative'} />
          <KpiCard label="TWR" value={PCT(kpi.investTwr)} sub="Time-Weighted"
            trend={kpi.investTwr >= 0 ? 'positive' : 'negative'} />
        </div>
        <h4 className={styles.sectionLabel}>Savings & Net Worth</h4>
        <div className={styles.kpiRow}>
          <KpiCard label="Savings Balance" value={PLN(kpi.savingsBalance)} />
          <KpiCard label="Savings Growth" value={PLN(kpi.savingsGrowth)}
            trend={kpi.savingsGrowth >= 0 ? 'positive' : 'negative'} />
          <KpiCard label="Net Worth" value={PLN(kpi.netWorth)} />
        </div>
      </section>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Investment Portfolio: Balance vs Deposits</h3>
          {investSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={investSeries}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="balance" name="Balance" stroke="#6366f1" fill="url(#balGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b" fill="url(#depGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className={styles.empty}>Not enough data</div>}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Net Worth (All Wallets)</h3>
          {netWorthSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={netWorthSeries}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="balance" name="Net Worth" stroke="#22c55e" fill="url(#nwGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b" strokeWidth={2} dot={false} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className={styles.empty}>Not enough data</div>}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Monthly Income vs Expense (12m)</h3>
          {budget.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budget}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[2,2,0,0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={styles.empty}>No budget data</div>}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Asset Allocation</h3>
          {allocation.length > 0
            ? <AllocationPie data={allocation} />
            : <div className={styles.empty}>No wallets</div>}
        </div>

        <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
          <h3 className={styles.chartTitle}>Monthly Returns Heatmap (Investments)</h3>
          <ReturnsHeatmap heatmap={heatmap} />
        </div>
      </div>
    </>
  )
}

// ── Balance tab ───────────────────────────────────────────────────────────────

function WalletTileTitle({ w }: { w: WalletTimeSeriesEntry }) {
  const rr = w.returnRate !== 0 ? ` (${PCT(w.returnRate)})` : ''
  return <h3 className={styles.chartTitle}>{w.walletName}{rr}</h3>
}

function BalanceTab({ wallets }: { wallets: WalletTimeSeriesEntry[] }) {
  const totalBalance = wallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.balance ?? 0), 0)
  const totalDeposit = wallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.cumDeposit ?? 0), 0)

  return (
    <>
      <div className={styles.kpiRow} style={{ padding: '12px 16px 0' }}>
        <KpiCard label="Total Balance" value={PLN(totalBalance)} />
        <KpiCard label="Total Deposits" value={PLN(totalDeposit)} />
        <KpiCard label="Total Profit" value={PLN(totalBalance - totalDeposit)}
          trend={(totalBalance - totalDeposit) >= 0 ? 'positive' : 'negative'} />
      </div>
      <div className={styles.walletGrid}>
        {wallets.map(w => (
          <div key={w.walletId} className={styles.walletTile}>
            <WalletTileTitle w={w} />
            {w.series.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={w.series}>
                  <defs>
                    <linearGradient id={`bg-${w.walletId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Area type="monotone" dataKey="balance" name="Balance" stroke="#6366f1"
                    fill={`url(#bg-${w.walletId})`} strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b"
                    fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className={styles.empty} style={{ height: 80 }}>Not enough data</div>}
          </div>
        ))}
        {wallets.length === 0 && <div className={styles.empty}>No wallets</div>}
      </div>
    </>
  )
}

// ── Earnings tab ──────────────────────────────────────────────────────────────

function EarningsTab({ wallets }: { wallets: WalletTimeSeriesEntry[] }) {
  const walletsWithEarnings = wallets.map(w => ({
    ...w,
    series: w.series.map(p => ({ ...p, earnings: p.balance - p.cumDeposit })),
  }))

  const totalEarnings = wallets.reduce((s, w) => {
    const last = w.series[w.series.length - 1]
    return s + ((last?.balance ?? 0) - (last?.cumDeposit ?? 0))
  }, 0)

  return (
    <>
      <div className={styles.kpiRow} style={{ padding: '12px 16px 0' }}>
        <KpiCard label="Total Profit" value={PLN(totalEarnings)}
          trend={totalEarnings >= 0 ? 'positive' : 'negative'} />
      </div>
      <div className={styles.walletGrid}>
        {walletsWithEarnings.map(w => (
          <div key={w.walletId} className={styles.walletTile}>
            <WalletTileTitle w={w} />
            {w.series.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={w.series}>
                  <defs>
                    <linearGradient id={`eg-${w.walletId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Area type="monotone" dataKey="earnings" name="Earnings" stroke="#22c55e"
                    fill={`url(#eg-${w.walletId})`} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className={styles.empty} style={{ height: 80 }}>Not enough data</div>}
          </div>
        ))}
        {walletsWithEarnings.length === 0 && <div className={styles.empty}>No wallets</div>}
      </div>
    </>
  )
}

// ── FIRE tab ──────────────────────────────────────────────────────────────────

function FireTab({ kpi, fireGoal, onGoalChange }: {
  kpi: DashboardKpi; fireGoal: number; onGoalChange: (g: number) => void
}) {
  const savingsNetDeps = kpi.savingsBalance - kpi.savingsGrowth
  const span = Math.max(1, kpi.investMonthsSpan)
  const avgMonthlyInvest = kpi.investNetDeposits / span
  const avgMonthlySavings = savingsNetDeps / span
  const monthlyReturn = computeMonthlyReturn(kpi.investBalance, kpi.investNetDeposits, span)

  const defaultTotal = Math.ceil(avgMonthlyInvest + avgMonthlySavings)

  const [autoMode, setAutoMode] = useState(true)
  const [yearsToInvest, setYearsToInvest] = useState(5)
  const [totalMonthly, setTotalMonthly] = useState(defaultTotal)
  const [manualInvest, setManualInvest] = useState(Math.ceil(avgMonthlyInvest))
  const [manualSavings, setManualSavings] = useState(Math.ceil(avgMonthlySavings))

  const investMonthly = autoMode ? avgMonthlyInvest : manualInvest
  const savingsMonthly = autoMode ? Math.max(0, totalMonthly - avgMonthlyInvest) : manualSavings

  const chartData = useMemo(
    () => computeFireChartData(kpi.investBalance, kpi.savingsBalance, investMonthly, savingsMonthly, monthlyReturn, yearsToInvest),
    [kpi.investBalance, kpi.savingsBalance, investMonthly, savingsMonthly, monthlyReturn, yearsToInvest],
  )

  const stages = useMemo(() =>
    FIRE_STAGE_PCTS.map((pct, i) => {
      const amount = (fireGoal * pct) / 100
      const progress = amount > 0 ? Math.min(1, kpi.netWorth / amount) : 1
      const left = Math.max(0, amount - kpi.netWorth)
      const monthsEst = estimateMonthsToTarget(
        kpi.investBalance, kpi.savingsBalance, avgMonthlyInvest, avgMonthlySavings, monthlyReturn, amount,
      )
      return { name: FIRE_STAGE_NAMES[i], pct, amount, progress, left, monthsEst, achieved: left === 0 }
    }),
  [fireGoal, kpi, avgMonthlyInvest, avgMonthlySavings, monthlyReturn])

  const nextYearInvestFV = futureValue(kpi.investBalance, avgMonthlyInvest, monthlyReturn, 12)
  const nextYearSavingsFV = kpi.savingsBalance + avgMonthlySavings * 12
  const nextYearCombined = nextYearInvestFV + nextYearSavingsFV
  const nextYearPlus20 = futureValue(kpi.investBalance, avgMonthlyInvest * 1.2, monthlyReturn, 12)
                        + kpi.savingsBalance + avgMonthlySavings * 1.2 * 12

  return (
    <div className={styles.fireContainer}>

      {/* 1 — Goal editor */}
      <div className={styles.fireGoalRow}>
        <span className={styles.kpiLabel}>FIRE Goal (PLN):</span>
        <input
          type="number" className={styles.fireGoalInput}
          value={fireGoal} onChange={e => onGoalChange(Number(e.target.value))} step={50000}
        />
        <span className={styles.kpiValue}>{PLN(fireGoal)}</span>
        <span className={styles.kpiSub}>Change goal and projections update automatically.</span>
      </div>

      {/* 2 — FIRE Stages (first, main content) */}
      <div className={styles.fireCard}>
        <h3 className={styles.fireCardTitle}>FIRE Stages</h3>
        <div className={styles.stagesHeader}>
          <span>Stage</span><span>% goal</span><span>Amount</span>
          <span>How much left</span><span>How many months?</span><span>Progress</span>
        </div>
        {stages.map(s => (
          <div key={s.pct} className={`${styles.stageRow} ${s.achieved ? styles.stageAchieved : ''}`}>
            <div className={styles.stageName}>{s.name}</div>
            <div className={styles.stagePct}>{s.pct}%</div>
            <div className={styles.stageAmount}>{PLN(s.amount)}</div>
            <div className={`${styles.stageLeft} ${s.achieved ? styles.positive : ''}`}>
              {s.achieved ? 'Achieved' : PLN(s.left)}
            </div>
            <div className={styles.stageMonths}>
              {s.achieved ? '—' : formatMonths(s.monthsEst)}
            </div>
            <div className={styles.stageProgressCol}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill}
                  style={{ width: `${s.progress * 100}%`, background: s.achieved ? '#22c55e' : '#6366f1' }} />
              </div>
              <span className={styles.progressPct}>{(s.progress * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
        <div className={styles.stagesNote}>
          * Projections use historical deposits and estimated monthly return after inflation (3.8%).
          Savings counted towards goal without investment returns.
        </div>
      </div>

      {/* 3 — Goal progress and variance (chart + controls + metrics) */}
      <div className={styles.fireCard}>
        <h3 className={styles.fireCardTitle}>Goal progress and variance</h3>

        {/* 3a — Mode toggle */}
        <div className={styles.fireModeToggle}>
          <span className={styles.kpiLabel}>Mode:</span>
          <button className={`${styles.filterBtn} ${autoMode ? styles.filterActive : ''}`}
            onClick={() => setAutoMode(true)}>Auto</button>
          <button className={`${styles.filterBtn} ${!autoMode ? styles.filterActive : ''}`}
            onClick={() => setAutoMode(false)}>Manual</button>
        </div>

        {/* 3b — Chart */}
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tickFormatter={v => `Y${v}`} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
            <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
            <Tooltip formatter={(v: any) => PLN(Number(v))} labelFormatter={(l) => `Year ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={fireGoal} stroke="#f59e0b" strokeDasharray="6 3"
              label={{ value: 'FIRE Goal', fill: '#f59e0b', fontSize: 11 }} />
            <Line type="monotone" dataKey="Baseline" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Plus 20%" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="Minus 20%" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="Only Deposits" stroke="#888" strokeWidth={1} dot={false} strokeDasharray="2 3" />
          </LineChart>
        </ResponsiveContainer>

        {/* 3c — Controls: years | deposit inputs */}
        <div className={styles.fireControlsRow}>
          <div className={styles.fireInputGroup}>
            <span className={styles.kpiLabel}>How many years do you want to invest?</span>
            <input type="number" className={styles.fireGoalInput}
              value={yearsToInvest} min={1} max={30} step={1}
              onChange={e => setYearsToInvest(Math.min(30, Math.max(1, Number(e.target.value))))} />
          </div>

          {autoMode && (
            <div className={styles.fireInputGroup}>
              <span className={styles.kpiLabel}>Total monthly savings (investments + savings) (PLN):</span>
              <input type="number" className={styles.fireGoalInput}
                value={totalMonthly} min={0} step={1000}
                onChange={e => setTotalMonthly(Number(e.target.value))} />
            </div>
          )}

          {!autoMode && (
            <>
              <div className={styles.fireInputGroup}>
                <span className={styles.kpiLabel}>Total monthly savings (PLN):</span>
                <input type="number" className={styles.fireGoalInput}
                  value={totalMonthly} min={0} step={1000}
                  onChange={e => setTotalMonthly(Number(e.target.value))} />
              </div>
              <div className={styles.fireInputGroup}>
                <span className={styles.kpiLabel}>Monthly to investments (Investment + Crypto + Bonds) (PLN):</span>
                <input type="number" className={styles.fireGoalInput}
                  value={manualInvest} min={0} step={100}
                  onChange={e => setManualInvest(Number(e.target.value))} />
              </div>
              <div className={styles.fireInputGroup}>
                <span className={styles.kpiLabel}>Monthly to savings accounts (PLN):</span>
                <input type="number" className={styles.fireGoalInput}
                  value={manualSavings} min={0} step={100}
                  onChange={e => setManualSavings(Number(e.target.value))} />
              </div>
            </>
          )}
        </div>

        {/* 3d — Metric tiles */}
        <div className={styles.fireMetricRow}>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{PLN(kpi.investBalance)}</span>
            <span className={styles.metricLabel}>Investment Balance</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{PLN(kpi.savingsBalance)}</span>
            <span className={styles.metricLabel}>Savings Balance</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{PLN(kpi.netWorth)}</span>
            <span className={styles.metricLabel}>Net Worth</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{PLN(nextYearCombined)}</span>
            <span className={styles.metricLabel}>Prognosed next year net worth</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{PLN(nextYearPlus20)}</span>
            <span className={styles.metricLabel}>Prognosed next year (+20% deposit)</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{PLN(avgMonthlyInvest)}</span>
            <span className={styles.metricLabel}>Avg monthly investment deposit</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{PLN(avgMonthlySavings)}</span>
            <span className={styles.metricLabel}>Avg monthly savings deposit</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricValue}>{(monthlyReturn * 100).toFixed(3)}%</span>
            <span className={styles.metricLabel}>Monthly investment return</span>
          </div>
        </div>

        {/* 3e — Bottom info */}
        <div className={styles.fireBottomInfo}>
          Target: {PLN(fireGoal)}.
        </div>
      </div>

    </div>
  )
}

// ── Short Term Strategies tab ─────────────────────────────────────────────────

interface StrategyChartData {
  name: string
  total: number
  overallRisky: string
  overallGood: string
  overallBest: string
  series: { date: string; Best: number | null; Good: number | null; Risky: number | null }[]
}

function calcSuccessRate(recs: InvestmentRecommendation[]): string {
  const good = recs.filter(r => r.recommendationResult === 'Good').length
  const bad = recs.filter(r => r.recommendationResult === 'Bad').length
  const total = good + bad
  return total > 0 ? (good / total).toFixed(2) : '0'
}

function buildStrategyChartData(name: string, recs: InvestmentRecommendation[]): StrategyChartData {
  // Group by date
  const byDate: Record<string, InvestmentRecommendation[]> = {}
  for (const r of recs) {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r)
  }

  const series = Object.keys(byDate).sort().map(date => {
    const day = byDate[date]
    const byType: Record<string, InvestmentRecommendation[]> = {}
    for (const r of day) {
      if (!byType[r.recommendationType]) byType[r.recommendationType] = []
      byType[r.recommendationType].push(r)
    }
    const rate = (type: string) => {
      const t = byType[type]
      if (!t?.length) return null
      const g = t.filter(r => r.recommendationResult === 'Good').length
      const b = t.filter(r => r.recommendationResult === 'Bad').length
      return g + b > 0 ? g / (g + b) : null
    }
    return { date, Best: rate('Best'), Good: rate('Good'), Risky: rate('Risky') }
  })

  const byType: Record<string, InvestmentRecommendation[]> = {}
  for (const r of recs) {
    if (!byType[r.recommendationType]) byType[r.recommendationType] = []
    byType[r.recommendationType].push(r)
  }

  return {
    name,
    total: recs.length,
    overallRisky: byType['Risky'] ? calcSuccessRate(byType['Risky']) : '0',
    overallGood: byType['Good'] ? calcSuccessRate(byType['Good']) : '0',
    overallBest: byType['Best'] ? calcSuccessRate(byType['Best']) : '0',
    series,
  }
}

function PctTooltipStrategy({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p: any) => p.value != null && (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', fontSize: 12 }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

function StrategiesTab() {
  const [strategies, setStrategies] = useState<StrategyChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    recommendationsApi.getAll({ size: 10000, page: 0, sort: 'date,asc' })
      .then(res => {
        const items: InvestmentRecommendation[] = res.data.content
        const grouped: Record<string, InvestmentRecommendation[]> = {}
        for (const item of items) {
          if (!grouped[item.strategy]) grouped[item.strategy] = []
          grouped[item.strategy].push(item)
        }
        setStrategies(Object.entries(grouped).map(([name, recs]) => buildStrategyChartData(name, recs)))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Loading strategies…</div>
  if (!strategies.length) return <div className={styles.empty}>No strategy data</div>

  return (
    <div className={styles.strategyGrid}>
      {strategies.map(s => (
        <div key={s.name} className={styles.strategyCard}>
          <div className={styles.strategyHeader}>
            <span className={styles.strategyName}>{s.name}</span>
            <span className={styles.strategyOverall}>
              Risky: {s.overallRisky}, Good: {s.overallGood}, Best: {s.overallBest}
            </span>
          </div>
          {s.series.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={s.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: '#888' }} tickLine={false} />
                <Tooltip content={<PctTooltipStrategy />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Best" stroke="#22c55e" strokeWidth={1.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="Good" stroke="#6366f1" strokeWidth={1.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="Risky" stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.empty} style={{ height: 100 }}>Not enough data</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [activeTab, setActiveTab] = useState<InnerTab>('Dashboard')
  const [fireGoal, setFireGoal] = useState(1_500_000)
  const [aggMode, setAggMode] = useState<AggMode>('All Wallets')
  const [period, setPeriod] = useState<PeriodAgg>('Monthly')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    setLoading(true)
    investDashboardApi.get()
      .then((res) => {
        setData(res.data)
        const allDates = res.data.walletSeries.flatMap(w => w.series.map(p => p.date)).sort()
        if (allDates.length > 0) {
          setFromDate(allDates[0])
          setToDate(allDates[allDates.length - 1])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const investSeries = useMemo(
    () => filterSeries(data?.investTimeSeries ?? [], filter),
    [data, filter],
  )
  const netWorthSeries = useMemo(
    () => filterSeries(data?.netWorthTimeSeries ?? [], filter),
    [data, filter],
  )

  const processedWalletSeries = useMemo(() => {
    if (!data) return []
    const wallets = aggMode === 'One Wallet'
      ? [aggregateAllWallets(data.walletSeries)]
      : data.walletSeries
    return wallets.map(w => ({
      ...w,
      series: applyPeriodAgg(applyDateRange(w.series, fromDate, toDate), period),
    }))
  }, [data, aggMode, period, fromDate, toDate])

  if (loading) return <div className={styles.loading}>Loading dashboard…</div>
  if (!data) return <div className={styles.empty}>Failed to load dashboard</div>

  const showWalletFilter = activeTab === 'Balance' || activeTab === 'Earnings'

  return (
    <div className={styles.page}>
      {/* Inner tab navigation */}
      <div className={styles.innerTabRow}>
        {INNER_TABS.map((t) => (
          <button
            key={t}
            className={`${styles.innerTabBtn} ${t === activeTab ? styles.innerTabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >{t}</button>
        ))}
      </div>

      {/* Quick filter — Dashboard only */}
      {activeTab === 'Dashboard' && <FilterRow filter={filter} onChange={setFilter} />}

      {/* Wallet filter — Balance / Earnings */}
      {showWalletFilter && (
        <WalletFilterPanel
          aggMode={aggMode} period={period} fromDate={fromDate} toDate={toDate}
          onAggMode={setAggMode} onPeriod={setPeriod}
          onFromDate={setFromDate} onToDate={setToDate}
        />
      )}

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'Dashboard' && (
          <DashboardTab data={data} investSeries={investSeries} netWorthSeries={netWorthSeries} />
        )}
        {activeTab === 'Balance' && <BalanceTab wallets={processedWalletSeries} />}
        {activeTab === 'Earnings' && <EarningsTab wallets={processedWalletSeries} />}
        {activeTab === 'FIRE' && (
          <FireTab kpi={data.kpi} fireGoal={fireGoal} onGoalChange={setFireGoal} />
        )}
        {activeTab === 'Short Term Strategies' && <StrategiesTab />}
      </div>
    </div>
  )
}
