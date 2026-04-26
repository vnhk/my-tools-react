import { useCallback } from 'react'
import { useNotification } from '../components/ui/Notification'
import type { TableAction } from '../components/table/DataTable'

// React equivalent of BervanTableToolbar

interface UseTableActionsOptions<T> {
  onDelete?: (items: T[]) => Promise<void>
  onEdit?: (item: T) => void
  onExport?: (items: T[]) => Promise<void>
  onRefresh?: () => void
  exportable?: boolean
}

export function useTableActions<T>({
  onDelete,
  onEdit,
  onExport,
  onRefresh,
  exportable = false,
}: UseTableActionsOptions<T>): TableAction<T>[] {
  const { showSuccess, showError } = useNotification()

  const handleDelete = useCallback(
    async (selected: T[]) => {
      if (!onDelete) return
      if (!window.confirm(`Delete ${selected.length} item(s)?`)) return
      try {
        await onDelete(selected)
        showSuccess(`Removed ${selected.length} item(s)`)
        onRefresh?.()
      } catch {
        showError('Failed to delete selected items')
      }
    },
    [onDelete, onRefresh, showSuccess, showError]
  )

  const handleExport = useCallback(
    async (selected: T[]) => {
      if (!onExport) return
      try {
        await onExport(selected)
      } catch {
        showError('Failed to export selected items')
      }
    },
    [onExport, showError]
  )

  const handleEdit = useCallback(
    (selected: T[]) => {
      if (!onEdit) return
      if (selected.length !== 1) {
        showError("Can't edit more than one item at a time!")
        return
      }
      onEdit(selected[0])
    },
    [onEdit, showError]
  )

  const actions: TableAction<T>[] = []

  if (onEdit) {
    actions.push({
      label: 'Edit',
      variant: 'primary',
      onClick: handleEdit,
      requiresSelection: true,
    })
  }

  if (exportable && onExport) {
    actions.push({
      label: 'Export',
      variant: 'success',
      onClick: handleExport,
      requiresSelection: true,
    })
  }

  if (onDelete) {
    actions.push({
      label: 'Delete',
      variant: 'danger',
      onClick: handleDelete,
      requiresSelection: true,
    })
  }

  return actions
}
