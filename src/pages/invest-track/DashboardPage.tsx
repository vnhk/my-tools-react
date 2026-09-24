import {Fragment, useEffect, useMemo, useState} from 'react'
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import {
    type DashboardData,
    type DashboardKpi,
    investDashboardApi,
    type InvestmentRecommendation,
    recommendationsApi,
    type TimeSeriesPoint,
    type WalletTimeSeriesEntry,
} from '../../api/investments'
import {CustomSelect} from '../../components/fields/CustomSelect'
import styles from './DashboardPage.module.css'

// ── helpers ───────────────────────────────────────────────────────────────────

const PLN = (v: number) =>
    new Intl.NumberFormat('pl-PL', {style: 'currency', currency: 'PLN', maximumFractionDigits: 0}).format(v)

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

function addMonthsToDate(dateStr: string, months: number): string {
    const parts = dateStr.split('-').map(Number)
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const year = parts[0]
        const month = parts[1] - 1
        const day = parts[2] || 1
        const d = new Date(year, month + months, day)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${dd}`
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    d.setMonth(d.getMonth() + months)
    return d.toISOString().slice(0, 10)
}

function applyPeriodAgg(series: TimeSeriesPoint[], period: PeriodAgg): TimeSeriesPoint[] {
    if (period === 'Monthly' || series.length <= 2) return series
    const stepMonths = period === 'Two-Monthly' ? 2 : period === 'Quarterly' ? 3 : period === 'Half-Yearly' ? 6 : 12

    const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date))
    const result: TimeSeriesPoint[] = []

    // 1. Pick first point
    result.push(sorted[0])
    let lastPickedDate = sorted[0].date
    let targetNextDate = addMonthsToDate(lastPickedDate, stepMonths)

    // 2. Pick next point that is >= targetNextDate
    for (let i = 1; i < sorted.length - 1; i++) {
        if (sorted[i].date >= targetNextDate) {
            result.push(sorted[i])
            lastPickedDate = sorted[i].date
            targetNextDate = addMonthsToDate(lastPickedDate, stepMonths)
        }
    }

    // 3. Always include last point if different
    const last = sorted[sorted.length - 1]
    if (result[result.length - 1].date !== last.date) {
        result.push(last)
    }
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
        return {date, balance: totalBalance, cumDeposit: totalCumDeposit}
    })
    const last = aggregated[aggregated.length - 1]
    const returnRate = last && last.cumDeposit > 0
        ? ((last.balance - last.cumDeposit) / last.cumDeposit) * 100 : 0
    return {
        walletId: 'aggregated',
        walletName: 'Aggregated Wallet',
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
            case 'MTD':
                return new Date(now.getFullYear(), now.getMonth(), 1)
            case 'YTD':
                return new Date(now.getFullYear(), 0, 1)
            case '1Y':
                return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            case '3Y':
                return new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())
            case '5Y':
                return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
            default:
                return new Date(0)
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

function computeMonthlyReturn(balance: number, deposits: number, monthsSpan: number, investTwr?: number): number {
    const years = monthsSpan / 12
    if (years > 0 && investTwr != null && !isNaN(investTwr) && investTwr !== 0) {
        const twrDec = investTwr / 100
        if (twrDec > -1) {
            const annualReturn = Math.pow(1 + twrDec, 1 / years) - 1
            return Math.pow(1 + annualReturn, 1 / 12) - 1
        }
    }
    if (deposits <= 0 || balance <= 0 || monthsSpan <= 0) return 0
    const multiplier = balance / deposits
    const annualReturn = Math.pow(multiplier, 1 / years) - 1
    return Math.pow(1 + annualReturn, 1 / 12) - 1
}

function estimateMonthsToTarget(
    investCurrent: number, savingsCurrent: number,
    monthlyInvest: number, monthlySavings: number,
    monthlyReturn: number, savingsMonthlyReturn: number, target: number,
): number {
    if (investCurrent + savingsCurrent >= target) return 0
    let low = 0, high = 1200
    for (let i = 0; i < 80; i++) {
        const mid = (low + high) / 2
        const fv = futureValue(investCurrent, monthlyInvest, monthlyReturn, mid)
            + futureValue(savingsCurrent, monthlySavings, savingsMonthlyReturn, mid)
        if (fv >= target) high = mid
        else low = mid
    }
    const fv = futureValue(investCurrent, monthlyInvest, monthlyReturn, high)
        + futureValue(savingsCurrent, monthlySavings, savingsMonthlyReturn, high)
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
    investBalance: number,
    savingsBalance: number,
    monthlyInvest: number,
    savingsMonthly: number,
    monthlyReturn: number,
    savingsMonthlyReturn: number,
    yearsToProject: number,
    historicalSeries?: TimeSeriesPoint[],
) {
    const invest80 = monthlyInvest * 0.8
    const invest120 = monthlyInvest * 1.2
    const currentNetWorth = Math.round(investBalance + savingsBalance)

    const points: Array<{
        label: string
        isProjection?: boolean
        'Actual Net Worth'?: number | null
        'Actual Deposits'?: number | null
        Baseline?: number | null
        'Plus 20%'?: number | null
        'Minus 20%'?: number | null
        'Only Deposits'?: number | null
    }> = []

    // Sample historical points to Half-Yearly so historical data isn't overcrowded with dense monthly points
    const sampledHistorical = historicalSeries && historicalSeries.length > 0
        ? applyPeriodAgg(historicalSeries, 'Half-Yearly')
        : []

    let lastDateStr = ''
    if (sampledHistorical.length > 0) {
        const histPoints = sampledHistorical.slice(0, sampledHistorical.length - 1)
        for (const p of histPoints) {
            points.push({
                label: p.date,
                isProjection: false,
                'Actual Net Worth': Math.round(p.balance),
                'Actual Deposits': Math.round(p.cumDeposit),
                Baseline: null,
                'Plus 20%': null,
                'Minus 20%': null,
                'Only Deposits': null,
            })
        }
        lastDateStr = sampledHistorical[sampledHistorical.length - 1].date
    }

    const todayLabel = lastDateStr ? `Today (${lastDateStr})` : 'Today'
    const lastPoint = sampledHistorical.length > 0 ? sampledHistorical[sampledHistorical.length - 1] : null
    const actualNetWorthToday = lastPoint ? Math.round(lastPoint.balance) : currentNetWorth
    const actualDepositsToday = lastPoint ? Math.round(lastPoint.cumDeposit) : null

    points.push({
        label: todayLabel,
        isProjection: false,
        'Actual Net Worth': actualNetWorthToday,
        'Actual Deposits': actualDepositsToday,
        Baseline: currentNetWorth,
        'Plus 20%': currentNetWorth,
        'Minus 20%': currentNetWorth,
        'Only Deposits': currentNetWorth,
    })

    const baseYear = lastDateStr ? parseInt(lastDateStr.substring(0, 4), 10) || new Date().getFullYear() : new Date().getFullYear()

    for (let y = 1; y <= yearsToProject; y++) {
        const n = y * 12
        const savingsFV = futureValue(savingsBalance, savingsMonthly, savingsMonthlyReturn, n)
        const yearLabel = `+${y}y (${baseYear + y})`

        points.push({
            label: yearLabel,
            isProjection: true,
            'Actual Net Worth': null,
            'Actual Deposits': null,
            Baseline: Math.round(futureValue(investBalance, monthlyInvest, monthlyReturn, n) + savingsFV),
            'Plus 20%': Math.round(futureValue(investBalance, invest120, monthlyReturn, n) + savingsFV),
            'Minus 20%': Math.round(futureValue(investBalance, invest80, monthlyReturn, n) + savingsFV),
            'Only Deposits': Math.round(investBalance + savingsBalance + (monthlyInvest + savingsMonthly) * n),
        })
    }

    return { data: points, todayLabel }
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function KpiCard({label, value, sub, trend, info}: {
    label: string; value: string; sub?: string; trend?: 'positive' | 'negative' | null; info?: string
}) {
    return (
        <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>
                {label}
                {info && (
                    <span className={styles.kpiInfoIcon} title={info} tabIndex={0} aria-label={info}>
                        i
                    </span>
                )}
            </span>
            <span className={[styles.kpiValue, trend ? styles[trend] : ''].join(' ')}>{value}</span>
            {sub && <span className={styles.kpiSub}>{sub}</span>}
        </div>
    )
}

function CurrencyTooltip({active, payload, label}: any) {
    if (!active || !payload?.length) return null
    return (
        <div className={styles.tooltip}>
            <p className={styles.tooltipLabel}>{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{color: p.color, margin: '2px 0', fontSize: 12}}>
                    {p.name}: {PLN(p.value)}
                </p>
            ))}
        </div>
    )
}

function FilterRow({filter, onChange}: { filter: Filter; onChange: (f: Filter) => void }) {
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
                               allWallets, selectedWalletIds, onChangeSelectedWallets,
                           }: {
    aggMode: AggMode; period: PeriodAgg; fromDate: string; toDate: string
    onAggMode: (v: AggMode) => void; onPeriod: (v: PeriodAgg) => void
    onFromDate: (v: string) => void; onToDate: (v: string) => void
    allWallets: WalletTimeSeriesEntry[]
    selectedWalletIds: Set<string>
    onChangeSelectedWallets: (ids: Set<string>) => void
}) {
    return (
        <>
            <div className={styles.walletFilterRow}>
                <span className={styles.walletFilterLabel}>Aggregation:</span>
                <CustomSelect
                    className={styles.walletFilterSelect}
                    options={AGG_OPTS.map(o => ({value: o, label: o}))}
                    value={aggMode}
                    onChange={v => onAggMode(v as AggMode)}
                />
                <span className={styles.walletFilterLabel}>Period:</span>
                <CustomSelect
                    className={styles.walletFilterSelect}
                    options={PERIOD_OPTS.map(o => ({value: o, label: o}))}
                    value={period}
                    onChange={v => onPeriod(v as PeriodAgg)}
                />
                <span className={styles.walletFilterLabel}>From:</span>
                <input type="date" className={styles.walletFilterDate} value={fromDate}
                       onChange={e => onFromDate(e.target.value)}/>
                <span className={styles.walletFilterLabel}>To:</span>
                <input type="date" className={styles.walletFilterDate} value={toDate}
                       onChange={e => onToDate(e.target.value)}/>
            </div>
            <div className={styles.walletSelectionRow}>
                <span className={styles.walletFilterLabel}>Include Wallets:</span>
                {allWallets.map(w => {
                    const checked = selectedWalletIds.has(w.walletId)
                    return (
                        <label key={w.walletId} className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                    const copy = new Set(selectedWalletIds)
                                    if (checked) {
                                        if (copy.size > 1) copy.delete(w.walletId)
                                    } else {
                                        copy.add(w.walletId)
                                    }
                                    onChangeSelectedWallets(copy)
                                }}
                            />
                            <span>{w.walletName}</span>
                        </label>
                    )
                })}
            </div>
        </>
    )
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6']

function AllocationPie({data}: { data: { name: string; valuePln: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <PieChart>
                <Pie
                    data={data} dataKey="valuePln" nameKey="name"
                    cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}
                    label={({name, percent}) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                    labelLine={false}
                    isAnimationActive={false}
                >
                    {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v) => PLN(Number(v))}/>
            </PieChart>
        </ResponsiveContainer>
    )
}

function ReturnsHeatmap({heatmap}: { heatmap: Record<string, number> }) {
    const entries = Object.entries(heatmap)
    if (!entries.length) return <div className={styles.empty}>No data</div>

    const years = [...new Set(entries.map(([k]) => k.split('-')[0]))].sort()
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const map = Object.fromEntries(entries)

    const color = (v: number | undefined) => {
        if (v === undefined) return 'transparent'
        if (v > 3) return 'rgba(34,197,94,0.85)'
        if (v > 1) return 'rgba(34,197,94,0.5)'
        if (v > 0) return 'rgba(34,197,94,0.25)'
        if (v > -1) return 'rgba(239,68,68,0.25)'
        if (v > -3) return 'rgba(239,68,68,0.5)'
        return 'rgba(239,68,68,0.85)'
    }

    return (
        <div className={styles.heatmap}>
            <div className={styles.heatmapGrid}>
                <div className={styles.heatmapCorner}/>
                {MONTH_LABELS.map((m, i) => <div key={i} className={styles.heatmapMonthLabel}>{m}</div>)}
                {years.map((year) => (
                    <Fragment key={year}>
                        <div className={styles.heatmapYearLabel}>{year}</div>
                        {months.map((m) => {
                            const k = `${year}-${m}`
                            const val = map[k]
                            return (
                                <div key={k} className={styles.heatmapCell} style={{background: color(val)}}
                                     title={val !== undefined ? `${k}: ${PCT(val)}` : k}>
                                    {val !== undefined && <span className={styles.heatmapVal}>{val.toFixed(1)}</span>}
                                </div>
                            )
                        })}
                    </Fragment>
                ))}
            </div>
        </div>
    )
}

interface DashboardTabProps {
    data: DashboardData
    investSeries: TimeSeriesPoint[]
    netWorthSeries: TimeSeriesPoint[]
    ppkSeries: TimeSeriesPoint[]
    investFundSeries: TimeSeriesPoint[]
    showSp500: boolean
    showWig20: boolean
    showNasdaq: boolean
    showDji: boolean
    showBankFixed3_5: boolean
}

function DashboardTab({
                          data,
                          investSeries,
                          netWorthSeries,
                          ppkSeries,
                          investFundSeries,
                          showSp500,
                          showWig20,
                          showNasdaq,
                          showDji,
                          showBankFixed3_5
                      }: DashboardTabProps) {
    const {kpi, allocation, heatmap, budget} = data
    return (
        <>
            <section className={styles.kpiSection}>
                <h4 className={styles.sectionLabel}>Investments</h4>
                <div className={styles.kpiRow}>
                    <KpiCard label="Balance" value={PLN(kpi.investBalance)}/>
                    <KpiCard label="Net Deposits" value={PLN(kpi.investNetDeposits)}/>
                    <KpiCard label="Total Return" value={PLN(kpi.investReturn)}
                             sub={PCT(kpi.investReturnPct)} trend={kpi.investReturn >= 0 ? 'positive' : 'negative'}
                             info="Total return from investment wallets only (stocks, bonds, crypto, funds, PPK). Excludes savings accounts and cash."/>
                    <KpiCard label="Return Rate" value={PCT(kpi.investReturnPct)}
                             trend={kpi.investReturnPct >= 0 ? 'positive' : 'negative'}
                             info="Return rate from investment wallets only."/>
                    <KpiCard label="CAGR" value={PCT(kpi.investCagr)} sub="Compound Annual"
                             trend={kpi.investCagr >= 0 ? 'positive' : 'negative'}/>
                    <KpiCard label="TWR" value={PCT(kpi.investTwr)} sub="Time-Weighted"
                             trend={kpi.investTwr >= 0 ? 'positive' : 'negative'}/>
                </div>
                <h4 className={styles.sectionLabel}>Savings & Net Worth</h4>
                <div className={styles.kpiRow}>
                    <KpiCard label="Savings Balance" value={PLN(kpi.savingsBalance)}/>
                    <KpiCard label="Savings Growth" value={PLN(kpi.savingsGrowth)}
                             trend={kpi.savingsGrowth >= 0 ? 'positive' : 'negative'}
                             info="Interest and growth accumulated on savings accounts and fixed deposits."/>
                    <KpiCard label="Savings Return Rate" value={PCT(kpi.savingsReturnPct ?? 0)}
                             trend={(kpi.savingsReturnPct ?? 0) >= 0 ? 'positive' : 'negative'}
                             info="Return rate from savings accounts and cash."/>
                    <KpiCard label="Savings CAGR" value={PCT(kpi.savingsCagr ?? 0)} sub="Compound Annual"
                             trend={(kpi.savingsCagr ?? 0) >= 0 ? 'positive' : 'negative'}
                             info="Compound Annual Growth Rate of savings accounts."/>
                    <KpiCard label="Savings TWR" value={PCT(kpi.savingsTwr ?? 0)} sub="Time-Weighted"
                             trend={(kpi.savingsTwr ?? 0) >= 0 ? 'positive' : 'negative'}
                             info="Time-Weighted Return for savings accounts."/>
                    <KpiCard label="Net Worth" value={PLN(kpi.netWorth)}/>
                </div>
            </section>

            <div className={styles.chartGrid}>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Investment Portfolio: Balance vs Deposits</h3>
                    {investSeries.length > 1 ? (
                        <ResponsiveContainer width="100%" height={260} minWidth={0}>
                            <AreaChart data={investSeries} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                <XAxis dataKey="date" tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                       tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <Tooltip content={<CurrencyTooltip/>}/>
                                <Legend wrapperStyle={{fontSize: 12}}/>
                                <Area type="monotone" dataKey="balance" name="Balance" stroke="#6366f1"
                                      fill="url(#balGrad)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b"
                                      fill="url(#depGrad)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                {showSp500 && <Line type="monotone" dataKey="sp500" name="S&P 500" stroke="#ec4899"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showBankFixed3_5 &&
                                    <Line type="monotone" dataKey="fixedDeposit3_5" name="Fixed Deposit 3.5%"
                                          stroke="#d7f63b"
                                          strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showWig20 && <Line type="monotone" dataKey="wig20" name="WIG20" stroke="#3b82f6"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showNasdaq && <Line type="monotone" dataKey="nasdaq" name="NASDAQ-100" stroke="#06b6d4"
                                                     strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showDji && <Line type="monotone" dataKey="dji" name="Dow Jones" stroke="#a855f7"
                                                  strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className={styles.empty}>Not enough data</div>}
                </div>

                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Net Worth (All Wallets)</h3>
                    {netWorthSeries.length > 1 ? (
                        <ResponsiveContainer width="100%" height={260} minWidth={0}>
                            <AreaChart data={netWorthSeries} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                <XAxis dataKey="date" tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                       tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <Tooltip content={<CurrencyTooltip/>}/>
                                <Legend wrapperStyle={{fontSize: 12}}/>
                                <Area type="monotone" dataKey="balance" name="Net Worth" stroke="#22c55e"
                                      fill="url(#nwGrad)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b"
                                      strokeWidth={2} dot={false} fill="none" isAnimationActive={false} connectNulls/>
                                {showSp500 && <Line type="monotone" dataKey="sp500" name="S&P 500" stroke="#ec4899"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showWig20 && <Line type="monotone" dataKey="wig20" name="WIG20" stroke="#3b82f6"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showBankFixed3_5 &&
                                    <Line type="monotone" dataKey="fixedDeposit3_5" name="Fixed Bank Deposit 3.5%"
                                          stroke="#d7f63b"
                                          strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showNasdaq && <Line type="monotone" dataKey="nasdaq" name="NASDAQ-100" stroke="#06b6d4"
                                                     strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showDji && <Line type="monotone" dataKey="dji" name="Dow Jones" stroke="#a855f7"
                                                  strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className={styles.empty}>Not enough data</div>}
                </div>

                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>PPK: Balance vs Deposits</h3>
                    {ppkSeries.length > 1 ? (
                        <ResponsiveContainer width="100%" height={260} minWidth={0}>
                            <AreaChart data={ppkSeries} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="ppkBalGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="ppkDepGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                <XAxis dataKey="date" tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                       tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <Tooltip content={<CurrencyTooltip/>}/>
                                <Legend wrapperStyle={{fontSize: 12}}/>
                                <Area type="monotone" dataKey="balance" name="Balance" stroke="#06b6d4"
                                      fill="url(#ppkBalGrad)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b"
                                      fill="url(#ppkDepGrad)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                {showSp500 && <Line type="monotone" dataKey="sp500" name="S&P 500" stroke="#ec4899"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showBankFixed3_5 &&
                                    <Line type="monotone" dataKey="fixedDeposit3_5" name="Fixed Deposit 3.5%"
                                          stroke="#d7f63b"
                                          strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showWig20 && <Line type="monotone" dataKey="wig20" name="WIG20" stroke="#3b82f6"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showNasdaq && <Line type="monotone" dataKey="nasdaq" name="NASDAQ-100" stroke="#06b6d4"
                                                     strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showDji && <Line type="monotone" dataKey="dji" name="Dow Jones" stroke="#a855f7"
                                                  strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className={styles.empty}>Not enough data</div>}
                </div>

                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Investment Funds: Balance vs Deposits</h3>
                    {investFundSeries.length > 1 ? (
                        <ResponsiveContainer width="100%" height={260} minWidth={0}>
                            <AreaChart data={investFundSeries} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="fundBalGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="fundDepGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                <XAxis dataKey="date" tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                       tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <Tooltip content={<CurrencyTooltip/>}/>
                                <Legend wrapperStyle={{fontSize: 12}}/>
                                <Area type="monotone" dataKey="balance" name="Balance" stroke="#a855f7"
                                      fill="url(#fundBalGrad)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b"
                                      fill="url(#fundDepGrad)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                {showSp500 && <Line type="monotone" dataKey="sp500" name="S&P 500" stroke="#ec4899"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showBankFixed3_5 &&
                                    <Line type="monotone" dataKey="fixedDeposit3_5" name="Fixed Deposit 3.5%"
                                          stroke="#d7f63b"
                                          strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showWig20 && <Line type="monotone" dataKey="wig20" name="WIG20" stroke="#3b82f6"
                                                    strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showNasdaq && <Line type="monotone" dataKey="nasdaq" name="NASDAQ-100" stroke="#06b6d4"
                                                     strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                {showDji && <Line type="monotone" dataKey="dji" name="Dow Jones" stroke="#a855f7"
                                                  strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className={styles.empty}>Not enough data</div>}
                </div>

                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Monthly Income vs Expense (12m)</h3>
                    {budget.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260} minWidth={0}>
                            <BarChart data={budget} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                <XAxis dataKey="month" tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                       tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                                <Tooltip content={<CurrencyTooltip/>}/>
                                <Legend wrapperStyle={{fontSize: 12}}/>
                                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[2, 2, 0, 0]} isAnimationActive={false}/>
                                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[2, 2, 0, 0]} isAnimationActive={false}/>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className={styles.empty}>No budget data</div>}
                </div>

                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Asset Allocation</h3>
                    {allocation.length > 0
                        ? <AllocationPie data={allocation}/>
                        : <div className={styles.empty}>No wallets</div>}
                </div>

                <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
                    <h3 className={styles.chartTitle}>Monthly Returns Heatmap (Investments)</h3>
                    <ReturnsHeatmap heatmap={heatmap}/>
                </div>
            </div>
        </>
    )
}

// ── Balance tab ───────────────────────────────────────────────────────────────

function WalletTileTitle({w}: { w: WalletTimeSeriesEntry }) {
    const rr = w.returnRate !== 0 ? ` (${PCT(w.returnRate)})` : ''
    return <h3 className={styles.chartTitle}>{w.walletName}{rr}</h3>
}

function BalanceTab({wallets, showSp500, showWig20, showNasdaq, showDji, showBankFixed3_5}: {
    wallets: WalletTimeSeriesEntry[]
    showSp500: boolean
    showWig20: boolean
    showNasdaq: boolean
    showDji: boolean
    showBankFixed3_5: boolean
}) {
    const totalBalance = wallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.balance ?? 0), 0)
    const totalDeposit = wallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.cumDeposit ?? 0), 0)
    const totalProfit = totalBalance - totalDeposit
    const totalReturnPct = totalDeposit > 0 ? (totalProfit / totalDeposit) * 100 : 0

    const investWallets = wallets.filter(w => w.isInvestment)
    const savingsWallets = wallets.filter(w => !w.isInvestment)

    const investBalance = investWallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.balance ?? 0), 0)
    const investDeposit = investWallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.cumDeposit ?? 0), 0)
    const investProfit = investBalance - investDeposit
    const investReturnPct = investDeposit > 0 ? (investProfit / investDeposit) * 100 : 0

    const savingsBalance = savingsWallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.balance ?? 0), 0)
    const savingsDeposit = savingsWallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.cumDeposit ?? 0), 0)
    const savingsProfit = savingsBalance - savingsDeposit
    const savingsReturnPct = savingsDeposit > 0 ? (savingsProfit / savingsDeposit) * 100 : 0

    return (
        <>
            <div className={styles.kpiRow} style={{padding: '12px 16px 0'}}>
                <KpiCard label="Total Balance" value={PLN(totalBalance)}/>
                <KpiCard label="Total Deposits" value={PLN(totalDeposit)}/>
                <KpiCard label="Total Profit" value={PLN(totalProfit)}
                         sub={PCT(totalReturnPct)}
                         trend={totalProfit >= 0 ? 'positive' : 'negative'}
                         info="Combined profit from all wallets (both investment returns and savings accounts interest/growth)."/>
                <KpiCard label="Investments Return Rate" value={PCT(investReturnPct)}
                         sub={PLN(investProfit)}
                         trend={investReturnPct >= 0 ? 'positive' : 'negative'}
                         info="Profit rate and nominal return from investment wallets only."/>
                <KpiCard label="Savings Return Rate" value={PCT(savingsReturnPct)}
                         sub={PLN(savingsProfit)}
                         trend={savingsReturnPct >= 0 ? 'positive' : 'negative'}
                         info="Interest rate and growth from savings and cash wallets only."/>
            </div>
            <div className={styles.walletGrid}>
                {wallets.map(w => (
                    <div key={w.walletId} className={styles.walletTile}>
                        <WalletTileTitle w={w}/>
                        {w.series.length > 1 ? (
                            <ResponsiveContainer width="100%" height={180} minWidth={0}>
                                <AreaChart data={w.series} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`bg-${w.walletId}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#888'}} tickLine={false}/>
                                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                           tick={{fontSize: 10, fill: '#888'}} tickLine={false}/>
                                    <Tooltip content={<CurrencyTooltip/>}/>
                                    <Area type="monotone" dataKey="balance" name="Balance" stroke="#6366f1"
                                          fill={`url(#bg-${w.walletId})`} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                    <Area type="monotone" dataKey="cumDeposit" name="Deposits" stroke="#f59e0b"
                                          fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 2" isAnimationActive={false} connectNulls/>
                                    {showSp500 && <Line type="monotone" dataKey="sp500" name="S&P 500" stroke="#ec4899"
                                                        strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showWig20 && <Line type="monotone" dataKey="wig20" name="WIG20" stroke="#3b82f6"
                                                        strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showBankFixed3_5 &&
                                        <Line type="monotone" dataKey="fixedDeposit3_5" name="Fixed Deposit 3.5%" stroke="#d7f63b"
                                              strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showNasdaq &&
                                        <Line type="monotone" dataKey="nasdaq" name="NASDAQ-100" stroke="#06b6d4"
                                              strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showDji && <Line type="monotone" dataKey="dji" name="Dow Jones" stroke="#a855f7"
                                                      strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className={styles.empty} style={{height: 80}}>Not enough data</div>}
                    </div>
                ))}
                {wallets.length === 0 && <div className={styles.empty}>No wallets</div>}
            </div>
        </>
    )
}

// ── Earnings tab ──────────────────────────────────────────────────────────────

function EarningsTab({wallets, showSp500, showWig20, showNasdaq, showDji, showBankFixed3_5}: {
    wallets: WalletTimeSeriesEntry[]
    showSp500: boolean
    showWig20: boolean
    showNasdaq: boolean
    showDji: boolean
    showBankFixed3_5: boolean
}) {
    const walletsWithEarnings = wallets.map(w => ({
        ...w,
        series: w.series.map(p => ({
            ...p,
            earnings: p.balance - p.cumDeposit,
            sp500_earnings: (p as any).sp500 != null ? (p as any).sp500 - p.cumDeposit : null,
            wig20_earnings: (p as any).wig20 != null ? (p as any).wig20 - p.cumDeposit : null,
            nasdaq_earnings: (p as any).nasdaq != null ? (p as any).nasdaq - p.cumDeposit : null,
            dji_earnings: (p as any).dji != null ? (p as any).dji - p.cumDeposit : null,
            fixedDeposit3_5_earnings: (p as any).fixedDeposit3_5 != null ? (p as any).fixedDeposit3_5 - p.cumDeposit : null,
        })),
    }))

    const investWallets = wallets.filter(w => w.isInvestment)
    const savingsWallets = wallets.filter(w => !w.isInvestment)

    const investEarnings = investWallets.reduce((s, w) => {
        const last = w.series[w.series.length - 1]
        return s + ((last?.balance ?? 0) - (last?.cumDeposit ?? 0))
    }, 0)
    const investDeposit = investWallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.cumDeposit ?? 0), 0)
    const investReturnPct = investDeposit > 0 ? (investEarnings / investDeposit) * 100 : 0

    const savingsEarnings = savingsWallets.reduce((s, w) => {
        const last = w.series[w.series.length - 1]
        return s + ((last?.balance ?? 0) - (last?.cumDeposit ?? 0))
    }, 0)
    const savingsDeposit = savingsWallets.reduce((s, w) => s + (w.series[w.series.length - 1]?.cumDeposit ?? 0), 0)
    const savingsReturnPct = savingsDeposit > 0 ? (savingsEarnings / savingsDeposit) * 100 : 0

    const totalEarnings = investEarnings + savingsEarnings
    const totalDeposit = investDeposit + savingsDeposit
    const totalReturnPct = totalDeposit > 0 ? (totalEarnings / totalDeposit) * 100 : 0

    return (
        <>
            <div className={styles.kpiRow} style={{padding: '12px 16px 0'}}>
                <KpiCard label="Total Profit" value={PLN(totalEarnings)}
                         sub={PCT(totalReturnPct)}
                         trend={totalEarnings >= 0 ? 'positive' : 'negative'}
                         info="Combined profit from all wallets (both investment returns and savings accounts interest/growth)."/>
                <KpiCard label="Investments Profit Rate" value={PCT(investReturnPct)}
                         sub={PLN(investEarnings)}
                         trend={investReturnPct >= 0 ? 'positive' : 'negative'}
                         info="Profit rate and nominal gain from investment wallets only."/>
                <KpiCard label="Savings Profit Rate" value={PCT(savingsReturnPct)}
                         sub={PLN(savingsEarnings)}
                         trend={savingsReturnPct >= 0 ? 'positive' : 'negative'}
                         info="Interest rate and gain from savings and cash wallets only."/>
            </div>
            <div className={styles.walletGrid}>
                {walletsWithEarnings.map(w => (
                    <div key={w.walletId} className={styles.walletTile}>
                        <WalletTileTitle w={w}/>
                        {w.series.length > 1 ? (
                            <ResponsiveContainer width="100%" height={180} minWidth={0}>
                                <AreaChart data={w.series} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`eg-${w.walletId}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#888'}} tickLine={false}/>
                                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                           tick={{fontSize: 10, fill: '#888'}} tickLine={false}/>
                                    <Tooltip content={<CurrencyTooltip/>}/>
                                    <Area type="monotone" dataKey="earnings" name="Earnings" stroke="#22c55e"
                                          fill={`url(#eg-${w.walletId})`} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                                    {showSp500 &&
                                        <Line type="monotone" dataKey="sp500_earnings" name="S&P 500" stroke="#ec4899"
                                              strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showWig20 &&
                                        <Line type="monotone" dataKey="wig20_earnings" name="WIG20" stroke="#3b82f6"
                                              strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showBankFixed3_5 &&
                                        <Line type="monotone" dataKey="fixedDeposit3_5_earnings"
                                              name="Fixed Deposit 3.5%" stroke="#d7f63b"
                                              strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showNasdaq && <Line type="monotone" dataKey="nasdaq_earnings" name="NASDAQ-100"
                                                         stroke="#06b6d4" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                    {showDji &&
                                        <Line type="monotone" dataKey="dji_earnings" name="Dow Jones" stroke="#a855f7"
                                              strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls/>}
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className={styles.empty} style={{height: 80}}>Not enough data</div>}
                    </div>
                ))}
                {walletsWithEarnings.length === 0 && <div className={styles.empty}>No wallets</div>}
            </div>
        </>
    )
}

// ── FIRE tab ──────────────────────────────────────────────────────────────────

function FireTab({kpi, fireGoal, onGoalChange, historicalSeries}: {
    kpi: DashboardKpi; fireGoal: number; onGoalChange: (g: number) => void; historicalSeries?: TimeSeriesPoint[]
}) {
    const savingsNetDeps = kpi.savingsNetDeposits ?? (kpi.savingsBalance - kpi.savingsGrowth)
    const investSpan = Math.max(1, kpi.investMonthsSpan)
    const savingsSpan = Math.max(1, kpi.savingsMonthsSpan ?? kpi.investMonthsSpan)
    const avgMonthlyInvest = kpi.investNetDeposits / investSpan
    const avgMonthlySavings = savingsNetDeps / savingsSpan
    const monthlyReturn = computeMonthlyReturn(kpi.investBalance, kpi.investNetDeposits, investSpan, kpi.investTwr)
    const savingsMonthlyReturn = computeMonthlyReturn(kpi.savingsBalance, savingsNetDeps, savingsSpan, kpi.savingsTwr)

    const defaultTotal = Math.ceil(avgMonthlyInvest + avgMonthlySavings)

    const [autoMode, setAutoMode] = useState(true)
    const [yearsToInvest, setYearsToInvest] = useState(5)
    const [totalMonthly, setTotalMonthly] = useState(defaultTotal)
    const [manualInvest, setManualInvest] = useState(Math.ceil(avgMonthlyInvest))
    const [manualSavings, setManualSavings] = useState(Math.ceil(avgMonthlySavings))

    const investMonthly = autoMode ? avgMonthlyInvest : manualInvest
    const savingsMonthly = autoMode ? Math.max(0, totalMonthly - avgMonthlyInvest) : manualSavings

    const { data: chartData, todayLabel } = useMemo(
        () => computeFireChartData(kpi.investBalance, kpi.savingsBalance, investMonthly, savingsMonthly, monthlyReturn, savingsMonthlyReturn, yearsToInvest, historicalSeries),
        [kpi.investBalance, kpi.savingsBalance, investMonthly, savingsMonthly, monthlyReturn, savingsMonthlyReturn, yearsToInvest, historicalSeries],
    )

    const stages = useMemo(() =>
            FIRE_STAGE_PCTS.map((pct, i) => {
                const amount = (fireGoal * pct) / 100
                const progress = amount > 0 ? Math.min(1, kpi.netWorth / amount) : 1
                const left = Math.max(0, amount - kpi.netWorth)
                const monthsEst = estimateMonthsToTarget(
                    kpi.investBalance, kpi.savingsBalance, avgMonthlyInvest, avgMonthlySavings, monthlyReturn, savingsMonthlyReturn, amount,
                )
                return {name: FIRE_STAGE_NAMES[i], pct, amount, progress, left, monthsEst, achieved: left === 0}
            }),
        [fireGoal, kpi, avgMonthlyInvest, avgMonthlySavings, monthlyReturn, savingsMonthlyReturn])

    const investAnnualReturn = (Math.pow(1 + monthlyReturn, 12) - 1) * 100
    const savingsAnnualReturn = (Math.pow(1 + savingsMonthlyReturn, 12) - 1) * 100

    const nextYearInvestFV = futureValue(kpi.investBalance, avgMonthlyInvest, monthlyReturn, 12)
    const nextYearSavingsFV = futureValue(kpi.savingsBalance, avgMonthlySavings, savingsMonthlyReturn, 12)
    const nextYearCombined = nextYearInvestFV + nextYearSavingsFV
    const nextYearPlus20 = futureValue(kpi.investBalance, avgMonthlyInvest * 1.2, monthlyReturn, 12)
        + futureValue(kpi.savingsBalance, avgMonthlySavings * 1.2, savingsMonthlyReturn, 12)

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
                                     style={{
                                         width: `${s.progress * 100}%`,
                                         background: s.achieved ? '#22c55e' : '#6366f1'
                                     }}/>
                            </div>
                            <span className={styles.progressPct}>{(s.progress * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
                <div className={styles.stagesNote}>
                    * Projections use historical deposits and estimated monthly returns for investments and savings.
                </div>
            </div>

            {/* 3 — Goal progress and variance (chart + controls + metrics) */}
            <div className={styles.fireCard}>
                <h3 className={styles.fireCardTitle}>Goal progress and variance</h3>

                {/* 3a — Mode toggle */}
                <div className={styles.fireModeToggle}>
                    <span className={styles.kpiLabel}>Mode:</span>
                    <button className={`${styles.filterBtn} ${autoMode ? styles.filterActive : ''}`}
                            onClick={() => setAutoMode(true)}>Auto
                    </button>
                    <button className={`${styles.filterBtn} ${!autoMode ? styles.filterActive : ''}`}
                            onClick={() => setAutoMode(false)}>Manual
                    </button>
                </div>

                {/* 3b — Chart */}
                <ResponsiveContainer width="100%" height={480} minWidth={0}>
                    <LineChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                        <XAxis dataKey="label" tick={{fontSize: 10, fill: '#888'}} tickLine={false}/>
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{fontSize: 11, fill: '#888'}}
                               tickLine={false}/>
                        <Tooltip formatter={(v: any) => v != null ? PLN(Number(v)) : ''} labelFormatter={(l) => `${l}`}/>
                        <Legend wrapperStyle={{fontSize: 12}}/>
                        <ReferenceLine y={fireGoal} stroke="#f59e0b" strokeDasharray="6 3"
                                       label={{value: 'FIRE Goal', fill: '#f59e0b', fontSize: 11}}/>
                        <ReferenceLine x={todayLabel} stroke="#64748b" strokeDasharray="4 4"
                                       label={{value: 'Today', fill: '#94a3b8', fontSize: 11, position: 'top'}}/>
                        <Line type="monotone" dataKey="Actual Net Worth" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls/>
                        <Line type="monotone" dataKey="Actual Deposits" stroke="#64748b" strokeWidth={1.5} dot={false}
                              strokeDasharray="4 4" isAnimationActive={false} connectNulls/>
                        <Line type="monotone" dataKey="Baseline" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls/>
                        <Line type="monotone" dataKey="Plus 20%" stroke="#22c55e" strokeWidth={1.5} dot={false}
                              strokeDasharray="4 2" isAnimationActive={false} connectNulls/>
                        <Line type="monotone" dataKey="Minus 20%" stroke="#ef4444" strokeWidth={1.5} dot={false}
                              strokeDasharray="4 2" isAnimationActive={false} connectNulls/>
                        <Line type="monotone" dataKey="Only Deposits" stroke="#94a3b8" strokeWidth={1} dot={false}
                              strokeDasharray="2 3" isAnimationActive={false} connectNulls/>
                    </LineChart>
                </ResponsiveContainer>

                {/* 3c — Controls: years | deposit inputs */}
                <div className={styles.fireControlsRow}>
                    <div className={styles.fireInputGroup}>
                        <span className={styles.kpiLabel}>How many years do you want to invest?</span>
                        <input type="number" className={styles.fireGoalInput}
                               value={yearsToInvest} min={1} max={30} step={1}
                               onChange={e => setYearsToInvest(Math.min(30, Math.max(1, Number(e.target.value))))}/>
                    </div>

                    {autoMode && (
                        <div className={styles.fireInputGroup}>
                            <span
                                className={styles.kpiLabel}>Total monthly savings (investments + savings) (PLN):</span>
                            <input type="number" className={styles.fireGoalInput}
                                   value={totalMonthly} min={0} step={1000}
                                   onChange={e => setTotalMonthly(Number(e.target.value))}/>
                        </div>
                    )}

                    {!autoMode && (
                        <>
                            <div className={styles.fireInputGroup}>
                                <span className={styles.kpiLabel}>Total monthly savings (PLN):</span>
                                <input type="number" className={styles.fireGoalInput}
                                       value={totalMonthly} min={0} step={1000}
                                       onChange={e => setTotalMonthly(Number(e.target.value))}/>
                            </div>
                            <div className={styles.fireInputGroup}>
                                <span className={styles.kpiLabel}>Monthly to investments (Investment + Crypto + Bonds) (PLN):</span>
                                <input type="number" className={styles.fireGoalInput}
                                       value={manualInvest} min={0} step={100}
                                       onChange={e => setManualInvest(Number(e.target.value))}/>
                            </div>
                            <div className={styles.fireInputGroup}>
                                <span className={styles.kpiLabel}>Monthly to savings accounts (PLN):</span>
                                <input type="number" className={styles.fireGoalInput}
                                       value={manualSavings} min={0} step={100}
                                       onChange={e => setManualSavings(Number(e.target.value))}/>
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
                        <span className={styles.metricValue}>{investAnnualReturn.toFixed(2)}%</span>
                        <span className={styles.metricLabel}>Annual investment return (nominal)</span>
                    </div>
                    <div className={styles.metricBox}>
                        <span className={styles.metricValue}>{(monthlyReturn * 100).toFixed(3)}%</span>
                        <span className={styles.metricLabel}>Monthly investment return (nominal)</span>
                    </div>
                    <div className={styles.metricBox}>
                        <span className={styles.metricValue}>{savingsAnnualReturn.toFixed(2)}%</span>
                        <span className={styles.metricLabel}>Savings annual return (nominal)</span>
                    </div>
                    <div className={styles.metricBox}>
                        <span className={styles.metricValue}>{(savingsMonthlyReturn * 100).toFixed(3)}%</span>
                        <span className={styles.metricLabel}>Monthly savings return (nominal)</span>
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
        return {date, Best: rate('Best'), Good: rate('Good'), Risky: rate('Risky')}
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

function PctTooltipStrategy({active, payload, label}: any) {
    if (!active || !payload?.length) return null
    return (
        <div className={styles.tooltip}>
            <p className={styles.tooltipLabel}>{label}</p>
            {payload.map((p: any) => p.value != null && (
                <p key={p.name} style={{color: p.color, margin: '2px 0', fontSize: 12}}>
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
        recommendationsApi.getAll({size: 10000, page: 0, sort: 'date,asc'})
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
                        <ResponsiveContainer width="100%" height={220} minWidth={0}>
                            <LineChart data={s.series} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                                <XAxis dataKey="date" tick={{fontSize: 9, fill: '#888'}} tickLine={false}
                                       interval="preserveStartEnd"/>
                                <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                                       tick={{fontSize: 10, fill: '#888'}} tickLine={false}/>
                                <Tooltip content={<PctTooltipStrategy/>}/>
                                <Legend wrapperStyle={{fontSize: 11}}/>
                                <Line type="monotone" dataKey="Best" stroke="#22c55e" strokeWidth={1.5} dot={false}
                                      isAnimationActive={false} connectNulls/>
                                <Line type="monotone" dataKey="Good" stroke="#6366f1" strokeWidth={1.5} dot={false}
                                      isAnimationActive={false} connectNulls/>
                                <Line type="monotone" dataKey="Risky" stroke="#ef4444" strokeWidth={1.5} dot={false}
                                      isAnimationActive={false} connectNulls/>
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className={styles.empty} style={{height: 100}}>Not enough data</div>
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

    const [showSp500, setShowSp500] = useState(false)
    const [showWig20, setShowWig20] = useState(false)
    const [showBankFixed3_5, setShowBankFixed3_5] = useState(false)
    const [showNasdaq, setShowNasdaq] = useState(false)
    const [showDji, setShowDji] = useState(false)
    const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set())

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
                setSelectedWalletIds(new Set(res.data.walletSeries.map((w: any) => w.walletId)))
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
    const ppkSeries = useMemo(
        () => filterSeries(data?.ppkTimeSeries ?? [], filter),
        [data, filter],
    )
    const investFundSeries = useMemo(
        () => filterSeries(data?.investFundTimeSeries ?? [], filter),
        [data, filter],
    )

    const processedWalletSeries = useMemo(() => {
        if (!data) return []
        const filteredWallets = data.walletSeries.filter(w => selectedWalletIds.has(w.walletId))
        const wallets = aggMode === 'One Wallet'
            ? [aggregateAllWallets(filteredWallets)]
            : filteredWallets
        return wallets.map(w => ({
            ...w,
            series: applyPeriodAgg(applyDateRange(w.series, fromDate, toDate), period),
        }))
    }, [data, aggMode, period, fromDate, toDate, selectedWalletIds])

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
            {activeTab === 'Dashboard' && <FilterRow filter={filter} onChange={setFilter}/>}

            {/* Wallet filter — Balance / Earnings */}
            {showWalletFilter && (
                <WalletFilterPanel
                    aggMode={aggMode} period={period} fromDate={fromDate} toDate={toDate}
                    onAggMode={setAggMode} onPeriod={setPeriod}
                    onFromDate={setFromDate} onToDate={setToDate}
                    allWallets={data.walletSeries}
                    selectedWalletIds={selectedWalletIds}
                    onChangeSelectedWallets={setSelectedWalletIds}
                />
            )}

            {/* Index comparison options */}
            {(activeTab === 'Dashboard' || activeTab === 'Balance' || activeTab === 'Earnings') && (
                <div className={styles.walletSelectionRow}>
                    <span className={styles.walletFilterLabel}>Compare with:</span>
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={showSp500} onChange={e => setShowSp500(e.target.checked)}/>
                        <span>S&P 500</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={showWig20} onChange={e => setShowWig20(e.target.checked)}/>
                        <span>WIG20</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={showBankFixed3_5}
                               onChange={e => setShowBankFixed3_5(e.target.checked)}/>
                        <span>Bank Fixed Deposit 3.5%</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={showNasdaq} onChange={e => setShowNasdaq(e.target.checked)}/>
                        <span>NASDAQ-100</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={showDji} onChange={e => setShowDji(e.target.checked)}/>
                        <span>Dow Jones</span>
                    </label>
                </div>
            )}

            {/* Tab content */}
            <div className={styles.tabContent}>
                {activeTab === 'Dashboard' && (
                    <DashboardTab
                        data={data}
                        investSeries={investSeries}
                        netWorthSeries={netWorthSeries}
                        ppkSeries={ppkSeries}
                        investFundSeries={investFundSeries}
                        showSp500={showSp500}
                        showWig20={showWig20}
                        showNasdaq={showNasdaq}
                        showDji={showDji}
                        showBankFixed3_5={showBankFixed3_5}
                    />
                )}
                {activeTab === 'Balance' && (
                    <BalanceTab
                        wallets={processedWalletSeries}
                        showSp500={showSp500}
                        showWig20={showWig20}
                        showNasdaq={showNasdaq}
                        showDji={showDji}
                        showBankFixed3_5={showBankFixed3_5}
                    />
                )}
                {activeTab === 'Earnings' && (
                    <EarningsTab
                        wallets={processedWalletSeries}
                        showSp500={showSp500}
                        showWig20={showWig20}
                        showNasdaq={showNasdaq}
                        showDji={showDji}
                        showBankFixed3_5={showBankFixed3_5}
                    />
                )}
                {activeTab === 'FIRE' && (
                    <FireTab
                        kpi={data.kpi}
                        fireGoal={fireGoal}
                        onGoalChange={setFireGoal}
                        historicalSeries={data.netWorthTimeSeries}
                    />
                )}
                {activeTab === 'Short Term Strategies' && <StrategiesTab/>}
            </div>
        </div>
    )
}
