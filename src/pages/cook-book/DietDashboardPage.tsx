import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, Cell,
} from 'recharts'
import { useNotification } from '../../components/ui/Notification'
import { dietApi, type DashboardDto } from '../../api/cookBook'
import styles from './DietDashboardPage.module.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

type GroupBy = 'DAY' | 'WEEK' | 'MONTH'

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      {children}
    </div>
  )
}

const TICK_STYLE = { fill: 'rgba(255,255,255,0.45)', fontSize: 10 }
const GRID_STYLE = { stroke: 'rgba(255,255,255,0.06)' }
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(20,20,35,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: 12,
}

function buildBarData(labels: string[], values: (number | null)[]): { label: string; value: number | null }[] {
  return labels.map((l, i) => ({ label: l, value: values[i] ?? null }))
}

export function DietDashboardPage() {
  const { showError } = useNotification()
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(todayStr())
  const [groupBy, setGroupBy] = useState<GroupBy>('DAY')
  const [data, setData] = useState<DashboardDto | null>(null)
  const [loading, setLoading] = useState(false)

  const load = (f = from, t = to, g = groupBy) => {
    setLoading(true)
    dietApi.getDashboard(f, t, g)
      .then(r => setData(r.data))
      .catch(() => showError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const apply = () => load(from, to, groupBy)

  if (!data && !loading) return null

  const cd = data?.chartData
  const macro = data?.macroBreakdown
  const proj = data?.weightProjection
  const hasData = cd && cd.labels.length > 0

  // Activity chart data
  const activityData = hasData
    ? buildBarData(cd.labels, cd.activityKcal)
    : []

  // Deficit chart data
  const deficitData = hasData
    ? cd.labels.map((l, i) => ({ label: l, value: cd.deficit[i] ?? null }))
    : []

  // Calorie line data
  const calorieData = hasData
    ? cd.labels.map((l, i) => ({
        label: l,
        consumed: cd.consumedKcal[i],
        target: cd.targetKcal[i],
        tdee: cd.effectiveTdee[i],
      }))
    : []

  // Weight data
  const weightData = hasData
    ? cd.labels.map((l, i) => ({ label: l, weight: cd.weight[i] }))
    : []
  const hasWeight = weightData.some(d => d.weight != null)

  // Cumulative deficit
  let running = 0
  const cumulData = hasData
    ? cd.labels.map((l, i) => {
        running += cd.deficit[i] ?? 0
        return { label: l, cumul: Math.round(running * 10) / 10 }
      })
    : []

  // Macro bars
  const macroBarData = macro?.hasData
    ? [
        { name: 'Protein', consumed: macro.avgConsumedProtein, target: macro.avgTargetProtein },
        { name: 'Fat', consumed: macro.avgConsumedFat, target: macro.avgTargetFat },
        { name: 'Carbs', consumed: macro.avgConsumedCarbs, target: macro.avgTargetCarbs },
      ]
    : []

  // Weight projection
  const projData = proj && proj.projectedWeight.some(w => w != null)
    ? proj.labels.map((l, i) => ({
        label: l,
        actual: proj.actualWeight[i],
        projected: proj.projectedWeight[i],
      }))
    : []

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <span className={styles.groupLabel}>Group by:</span>
        {(['DAY', 'WEEK', 'MONTH'] as GroupBy[]).map(g => (
          <button key={g} className={`${styles.groupBtn} ${groupBy === g ? styles.groupActive : ''}`}
            onClick={() => setGroupBy(g)}>{g.charAt(0) + g.slice(1).toLowerCase()}</button>
        ))}
        <input type="date" className={styles.datePick} value={from} onChange={e => setFrom(e.target.value)} />
        <span className={styles.muted}>–</span>
        <input type="date" className={styles.datePick} value={to} onChange={e => setTo(e.target.value)} />
        <button className={`${styles.btn} ${styles.primary}`} onClick={apply}>Apply</button>
      </div>

      <div className={styles.hint}>
        Net Deficit = TDEE − Consumed &nbsp;·&nbsp; Green = deficit (weight loss), Red = surplus
      </div>

      {loading && <div className={styles.loading}>Loading…</div>}

      {!loading && !hasData && (
        <div className={styles.empty}>No data for selected range.</div>
      )}

      {!loading && hasData && (
        <div className={styles.grid}>

          <ChartCard title="Activity Calories Burned">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
                <YAxis tick={TICK_STYLE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Activity kcal" fill="#6366f1" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Net Deficit (green = deficit, red = surplus)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deficitData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
                <YAxis tick={TICK_STYLE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Bar dataKey="value" name="Deficit (kcal)" radius={[3,3,0,0]}>
                  {deficitData.map((entry, i) => (
                    <Cell key={i} fill={entry.value == null || entry.value >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Calorie Intake vs Target vs TDEE">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={calorieData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
                <YAxis tick={TICK_STYLE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="consumed" name="Consumed" stroke="#6366f1" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="target" name="Target" stroke="#f59e0b" dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="tdee" name="TDEE" stroke="#22c55e" dot={false} strokeWidth={1.5} strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cumulative Deficit (≈ kg fat: ÷7700)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cumulData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
                <YAxis tick={TICK_STYLE} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v} kcal (≈${(v/7700).toFixed(2)} kg)`, 'Cumul. deficit']}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Line type="monotone" dataKey="cumul" name="Cumulative deficit" stroke="#818cf8" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {macro?.hasData && (
            <ChartCard title="Macro Breakdown — avg/day (Protein / Fat / Carbs)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={macroBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} unit="g" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="consumed" name="Consumed (g)" fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar dataKey="target" name="Target (g)" fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {hasWeight && (
            <ChartCard title="Weight (kg)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
                  <YAxis tick={TICK_STYLE} unit=" kg" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#22c55e" dot={{ r: 3 }} strokeWidth={2} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {projData.length > 0 && proj && (
            <ChartCard title={`Weight Projection — 13 weeks (avg deficit ${proj.avgDailyDeficit.toFixed(0)} kcal/day → ${proj.weeklyWeightChange >= 0 ? '-' : '+'}${Math.abs(proj.weeklyWeightChange).toFixed(2)} kg/week)`}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
                  <YAxis tick={TICK_STYLE} unit=" kg" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#22c55e" dot={{ r: 3 }} strokeWidth={2} connectNulls={false} />
                  <Line type="monotone" dataKey="projected" name="Projected" stroke="#6366f1" strokeDasharray="5 3" dot={false} strokeWidth={1.5} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  )
}
