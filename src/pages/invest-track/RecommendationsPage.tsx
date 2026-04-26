import { useEffect, useState } from 'react'
import { DataTable } from '../../components/table/DataTable'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { recommendationsApi, type InvestmentRecommendation } from '../../api/investments'
import { toPage } from '../../api/crud'
import type { Column } from '../../components/table/DataTable'
import styles from './RecommendationsPage.module.css'

const TYPE_COLORS: Record<string, string> = {
  Best: '#22c55e',
  Good: '#6366f1',
  Risky: '#f59e0b',
}

const RESULT_COLORS: Record<string, string> = {
  Good: '#22c55e',
  Bad: '#ef4444',
}

const COLUMNS: Column<InvestmentRecommendation>[] = [
  { key: 'date', header: 'Date', sortable: true },
  { key: 'symbol', header: 'Symbol', sortable: true },
  { key: 'strategy', header: 'Strategy', sortable: true },
  {
    key: 'changeInPercentMorning',
    header: 'Change (Bef)',
    sortable: true,
    render: (row) => {
      const v = Number(row.changeInPercentMorning)
      return <span className={v >= 0 ? styles.positive : styles.negative}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
    },
  },
  {
    key: 'changeInPercentEvening',
    header: 'Change (Aft)',
    sortable: true,
    render: (row) => {
      const v = Number(row.changeInPercentEvening)
      return <span className={v >= 0 ? styles.positive : styles.negative}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
    },
  },
  {
    key: 'recommendationType',
    header: 'Type',
    sortable: true,
    render: (row) => (
      <span className={styles.badge} style={{ background: TYPE_COLORS[row.recommendationType] ?? '#6366f1' }}>
        {row.recommendationType}
      </span>
    ),
  },
  {
    key: 'recommendationResult',
    header: 'Result',
    sortable: true,
    render: (row) => row.recommendationResult ? (
      <span className={styles.badge} style={{ background: RESULT_COLORS[row.recommendationResult] ?? '#888' }}>
        {row.recommendationResult}
      </span>
    ) : <span className={styles.muted}>—</span>,
  },
]

export function RecommendationsPage() {
  const { showError } = useNotification()
  const table = useTableState({ sortBy: 'date', sortDir: 'desc' }, 'recommendations')
  const [rows, setRows] = useState<InvestmentRecommendation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    recommendationsApi.getAll({
      page: table.page, size: table.pageSize,
      sort: table.sortBy, direction: table.sortDir,
    })
      .then((res) => { const p = toPage(res.data); setRows(p.content); setTotal(p.totalElements) })
      .catch(() => showError('Failed to load recommendations'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [table.page, table.pageSize, table.sortBy, table.sortDir])

  const actions = useTableActions<InvestmentRecommendation>({
    onDelete: async (selected) => { for (const r of selected) await recommendationsApi.delete(r.id) },
    onRefresh: load,
  })

  return (
    <div className={styles.page}>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        page={table.page}
        pageSize={table.pageSize}
        totalElements={total}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        actions={actions}
      />
    </div>
  )
}
