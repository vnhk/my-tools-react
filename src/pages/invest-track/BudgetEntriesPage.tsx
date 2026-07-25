import {useCallback, useEffect, useMemo, useState} from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import {budgetEntriesApi, type BudgetEntry} from '../../api/investments'
import styles from './BudgetEntriesPage.module.css'
import {BudgetTreeTab} from "./BudgetTreeTab.tsx";


export function getCategoryIcon(name: string): string {
    const l = name.toLowerCase()
    if (l.includes('shop') || l.includes('shopping')) return '🛒'
    if (l.includes('food')) return '🍴'
    if (l.includes('house') || l.includes('rent')) return '🏠'
    if (l.includes('car')) return '🚗'
    if (l.includes('work')) return '💼'
    if (l.includes('wedding')) return '💍'
    if (l.includes('entertainment')) return '🎬'
    if (l.includes('subscription')) return '📀'
    if (l.includes('loan')) return '🏦'
    return '🏷️'
}

// TO BE CHANGED, USE BACKED TODO
export function toPln(value: number, currency: string): number {
    if (currency === 'EUR') return value * 4.34
    if (currency === 'USD') return value * 3.7
    return value
}

export function fmt(amount: number, currency = 'PLN'): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency', currency, maximumFractionDigits: 2,
    }).format(Math.abs(amount))
}


// ── Analytics helpers ─────────────────────────────────────────────────────────

function buildMonthlyChart(entries: BudgetEntry[], from: string, to: string, cats: Set<string>) {
    const filtered = entries.filter(e =>
        e.entryDate && e.entryDate >= from && e.entryDate <= to &&
        cats.has(e.category || 'Uncategorized'),
    )
    const byMonth: Record<string, { income: number; expense: number }> = {}
    for (const e of filtered) {
        const m = e.entryDate!.slice(0, 7)
        if (!byMonth[m]) byMonth[m] = {income: 0, expense: 0}
        const pln = toPln(Number(e.value), e.currency ?? 'PLN')
        e.entryType === 'Income' ? (byMonth[m].income += pln) : (byMonth[m].expense += pln)
    }
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
        .map(([month, {income, expense}]) => ({
            month: month.slice(0, 7),
            income: Math.round(income),
            expense: Math.round(expense),
        }))
}

function buildCategoryRanking(entries: BudgetEntry[], from: string, to: string, cats: Set<string>) {
    const filtered = entries.filter(e =>
        e.entryDate && e.entryDate >= from && e.entryDate <= to &&
        cats.has(e.category || 'Uncategorized'),
    )
    const expByCat: Record<string, number> = {}
    const incByCat: Record<string, number> = {}
    for (const e of filtered) {
        const cat = e.category || 'Uncategorized'
        const pln = toPln(Number(e.value), e.currency ?? 'PLN')
        e.entryType === 'Income'
            ? (incByCat[cat] = (incByCat[cat] ?? 0) + pln)
            : (expByCat[cat] = (expByCat[cat] ?? 0) + pln)
    }
    const rank = (obj: Record<string, number>) =>
        Object.entries(obj).sort(([, a], [, b]) => b - a).slice(0, 10)
            .map(([category, total]) => ({
                "name": category, total: Math.round(total)
            }))
    return {topExpByCategory: rank(expByCat), topIncByCategory: rank(incByCat)}
}

function buildTagsRanking(entries: BudgetEntry[], from: string, to: string) {
    const filtered = entries.filter(e =>
        e.entryDate && e.entryDate >= from && e.entryDate <= to &&
        e.tags
    )

    const expByTag: Record<string, number> = {}
    const incByTag: Record<string, number> = {}

    for (const e of filtered) {
        const tags = e.tags!
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)

        const pln = toPln(Number(e.value), e.currency ?? 'PLN')

        for (const tag of tags) {
            if (e.entryType === 'Income') {
                incByTag[tag] = (incByTag[tag] ?? 0) + pln
            } else {
                expByTag[tag] = (expByTag[tag] ?? 0) + pln
            }
        }
    }

    const rank = (obj: Record<string, number>) =>
        Object.entries(obj)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag, total]) => ({
                "name": tag,
                total: Math.round(total)
            }))

    return {
        topExpByTag: rank(expByTag),
        topIncByTag: rank(incByTag)
    }
}


function buildAvgPie(entries: BudgetEntry[], year: number) {
    const yearEntries = entries.filter(e =>
        e.entryDate && e.entryDate.startsWith(String(year)) && e.entryType === 'Expense',
    )
    const allMonths = new Set<string>()
    const byCat: Record<string, number> = {}
    for (const e of yearEntries) {
        allMonths.add(e.entryDate!.slice(0, 7))
        const cat = e.category || 'Uncategorized'
        byCat[cat] = (byCat[cat] ?? 0) + toPln(Number(e.value), e.currency ?? 'PLN')
    }
    const numMonths = Math.max(1, allMonths.size)
    const avg: Record<string, number> = {}
    for (const [cat, total] of Object.entries(byCat)) avg[cat] = total / numMonths

    const totalAvg = Object.values(avg).reduce((s, v) => s + v, 0)
    const grouped: [string, number][] = []
    let otherSum = 0
    for (const [cat, v] of Object.entries(avg).sort(([, a], [, b]) => b - a)) {
        const pct = totalAvg > 0 ? (v / totalAvg) * 100 : 0
        pct < 1 ? (otherSum += v) : grouped.push([cat, v])
    }
    if (otherSum > 0) grouped.push(['Other', otherSum])
    return grouped.map(([name, value]) => ({name, value: Math.round(value)}))
}

const PIE_PALETTE = [
    '#ef4444', '#f59e0b', '#6366f1', '#22d3ee', '#10b981',
    '#8b5cf6', '#ec4899', '#3b82f6', '#a8a29e', '#fbbf24',
]


// ── Analytics Tab ─────────────────────────────────────────────────────────────

function CurrencyTip({active, payload, label}: any) {
    if (!active || !payload?.length) return null
    return (
        <div className={styles.tooltip}>
            <p style={{fontWeight: 600, marginBottom: 4}}>{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{color: p.color, margin: '2px 0', fontSize: 12}}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    )
}

function RankingList({title, items, isIncome}: {
    title: string;
    items: { name: string; total: number }[];
    isIncome: boolean
}) {
    const max = items[0]?.total ?? 1
    const color = isIncome ? '#10b981' : '#ef4444'
    const barColor = isIncome ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
    return (
        <div className={styles.rankCol}>
            <h4 className={styles.rankTitle} style={{color}}>{title}</h4>
            {items.length === 0 && <span className={styles.noData}>No data</span>}
            {items.map((item, i) => (
                <div key={item.name} className={styles.rankRow}>
                    <span className={styles.rankNum}>{i + 1}.</span>
                    <span className={styles.rankName}>{item.name}</span>
                    <div className={styles.rankTrack}>
                        <div className={styles.rankBar}
                             style={{width: `${Math.round((item.total / max) * 100)}%`, background: barColor}}/>
                    </div>
                    <span className={styles.rankAmount} style={{color}}>{fmt(item.total)}</span>
                </div>
            ))}
        </div>
    )
}

function BudgetAnalyticsTab({entries}: { entries: BudgetEntry[] }) {
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10)
    const defaultTo = now.toISOString().slice(0, 10)

    const [fromDate, setFromDate] = useState(defaultFrom)
    const [toDate, setToDate] = useState(defaultTo)
    const [pieYear, setPieYear] = useState(now.getFullYear())

    const allCats = useMemo(() => {
        const cats = new Set<string>()
        entries.forEach(e => {
            if (e.entryDate && e.entryDate >= fromDate && e.entryDate <= toDate)
                cats.add(e.category || 'Uncategorized')
        })
        return [...cats].sort()
    }, [entries, fromDate, toDate])

    const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(allCats))

    useEffect(() => {
        setSelectedCats(new Set(allCats))
    }, [allCats.join(',')])

    const activeCats = useMemo(() =>
            new Set(allCats.filter(c => selectedCats.has(c))),
        [allCats, selectedCats])

    const monthlyData = useMemo(() => buildMonthlyChart(entries, fromDate, toDate, activeCats), [entries, fromDate, toDate, activeCats])
    const {
        topExpByCategory,
        topIncByCategory
    } = useMemo(() => buildCategoryRanking(entries, fromDate, toDate, activeCats), [entries, fromDate, toDate, activeCats])

    const {
        topExpByTag,
        topIncByTag
    } = useMemo(() => buildTagsRanking(entries, fromDate, toDate), [entries, fromDate, toDate, activeCats])


    const pieData = useMemo(() => buildAvgPie(entries, pieYear), [entries, pieYear])

    const toggleCat = (cat: string) => {
        setSelectedCats(prev => {
            const s = new Set(prev)
            s.has(cat) ? s.delete(cat) : s.add(cat)
            return s
        })
    }

    return (
        <div className={styles.analyticsWrap}>

            {/* Controls */}
            <div className={styles.analyticsControls}>
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>From</label>
                    <input type="date" className={styles.dialogInput} value={fromDate}
                           onChange={e => setFromDate(e.target.value)}/>
                </div>
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>To</label>
                    <input type="date" className={styles.dialogInput} value={toDate}
                           onChange={e => setToDate(e.target.value)}/>
                </div>
            </div>

            {/* Category filter */}
            <div className={styles.catFilterWrap}>
                <div className={styles.catFilterBtns}>
                    <button className={styles.toolBtn} onClick={() => setSelectedCats(new Set(allCats))}>Select All
                    </button>
                    <button className={styles.toolBtn} onClick={() => setSelectedCats(new Set())}>Deselect All</button>
                </div>
                <div className={styles.catCheckboxes}>
                    {allCats.map(cat => (
                        <label key={cat} className={styles.catCheck}>
                            <input type="checkbox" checked={selectedCats.has(cat)} onChange={() => toggleCat(cat)}/>
                            <span>{getCategoryIcon(cat)} {cat}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Monthly income vs expense chart */}
            <div className={styles.analyticsCard}>
                <h3 className={styles.analyticsTitle}>Monthly Income vs Expense</h3>
                {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={monthlyData} margin={{top: 4, right: 8, bottom: 4, left: 8}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                            <XAxis dataKey="month" tick={{fontSize: 11, fill: '#888'}} tickLine={false}/>
                            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{fontSize: 11, fill: '#888'}}
                                   tickLine={false}/>
                            <Tooltip content={<CurrencyTip/>}/>
                            <Legend wrapperStyle={{fontSize: 12}}/>
                            <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]}/>
                            <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3, 3, 0, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                ) : <div className={styles.noData}>No data for selected range/categories</div>}
            </div>

            {/* Category Ranking */}
            <div className={styles.analyticsCard}>
                <h3 className={styles.analyticsTitle}>Category Ranking</h3>
                <div className={styles.rankRow2Col}>
                    <RankingList title="Top Expenses" items={topExpByCategory} isIncome={false}/>
                    <RankingList title="Top Income" items={topIncByCategory} isIncome={true}/>
                </div>
            </div>

            {/* Tag Ranking */}
            <div className={styles.analyticsCard}>
                <h3 className={styles.analyticsTitle}>Tag Ranking</h3>
                <div className={styles.rankRow2Col}>
                    <RankingList title="Top Expenses" items={topExpByTag} isIncome={false}/>
                    <RankingList title="Top Income" items={topIncByTag} isIncome={true}/>
                </div>
            </div>

            {/* Avg monthly expenses pie */}
            <div className={styles.analyticsCard}>
                <div className={styles.pieTitleRow}>
                    <h3 className={styles.analyticsTitle}>Average Monthly Expenses by Category</h3>
                    <div className={styles.yearBtns}>
                        {[now.getFullYear(), now.getFullYear() - 1].map(y => (
                            <button key={y}
                                    className={`${styles.toolBtn} ${pieYear === y ? styles.primary : ''}`}
                                    onClick={() => setPieYear(y)}>{y}</button>
                        ))}
                    </div>
                </div>

                {pieData.length > 0 ? (
                    <div className={styles.pieRow}>
                        <ResponsiveContainer width={340} height={340}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name"
                                     cx="50%" cy="50%" innerRadius={60} outerRadius={130} paddingAngle={2}>
                                    {pieData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]}/>)}
                                </Pie>
                                <Tooltip formatter={(v: any) => fmt(Number(v))}/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.pieLegend}>
                            {(() => {
                                const total = pieData.reduce((s, d) => s + d.value, 0)
                                return pieData.map((d, i) => (
                                    <div key={d.name} className={styles.legendRow}>
                                        <span className={styles.legendDot}
                                              style={{background: PIE_PALETTE[i % PIE_PALETTE.length]}}/>
                                        <span className={styles.legendName}>{d.name}</span>
                                        <span className={styles.legendAmt} style={{color: '#ef4444'}}>
                      {fmt(d.value)} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                    </span>
                                    </div>
                                ))
                            })()}
                        </div>
                    </div>
                ) : <div className={styles.noData}>No expense data for {pieYear}</div>}
            </div>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type BudgetTab = 'Budget Tree' | 'Charts'
const TABS: BudgetTab[] = ['Budget Tree', 'Charts']

export function BudgetEntriesPage() {
    const [entries, setEntries] = useState<BudgetEntry[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<BudgetTab>('Budget Tree')

    const load = useCallback(() => {
        setLoading(true)
        budgetEntriesApi
            .getAll({size: 10000, page: 0, sort: 'entryDate', direction: 'desc'})
            .then(res => setEntries((res.data as any).content ?? []))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        load()
    }, [load])
    useEffect(() => {
        budgetEntriesApi.getCategories().then(r => setCategories(r.data))
    }, [])

    return (
        <div className={styles.page}>
            {/* Inner tabs */}
            <div className={styles.innerTabRow}>
                {TABS.map(t => (
                    <button key={t}
                            className={`${styles.innerTabBtn} ${t === activeTab ? styles.innerTabActive : ''}`}
                            onClick={() => setActiveTab(t)}>{t}</button>
                ))}
            </div>

            {loading ? (
                <div className={styles.stateMsg}>Loading…</div>
            ) : (
                <>
                    {activeTab === 'Budget Tree' && (
                        <BudgetTreeTab entries={entries} categories={categories} onReload={load}/>
                    )}
                    {activeTab === 'Charts' && (
                        <BudgetAnalyticsTab entries={entries}/>
                    )}
                </>
            )}
        </div>
    )
}
