import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '../components/table/DataTable'
import { useTableState } from '../hooks/useTableState'
import { asyncTasksApi, type AsyncTask } from '../api/asyncTasks'

const COLUMNS = [
  { key: 'status', header: 'Status', sortable: true },
  { key: 'message', header: 'Message' },
  { key: 'creationDate', header: 'Created', sortable: true },
  { key: 'modificationDate', header: 'Modified', sortable: true },
  { key: 'startDate', header: 'Started' },
  { key: 'endDate', header: 'Ended' },
  { key: 'timeoutInMin', header: 'Timeout (min)' },
]

export function AsyncTaskListPage() {
  const navigate = useNavigate()
  const table = useTableState({ sortBy: 'modificationDate', sortDir: 'desc' })
  const [rows, setRows] = useState<AsyncTask[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    asyncTasksApi
      .getAll({
        page: table.page,
        size: table.pageSize,
        sort: table.sortBy,
        direction: table.sortDir,
        search: table.search || undefined,
      })
      .then((res) => {
        setRows(res.data.content)
        setTotal(res.data.totalElements)
      })
      .finally(() => setLoading(false))
  }, [table.page, table.pageSize, table.sortBy, table.sortDir, table.search])

  return (
    <div>
      <h2>Async Tasks</h2>
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
        searchValue={table.search}
        onSearchChange={table.setSearch}
        onRowClick={(row) => navigate(`/async/async-tasks/${row.id}`)}
      />
    </div>
  )
}
