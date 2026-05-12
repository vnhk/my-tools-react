import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useNotification } from '../../components/ui/Notification'
import { budgetTreeApi, type BudgetMonthDto, type BudgetCategoryDto } from '../../api/investments'
import styles from './BudgetTreePage.module.css'

function today() { return new Date().toISOString().slice(0, 10) }
function firstOfYear() { return `${new Date().getFullYear()}-01-01` }

export function BudgetTreePage() {
  const { showError } = useNotification()
  const [months, setMonths] = useState<BudgetMonthDto[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(firstOfYear())
  const [endDate, setEndDate] = useState(today())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const load = () => {
    setLoading(true)
    budgetTreeApi.getTree(startDate, endDate)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : []
        setMonths(data)
        if (data.length > 0) {
          setExpanded(new Set([data[0].key]))
        }
      })
      .catch(() => showError('Failed to load budget tree'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleMonth = (key: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  const toggleCat = (key: string) =>
    setExpandedCats((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  const expandAll = () => {
    setExpanded(new Set(months.map((m) => m.key)))
    const cats = new Set<string>()
    months.forEach((m) => m.categories.forEach((c) => cats.add(`${m.key}:${c.name}`)))
    setExpandedCats(cats)
  }

  const collapseAll = () => { setExpanded(new Set()); setExpandedCats(new Set()) }

  const totalBalance = months.reduce((sum, m) =>
    sum + (m.entryType === 'Income' ? m.totalPln : -m.totalPln), 0)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.dateLabel}>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.dateInput} />
        </label>
        <label className={styles.dateLabel}>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.dateInput} />
        </label>
        <Button variant="primary" size="sm" onClick={load} disabled={loading}>Load</Button>
        <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
        {months.length > 0 && (
          <span className={styles.balance} style={{ color: totalBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            Balance: {totalBalance >= 0 ? '+' : ''}{totalBalance.toFixed(2)} PLN
          </span>
        )}
      </div>

      {loading && <div className={styles.empty}>Loading...</div>}
      {!loading && months.length === 0 && <div className={styles.empty}>No entries in this period.</div>}

      <div className={styles.tree}>
        {months.map((month) => (
          <MonthNode
            key={month.key}
            month={month}
            open={expanded.has(month.key)}
            onToggle={() => toggleMonth(month.key)}
            expandedCats={expandedCats}
            onToggleCat={(key) => toggleCat(key)}
            monthKey={month.key}
          />
        ))}
      </div>
    </div>
  )
}

function MonthNode({ month, open, onToggle, expandedCats, onToggleCat, monthKey }: {
  month: BudgetMonthDto; open: boolean; onToggle: () => void
  expandedCats: Set<string>; onToggleCat: (k: string) => void; monthKey: string
}) {
  const isIncome = month.entryType === 'Income'
  return (
    <div className={styles.monthBlock}>
      <div className={styles.monthHeader} onClick={onToggle}>
        <span className={styles.chevron}>{open ? '▼' : '▶'}</span>
        <span className={styles.monthLabel}>{month.label}</span>
        <span className={`${styles.amount} ${isIncome ? styles.income : styles.expense}`}>
          {isIncome ? '+' : '-'}{month.totalPln.toFixed(2)} PLN
        </span>
        <span className={`${styles.typeBadge} ${isIncome ? styles.incomeBadge : styles.expenseBadge}`}>
          {month.entryType}
        </span>
      </div>
      {open && (
        <div className={styles.monthBody}>
          {month.categories.map((cat) => (
            <CategoryNode
              key={cat.name}
              cat={cat}
              catKey={`${monthKey}:${cat.name}`}
              open={expandedCats.has(`${monthKey}:${cat.name}`)}
              onToggle={() => onToggleCat(`${monthKey}:${cat.name}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryNode({ cat, catKey: _catKey, open, onToggle }: {
  cat: BudgetCategoryDto; catKey: string; open: boolean; onToggle: () => void
}) {
  const isIncome = cat.entryType === 'Income'
  return (
    <div className={styles.catBlock}>
      <div className={styles.catHeader} onClick={onToggle}>
        <span className={styles.chevron}>{open ? '▼' : '▶'}</span>
        <span className={styles.catName}>{cat.name}</span>
        <span className={`${styles.amount} ${isIncome ? styles.income : styles.expense}`}>
          {isIncome ? '+' : '-'}{cat.totalPln.toFixed(2)} PLN
        </span>
        <span className={`${styles.typeBadge} ${isIncome ? styles.incomeBadge : styles.expenseBadge}`}>
          {cat.entryType}
        </span>
        <span className={styles.itemCount}>{cat.items.length} items</span>
      </div>
      {open && (
        <div className={styles.itemList}>
          {cat.items.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              <span className={styles.itemDate}>{item.entryDate ?? '—'}</span>
              <span className={styles.itemName}>{item.name}</span>
              {item.isRecurring && <span className={styles.recurringBadge}>↻</span>}
              {item.amount != null && (
                <span className={`${styles.itemAmount} ${item.entryType === 'Income' ? styles.income : styles.expense}`}>
                  {item.entryType === 'Income' ? '+' : '-'}{item.amount.toFixed(2)} {item.currency ?? 'PLN'}
                </span>
              )}
              {item.paymentMethod && <span className={styles.payMethod}>{item.paymentMethod}</span>}
              {item.notes && <span className={styles.itemNotes}>{item.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
