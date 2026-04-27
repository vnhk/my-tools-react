import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Dialog } from '../../components/ui/Dialog'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { useNotification } from '../../components/ui/Notification'
import { budgetEntriesApi, type BudgetEntry } from '../../api/investments'
import styles from './BudgetEntriesPage.module.css'

// ── Shared types & helpers ────────────────────────────────────────────────────

interface CategoryGroup { name: string; balance: number; items: BudgetEntry[] }
interface MonthGroup    { key: string; label: string; balance: number; categories: CategoryGroup[] }

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function monthKey(e: BudgetEntry): string {
  if (!e.entryDate) return '0-0'
  const [y, m] = e.entryDate.split('-')
  return `${parseInt(m)}-${y}`
}

function parseMonthKey(k: string) {
  const [m, y] = k.split('-')
  return { month: parseInt(m), year: parseInt(y) }
}

function formatMonthKey(k: string): string {
  const { month, year } = parseMonthKey(k)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function monthToDefaultDate(k: string): string {
  const { month, year } = parseMonthKey(k)
  const now = new Date()
  if (now.getFullYear() === year && now.getMonth() + 1 === month)
    return now.toISOString().slice(0, 10)
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${last}`
}

function getCategoryIcon(name: string): string {
  const l = name.toLowerCase()
  if (l.includes('shop') || l.includes('shopping')) return '🛒'
  if (l.includes('food'))            return '🍴'
  if (l.includes('house') || l.includes('rent')) return '🏠'
  if (l.includes('car'))             return '🚗'
  if (l.includes('work'))            return '💼'
  if (l.includes('wedding'))         return '💍'
  if (l.includes('entertainment'))   return '🎬'
  if (l.includes('subscription'))    return '📀'
  if (l.includes('loan'))            return '🏦'
  return '🏷️'
}

function toPln(value: number, currency: string): number {
  if (currency === 'EUR') return value * 4.3
  if (currency === 'USD') return value * 3.7
  return value
}

function buildTree(entries: BudgetEntry[]): MonthGroup[] {
  const byMonth: Record<string, BudgetEntry[]> = {}
  for (const e of entries) {
    const k = monthKey(e)
    ;(byMonth[k] ??= []).push(e)
  }
  const sortedKeys = Object.keys(byMonth).sort((a, b) => {
    const pa = parseMonthKey(a), pb = parseMonthKey(b)
    return pb.year !== pa.year ? pb.year - pa.year : pb.month - pa.month
  })
  return sortedKeys.map(key => {
    const byCat: Record<string, BudgetEntry[]> = {}
    for (const e of byMonth[key]) {
      const cat = e.category || 'Uncategorized'
      ;(byCat[cat] ??= []).push(e)
    }
    let monthBalance = 0
    const categories: CategoryGroup[] = Object.entries(byCat).map(([name, items]) => {
      let bal = 0
      for (const item of items) {
        const pln = toPln(Number(item.value), item.currency ?? 'PLN')
        bal += item.entryType === 'Income' ? pln : -pln
      }
      monthBalance += bal
      return { name, balance: bal, items }
    })
    return { key, label: formatMonthKey(key), balance: monthBalance, categories }
  })
}

function fmt(amount: number, currency = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

const PAYMENT_ICONS: Record<string, string> = { Cash: '💵', Card: '💳', Transfer: '🏦' }

const EMPTY_ENTRY: Partial<BudgetEntry> = {
  name: '', category: '', currency: 'PLN', value: 0,
  entryDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Card', entryType: 'Expense', isRecurring: false,
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
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 }
    const pln = toPln(Number(e.value), e.currency ?? 'PLN')
    e.entryType === 'Income' ? (byMonth[m].income += pln) : (byMonth[m].expense += pln)
  }
  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { income, expense }]) => ({
      month: month.slice(0, 7),
      income: Math.round(income),
      expense: Math.round(expense),
    }))
}

function buildRanking(entries: BudgetEntry[], from: string, to: string, cats: Set<string>) {
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
      .map(([category, total]) => ({ category, total: Math.round(total) }))
  return { topExp: rank(expByCat), topInc: rank(incByCat) }
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
  return grouped.map(([name, value]) => ({ name, value: Math.round(value) }))
}

const PIE_PALETTE = [
  '#ef4444','#f59e0b','#6366f1','#22d3ee','#10b981',
  '#8b5cf6','#ec4899','#3b82f6','#a8a29e','#fbbf24',
]

// ── Budget Tree Tab ───────────────────────────────────────────────────────────

interface TreeTabProps {
  entries: BudgetEntry[]
  categories: string[]
  onReload: () => void
}

function BudgetTreeTab({ entries, categories, onReload }: TreeTabProps) {
  const { showSuccess, showError } = useNotification()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<BudgetEntry>>(EMPTY_ENTRY)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDate, setCopyDate] = useState('')

  const [moveOpen, setMoveOpen] = useState(false)
  const [moveDate, setMoveDate] = useState('')
  const [moveCategory, setMoveCategory] = useState('')

  const tree = useMemo(() => buildTree(entries), [entries])

  useEffect(() => {
    if (tree.length > 0 && expandedMonths.size === 0)
      setExpandedMonths(new Set([tree[0].key]))
  }, [tree])

  const toggle = <T,>(set: Set<T>, k: T): Set<T> => {
    const s = new Set(set); s.has(k) ? s.delete(k) : s.add(k); return s
  }

  const expandAll = () => {
    setExpandedMonths(new Set(tree.map(m => m.key)))
    const cats = new Set<string>()
    tree.forEach(m => m.categories.forEach(c => cats.add(`${m.key}::${c.name}`)))
    setExpandedCats(cats)
  }
  const collapseAll = () => { setExpandedMonths(new Set()); setExpandedCats(new Set()) }

  const openAdd = (date?: string, category?: string) => {
    setEditItem({ ...EMPTY_ENTRY, entryDate: date ?? new Date().toISOString().slice(0, 10), category: category ?? '' })
    setFormErrors({})
    setEditOpen(true)
  }
  const openEdit = () => {
    const e = entries.find(x => x.id === [...selectedIds][0])
    if (!e) return
    setEditItem({ ...e })
    setFormErrors({})
    setEditOpen(true)
  }

  const handleSave = async () => {
    const errors = validateFields('BudgetEntry', editItem as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      editItem.id
        ? await budgetEntriesApi.update(editItem.id, editItem)
        : await budgetEntriesApi.create(editItem)
      showSuccess('Saved')
      setEditOpen(false)
      setSelectedIds(new Set())
      onReload()
    } catch { showError('Failed to save') }
  }

  const handleDelete = async () => {
    if (!selectedIds.size) return
    try {
      for (const id of selectedIds) await budgetEntriesApi.delete(id)
      showSuccess(`Deleted ${selectedIds.size} item(s)`)
      setSelectedIds(new Set())
      onReload()
    } catch { showError('Failed to delete') }
  }

  const handleCopy = async () => {
    if (!copyDate) return
    try {
      for (const id of selectedIds) {
        const e = entries.find(x => x.id === id)
        if (e) await budgetEntriesApi.create({ ...e, id: undefined, entryDate: copyDate })
      }
      showSuccess('Copied')
      setCopyOpen(false)
      setCopyDate('')
      onReload()
    } catch { showError('Failed to copy') }
  }

  const handleMove = async () => {
    try {
      for (const id of selectedIds) {
        const e = entries.find(x => x.id === id)
        if (!e) continue
        const upd: Partial<BudgetEntry> = { ...e }
        if (moveDate) upd.entryDate = moveDate
        if (moveCategory.trim()) upd.category = moveCategory.trim()
        await budgetEntriesApi.update(id, upd)
      }
      showSuccess('Moved')
      setMoveOpen(false)
      setMoveDate('')
      setMoveCategory('')
      setSelectedIds(new Set())
      onReload()
    } catch { showError('Failed to move') }
  }

  const has = selectedIds.size > 0
  const single = selectedIds.size === 1

  return (
    <div className={styles.treeTabWrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={expandAll}>Expand All</button>
        <button className={styles.toolBtn} onClick={collapseAll}>Collapse All</button>
        <button className={`${styles.toolBtn} ${styles.danger}`}  disabled={!has}    onClick={handleDelete}>Delete</button>
        <button className={`${styles.toolBtn} ${styles.primary}`} disabled={!has}    onClick={() => setCopyOpen(true)}>Copy</button>
        <button className={`${styles.toolBtn} ${styles.primary}`} disabled={!single} onClick={openEdit}>Edit</button>
        <button className={`${styles.toolBtn} ${styles.warning}`} disabled={!has}    onClick={() => setMoveOpen(true)}>Move</button>
        <button className={`${styles.toolBtn} ${styles.success}`} style={{ marginLeft: 'auto' }} onClick={() => openAdd()}>+ New Entry</button>
      </div>

      {/* Tree */}
      <div className={styles.treeWrap}>
        {/* Header */}
        <div className={`${styles.treeRow} ${styles.treeHeader}`}>
          <span className={styles.colName}>Name</span>
          <span className={styles.colAmount}>Amount</span>
          <span className={styles.colPayment}>Payment</span>
          <span className={styles.colDate}>Date</span>
          <span className={styles.colNotes}>Notes</span>
          <span className={styles.colCheck} />
        </div>

        {tree.length === 0 && <div className={styles.stateMsg}>No entries</div>}

        {tree.map(month => {
          const mExp = expandedMonths.has(month.key)
          return (
            <div key={month.key}>
              <div className={`${styles.treeRow} ${styles.monthRow}`} onClick={() => setExpandedMonths(toggle(expandedMonths, month.key))}>
                <span className={styles.colName}>
                  <span className={styles.chevron}>{mExp ? '▼' : '▶'}</span>
                  {month.label}
                </span>
                <span className={`${styles.colAmount} ${month.balance >= 0 ? styles.income : styles.expense}`}>
                  {month.balance >= 0 ? '' : '−'}{fmt(month.balance)}
                </span>
                <span className={styles.colPayment} /><span className={styles.colDate} /><span className={styles.colNotes} />
                <span className={styles.colCheck}>
                  <button className={styles.plusBtn}
                    onClick={e => { e.stopPropagation(); openAdd(monthToDefaultDate(month.key), '') }}>+</button>
                </span>
              </div>

              {mExp && month.categories.map(cat => {
                const ck = `${month.key}::${cat.name}`
                const cExp = expandedCats.has(ck)
                return (
                  <div key={ck}>
                    <div className={`${styles.treeRow} ${styles.catRow}`} onClick={() => setExpandedCats(toggle(expandedCats, ck))}>
                      <span className={styles.colName}>
                        <span className={styles.catIndent} />
                        <span className={styles.chevron}>{cExp ? '▼' : '▶'}</span>
                        <span className={styles.catIcon}>{getCategoryIcon(cat.name)}</span>
                        {cat.name}
                      </span>
                      <span className={`${styles.colAmount} ${cat.balance >= 0 ? styles.income : styles.expense}`}>
                        {cat.balance >= 0 ? '' : '−'}{fmt(cat.balance)}
                      </span>
                      <span className={styles.colPayment} /><span className={styles.colDate} /><span className={styles.colNotes} />
                      <span className={styles.colCheck}>
                        <button className={styles.plusBtn}
                          onClick={e => { e.stopPropagation(); openAdd(monthToDefaultDate(month.key), cat.name) }}>+</button>
                      </span>
                    </div>

                    {cExp && cat.items.map(item => (
                      <div key={item.id}
                        className={`${styles.treeRow} ${styles.itemRow} ${selectedIds.has(item.id) ? styles.itemSelected : ''}`}
                        onClick={() => setSelectedIds(toggle(selectedIds, item.id))}>
                        <span className={styles.colName}>
                          <span className={styles.itemIndent} />
                          {item.name}
                        </span>
                        <span className={`${styles.colAmount} ${item.entryType === 'Income' ? styles.income : styles.expense}`}>
                          {item.entryType === 'Income' ? '' : '−'}{fmt(Number(item.value), item.currency ?? 'PLN')}
                        </span>
                        <span className={styles.colPayment}>{PAYMENT_ICONS[item.paymentMethod ?? ''] ?? item.paymentMethod ?? ''}</span>
                        <span className={styles.colDate}>{item.entryDate ? item.entryDate.slice(5).replace('-', '.') : ''}</span>
                        <span className={styles.colNotes}>{item.notes ?? ''}</span>
                        <span className={styles.colCheck}>
                          <input type="checkbox" checked={selectedIds.has(item.id)}
                            onChange={() => setSelectedIds(toggle(selectedIds, item.id))}
                            onClick={e => e.stopPropagation()} />
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Dialogs */}
      <Dialog open={editOpen} title={editItem.id ? 'Edit Entry' : 'New Entry'}
        onClose={() => setEditOpen(false)} onConfirm={handleSave} width="600px">
        <DynamicForm entityName="BudgetEntry" mode={editItem.id ? 'edit' : 'save'}
          values={editItem as Record<string, unknown>}
          onChange={(field, value) => setEditItem(s => ({ ...s, [field]: value }))}
          errors={formErrors} dynamicOptions={{ category: categories }} />
      </Dialog>

      <Dialog open={copyOpen} title="Copy to date" onClose={() => setCopyOpen(false)} onConfirm={handleCopy}>
        <div className={styles.dialogField}>
          <label className={styles.dialogLabel}>New date</label>
          <input type="date" className={styles.dialogInput} value={copyDate} onChange={e => setCopyDate(e.target.value)} />
        </div>
      </Dialog>

      <Dialog open={moveOpen} title="Move entries" onClose={() => setMoveOpen(false)} onConfirm={handleMove}>
        <div className={styles.dialogField}>
          <label className={styles.dialogLabel}>New date (leave empty to keep)</label>
          <input type="date" className={styles.dialogInput} value={moveDate} onChange={e => setMoveDate(e.target.value)} />
        </div>
        <div className={styles.dialogField} style={{ marginTop: 12 }}>
          <label className={styles.dialogLabel}>New category (leave empty to keep)</label>
          <input type="text" className={styles.dialogInput} list="move-cats" value={moveCategory} onChange={e => setMoveCategory(e.target.value)} />
          <datalist id="move-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
        </div>
      </Dialog>
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function CurrencyTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', fontSize: 12 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

function RankingList({ title, items, isIncome }: { title: string; items: { category: string; total: number }[]; isIncome: boolean }) {
  const max = items[0]?.total ?? 1
  const color = isIncome ? '#10b981' : '#ef4444'
  const barColor = isIncome ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
  return (
    <div className={styles.rankCol}>
      <h4 className={styles.rankTitle} style={{ color }}>{title}</h4>
      {items.length === 0 && <span className={styles.noData}>No data</span>}
      {items.map((item, i) => (
        <div key={item.category} className={styles.rankRow}>
          <span className={styles.rankNum}>{i + 1}.</span>
          <span className={styles.rankName}>{item.category}</span>
          <div className={styles.rankTrack}>
            <div className={styles.rankBar} style={{ width: `${Math.round((item.total / max) * 100)}%`, background: barColor }} />
          </div>
          <span className={styles.rankAmount} style={{ color }}>{fmt(item.total)}</span>
        </div>
      ))}
    </div>
  )
}

function BudgetAnalyticsTab({ entries }: { entries: BudgetEntry[] }) {
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10)
  const defaultTo   = now.toISOString().slice(0, 10)

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate]     = useState(defaultTo)
  const [pieYear, setPieYear]   = useState(now.getFullYear())

  const allCats = useMemo(() => {
    const cats = new Set<string>()
    entries.forEach(e => {
      if (e.entryDate && e.entryDate >= fromDate && e.entryDate <= toDate)
        cats.add(e.category || 'Uncategorized')
    })
    return [...cats].sort()
  }, [entries, fromDate, toDate])

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(allCats))

  useEffect(() => { setSelectedCats(new Set(allCats)) }, [allCats.join(',')])

  const activeCats = useMemo(() =>
    new Set(allCats.filter(c => selectedCats.has(c))),
  [allCats, selectedCats])

  const monthlyData = useMemo(() => buildMonthlyChart(entries, fromDate, toDate, activeCats), [entries, fromDate, toDate, activeCats])
  const { topExp, topInc } = useMemo(() => buildRanking(entries, fromDate, toDate, activeCats), [entries, fromDate, toDate, activeCats])
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
          <input type="date" className={styles.dialogInput} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>To</label>
          <input type="date" className={styles.dialogInput} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Category filter */}
      <div className={styles.catFilterWrap}>
        <div className={styles.catFilterBtns}>
          <button className={styles.toolBtn} onClick={() => setSelectedCats(new Set(allCats))}>Select All</button>
          <button className={styles.toolBtn} onClick={() => setSelectedCats(new Set())}>Deselect All</button>
        </div>
        <div className={styles.catCheckboxes}>
          {allCats.map(cat => (
            <label key={cat} className={styles.catCheck}>
              <input type="checkbox" checked={selectedCats.has(cat)} onChange={() => toggleCat(cat)} />
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
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
              <Tooltip content={<CurrencyTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className={styles.noData}>No data for selected range/categories</div>}
      </div>

      {/* Ranking */}
      <div className={styles.analyticsCard}>
        <h3 className={styles.analyticsTitle}>Category Ranking</h3>
        <div className={styles.rankRow2Col}>
          <RankingList title="Top Expenses" items={topExp} isIncome={false} />
          <RankingList title="Top Income"   items={topInc} isIncome={true} />
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
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.pieLegend}>
              {(() => {
                const total = pieData.reduce((s, d) => s + d.value, 0)
                return pieData.map((d, i) => (
                  <div key={d.name} className={styles.legendRow}>
                    <span className={styles.legendDot} style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <span className={styles.legendName}>{d.name}</span>
                    <span className={styles.legendAmt} style={{ color: '#ef4444' }}>
                      {fmt(d.value)}  ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
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
  const [entries, setEntries]   = useState<BudgetEntry[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<BudgetTab>('Budget Tree')

  const load = useCallback(() => {
    setLoading(true)
    budgetEntriesApi
      .getAll({ size: 10000, page: 0, sort: 'entryDate', direction: 'desc' })
      .then(res => setEntries((res.data as any).content ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { budgetEntriesApi.getCategories().then(r => setCategories(r.data)) }, [])

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
            <BudgetTreeTab entries={entries} categories={categories} onReload={load} />
          )}
          {activeTab === 'Charts' && (
            <BudgetAnalyticsTab entries={entries} />
          )}
        </>
      )}
    </div>
  )
}
