import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DataTable } from '../../components/table/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { NumberField } from '../../components/fields/NumberField'
import { TextField } from '../../components/fields/TextField'
import { TabNav } from '../../components/layout/TabNav'
import { useTableState } from '../../hooks/useTableState'
import { useTableActions } from '../../hooks/useTableActions'
import { useNotification } from '../../components/ui/Notification'
import { walletsApi, type Wallet, type WalletSnapshot } from '../../api/investments'
import type { Column } from '../../components/table/DataTable'
import styles from './WalletDetailPage.module.css'

const SNAPSHOT_COLUMNS: Column<WalletSnapshot>[] = [
  { key: 'snapshotDate', header: 'Date', sortable: true },
  {
    key: 'portfolioValue',
    header: 'Portfolio Value',
    sortable: true,
    render: (row) => <span className={styles.value}>{Number(row.portfolioValue).toFixed(2)}</span>,
  },
  { key: 'monthlyDeposit', header: 'Deposit', sortable: true, render: (row) => Number(row.monthlyDeposit).toFixed(2) },
  { key: 'monthlyWithdrawal', header: 'Withdrawal', sortable: true, render: (row) => Number(row.monthlyWithdrawal).toFixed(2) },
  { key: 'monthlyEarnings', header: 'Earnings', sortable: true, render: (row) => {
    const v = Number(row.monthlyEarnings)
    return <span className={v >= 0 ? styles.positive : styles.negative}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>
  }},
  { key: 'notes', header: 'Notes' },
]

const EMPTY_SNAPSHOT: Partial<WalletSnapshot> = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  portfolioValue: 0,
  monthlyDeposit: 0,
  monthlyWithdrawal: 0,
  monthlyEarnings: 0,
  notes: '',
}

export function WalletDetailPage() {
  const { walletId } = useParams<{ walletId: string }>()
  const { showSuccess, showError } = useNotification()
  const table = useTableState({ sortBy: 'snapshotDate', sortDir: 'desc' }, `wallet-snapshots-${walletId}`)

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [snapshots, setSnapshots] = useState<WalletSnapshot[]>([])
  const [metrics, setMetrics] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<WalletSnapshot>>(EMPTY_SNAPSHOT)

  useEffect(() => {
    if (!walletId) return
    walletsApi.getById(walletId).then((res) => setWallet(res.data)).catch(() => {})
    walletsApi.getMetrics(walletId).then((res) => setMetrics(res.data)).catch(() => {})
    loadSnapshots()
  }, [walletId])

  const loadSnapshots = () => {
    if (!walletId) return
    setLoading(true)
    walletsApi.getSnapshots(walletId)
      .then((res) => setSnapshots(res.data))
      .finally(() => setLoading(false))
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => {
    const cmp = a.snapshotDate.localeCompare(b.snapshotDate)
    return table.sortDir === 'desc' ? -cmp : cmp
  })

  const openEdit = (item: Partial<WalletSnapshot>) => {
    setEditItem(item)
    setDialogOpen(true)
  }

  const actions = useTableActions<WalletSnapshot>({
    onDelete: async (selected) => {
      for (const s of selected) await walletsApi.deleteSnapshot(walletId!, s.id)
    },
    onEdit: openEdit,
    onRefresh: loadSnapshots,
  })

  const handleSave = async () => {
    if (!walletId) return
    try {
      if (editItem.id) {
        await walletsApi.updateSnapshot(walletId, editItem.id, editItem)
      } else {
        await walletsApi.createSnapshot(walletId, editItem)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      loadSnapshots()
      walletsApi.getMetrics(walletId).then((res) => setMetrics(res.data)).catch(() => {})
    } catch {
      showError('Failed to save snapshot')
    }
  }

  const tabs = [
    { path: '/invest-track/wallets', label: '← Wallets' },
    { path: `/invest-track/wallets/${walletId}`, label: wallet?.name ?? 'Wallet' },
  ]

  const fmtNum = (v: unknown) => v != null ? Number(v).toFixed(2) : '—'
  const fmtPct = (v: unknown) => v != null ? `${Number(v).toFixed(2)}%` : '—'

  return (
    <div className={styles.page}>
      <TabNav tabs={tabs} />

      {wallet && (
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Current Value</span>
            <span className={styles.kpiValue}>{fmtNum(wallet.currentValue)} {wallet.currency}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Total Deposits</span>
            <span className={styles.kpiValue}>{fmtNum(wallet.totalDeposits)} {wallet.currency}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Total Earnings</span>
            <span className={[styles.kpiValue, Number(wallet.totalEarnings) >= 0 ? styles.positive : styles.negative].join(' ')}>
              {fmtNum(wallet.totalEarnings)} {wallet.currency}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Return Rate</span>
            <span className={[styles.kpiValue, Number(wallet.returnRate) >= 0 ? styles.positive : styles.negative].join(' ')}>
              {fmtPct(wallet.returnRate)}
            </span>
          </div>
          {metrics.twr != null && (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>TWR</span>
              <span className={[styles.kpiValue, Number(metrics.twr) >= 0 ? styles.positive : styles.negative].join(' ')}>
                {fmtPct(metrics.twr)}
              </span>
            </div>
          )}
          {metrics.cagr != null && (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>CAGR</span>
              <span className={[styles.kpiValue, Number(metrics.cagr) >= 0 ? styles.positive : styles.negative].join(' ')}>
                {fmtPct(metrics.cagr)}
              </span>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={SNAPSHOT_COLUMNS}
        rows={sortedSnapshots}
        rowKey={(r) => r.id}
        loading={loading}
        page={table.page}
        pageSize={table.pageSize}
        totalElements={snapshots.length}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        actions={actions}
        onRowClick={openEdit}
        onAdd={() => openEdit({ ...EMPTY_SNAPSHOT })}
        addLabel="Add Snapshot"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Snapshot' : 'New Snapshot'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="560px"
      >
        <div className={styles.form}>
          <TextField
            label="Snapshot Date"
            type="date"
            value={editItem.snapshotDate ?? ''}
            onChange={(e) => setEditItem((s) => ({ ...s, snapshotDate: e.target.value }))}
          />
          <NumberField
            label="Portfolio Value"
            value={editItem.portfolioValue ?? 0}
            onChange={(v) => setEditItem((s) => ({ ...s, portfolioValue: v === '' ? 0 : v }))}
          />
          <NumberField
            label="Monthly Deposit"
            value={editItem.monthlyDeposit ?? 0}
            onChange={(v) => setEditItem((s) => ({ ...s, monthlyDeposit: v === '' ? 0 : v }))}
          />
          <NumberField
            label="Monthly Withdrawal"
            value={editItem.monthlyWithdrawal ?? 0}
            onChange={(v) => setEditItem((s) => ({ ...s, monthlyWithdrawal: v === '' ? 0 : v }))}
          />
          <NumberField
            label="Monthly Earnings"
            value={editItem.monthlyEarnings ?? 0}
            onChange={(v) => setEditItem((s) => ({ ...s, monthlyEarnings: v === '' ? 0 : v }))}
          />
          <TextField
            label="Notes"
            value={editItem.notes ?? ''}
            onChange={(e) => setEditItem((s) => ({ ...s, notes: e.target.value }))}
          />
        </div>
      </Dialog>
    </div>
  )
}
