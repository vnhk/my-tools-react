import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DataTable } from '../components/table/DataTable'
import { useTableState } from '../hooks/useTableState'
import { asyncTasksApi, type AsyncTask, type AsyncTaskHistory } from '../api/asyncTasks'
import styles from './AsyncTaskDetailsPage.module.css'

const HISTORY_COLUMNS = [
  { key: 'modificationDate', header: 'Date', sortable: true },
  { key: 'status', header: 'Status' },
  { key: 'message', header: 'Message' },
]

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value ?? '—'}</span>
    </div>
  )
}

export function AsyncTaskDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<AsyncTask | null>(null)
  const [history, setHistory] = useState<AsyncTaskHistory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const table = useTableState({ sortBy: 'modificationDate', sortDir: 'desc' })

  useEffect(() => {
    if (!id) return
    asyncTasksApi.getById(id).then((res) => setTask(res.data))
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    asyncTasksApi
      .getHistory(id, {
        page: table.page,
        size: table.pageSize,
        sort: table.sortBy,
        direction: table.sortDir,
      })
      .then((res) => {
        setHistory(res.data.content)
        setTotal(res.data.totalElements)
      })
      .finally(() => setLoading(false))
  }, [id, table.page, table.pageSize, table.sortBy, table.sortDir])

  if (!task) return <div>Loading…</div>

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/async/async-tasks')}>
        ← Back to list
      </button>

      <div className={styles.card}>
        <h2>Task Details</h2>
        <div className={styles.grid}>
          <Field label="ID" value={task.id} />
          <Field label="Status" value={task.status} />
          <Field label="Message" value={task.message} />
          <Field label="Created" value={task.creationDate} />
          <Field label="Modified" value={task.modificationDate} />
          <Field label="Started" value={task.startDate} />
          <Field label="Ended" value={task.endDate} />
          <Field label="Timeout (min)" value={String(task.timeoutInMin)} />
        </div>
      </div>

      <div className={styles.history}>
        <h3>History</h3>
        <DataTable
          columns={HISTORY_COLUMNS}
          rows={history}
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
        />
      </div>
    </div>
  )
}
