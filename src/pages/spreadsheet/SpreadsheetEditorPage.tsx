import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaSave, FaArrowLeft, FaPlus } from 'react-icons/fa'
import { spreadsheetApi } from '../../api/spreadsheet'
import {
  type SpreadsheetRow,
  type SpreadsheetCell,
  getColumnHeader,
  detectCellType,
  serializeRows,
} from '../../api/spreadsheetTypes'
import { useNotification } from '../../components/ui/Notification'
import { Button } from '../../components/ui/Button'
import styles from './SpreadsheetEditorPage.module.css'

const MIN_COLS = 5
const MIN_ROWS = 10

function ensureMinSize(rows: SpreadsheetRow[]): SpreadsheetRow[] {
  if (rows.length === 0) {
    const result: SpreadsheetRow[] = []
    for (let r = 1; r <= MIN_ROWS; r++) {
      result.push({
        rowNumber: r,
        rowId: crypto.randomUUID(),
        cells: Array.from({ length: MIN_COLS }, (_, ci) => ({
          cellId: getColumnHeader(ci + 1) + r,
          rowNumber: r,
          columnNumber: ci + 1,
          value: '',
          formula: null,
          cellType: 'EMPTY' as const,
        })),
      })
    }
    return result
  }
  return rows
}

export function SpreadsheetEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()

  const [name, setName] = useState('')
  const [rows, setRows] = useState<SpreadsheetRow[]>([])
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; rowNumber?: number; colNumber?: number
  } | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const tableRef = useRef<HTMLTableElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const numCols = rows[0]?.cells.length ?? MIN_COLS

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    spreadsheetApi.getData(id)
      .then((r) => {
        setName(r.data.name)
        setRows(ensureMinSize(r.data.rows ?? []))
        setColumnWidths(r.data.columnWidths ?? {})
      })
      .catch(() => showError('Failed to load spreadsheet'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const getCellById = (rs: SpreadsheetRow[], cellId: string): SpreadsheetCell | null => {
    for (const row of rs) {
      for (const cell of row.cells) {
        if (cell.cellId === cellId) return cell
      }
    }
    return null
  }

  const updateCell = (cellId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          if (cell.cellId !== cellId) return cell
          const cellType = detectCellType(value)
          return { ...cell, value, formula: cellType === 'FORMULA' ? value : null, cellType }
        }),
      }))
    )
  }

  const startEdit = (cell: SpreadsheetCell) => {
    setEditingCell(cell.cellId)
    setEditValue(cell.formula ?? String(cell.value ?? ''))
    setActiveCell(cell.cellId)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = () => {
    if (editingCell) {
      updateCell(editingCell, editValue)
      setEditingCell(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, cell: SpreadsheetCell) => {
    if (e.key === 'Enter') {
      commitEdit()
      const nextRow = rows.find((r) => r.rowNumber === cell.rowNumber + 1)
      if (nextRow) {
        const nextCell = nextRow.cells.find((c) => c.columnNumber === cell.columnNumber)
        if (nextCell) startEdit(nextCell)
      }
      e.preventDefault()
    } else if (e.key === 'Tab') {
      commitEdit()
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const handleSave = async () => {
    if (!id) return
    commitEdit()
    setSaveState('saving')
    try {
      const body = serializeRows(rows)
      const colWidthsBody = JSON.stringify(columnWidths)
      await spreadsheetApi.saveData(id, body, colWidthsBody)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
      showSuccess('Saved')
    } catch {
      showError('Save failed')
      setSaveState('idle')
    }
  }

  const handleEvaluate = async () => {
    if (!id) return
    commitEdit()
    try {
      const body = serializeRows(rows)
      const res = await spreadsheetApi.evaluate(id, body)
      setRows(ensureMinSize(res.data ?? []))
    } catch {
      showError('Formula evaluation failed')
    }
  }

  const handleAddRow = async () => {
    if (!id) return
    commitEdit()
    const lastRow = rows[rows.length - 1]?.rowNumber ?? rows.length
    try {
      const res = await spreadsheetApi.rowOperation(id, serializeRows(rows), 'ADD_BELOW', lastRow)
      setRows(res.data ?? rows)
    } catch { showError('Failed to add row') }
  }

  const handleAddCol = async () => {
    if (!id) return
    commitEdit()
    const lastCol = rows[0]?.cells.length ?? 0
    try {
      const res = await spreadsheetApi.columnOperation(id, serializeRows(rows), 'ADD_RIGHT', lastCol)
      setRows(res.data ?? rows)
    } catch { showError('Failed to add column') }
  }

  const handleRowContextAction = async (action: string, rowNumber: number) => {
    if (!id) return
    setContextMenu(null)
    commitEdit()
    try {
      const res = await spreadsheetApi.rowOperation(id, serializeRows(rows), action, rowNumber)
      setRows(res.data ?? rows)
    } catch { showError('Row operation failed') }
  }

  const handleColContextAction = async (action: string, colNumber: number) => {
    if (!id) return
    setContextMenu(null)
    commitEdit()
    try {
      const res = await spreadsheetApi.columnOperation(id, serializeRows(rows), action, colNumber)
      setRows(res.data ?? rows)
    } catch { showError('Column operation failed') }
  }

  const handleFindReplaceAll = () => {
    if (!findText) return
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          if (String(cell.value ?? '') === findText) {
            const cellType = detectCellType(replaceText)
            return { ...cell, value: replaceText, formula: cellType === 'FORMULA' ? replaceText : null, cellType }
          }
          return cell
        }),
      }))
    )
    setFindOpen(false)
  }

  const displayValue = (cell: SpreadsheetCell) => {
    if (editingCell === cell.cellId) return editValue
    if (cell.value === null || cell.value === undefined) return ''
    return String(cell.value)
  }

  const activeCellData = activeCell ? getCellById(rows, activeCell) : null
  const formulaBarValue = activeCellData
    ? (activeCellData.formula ?? String(activeCellData.value ?? ''))
    : ''

  if (loading) return <div className={styles.loading}>Loading…</div>

  return (
    <div className={styles.page} onClick={() => setContextMenu(null)}>
      {/* Header */}
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/spreadsheet')}>
          <FaArrowLeft /> Back
        </Button>
        <span className={styles.sheetName}>{name}</span>
        <div className={styles.headerActions}>
          <Button variant="secondary" size="sm" onClick={() => setFindOpen(true)}>
            Find &amp; Replace
          </Button>
          <Button variant="secondary" size="sm" onClick={handleAddRow}>
            <FaPlus /> Row
          </Button>
          <Button variant="secondary" size="sm" onClick={handleAddCol}>
            <FaPlus /> Column
          </Button>
          <Button variant="secondary" size="sm" onClick={handleEvaluate}>
            Evaluate
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            <FaSave />{' '}
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Formula bar */}
      <div className={styles.formulaBar}>
        <span className={styles.cellRef}>{activeCell ?? ''}</span>
        <span className={styles.formulaEq}>fx</span>
        <input
          className={styles.formulaInput}
          readOnly
          value={formulaBarValue}
          placeholder="Select a cell…"
        />
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table} ref={tableRef}>
          <thead>
            <tr>
              <th className={styles.cornerCell} />
              {Array.from({ length: numCols }, (_, ci) => (
                <th
                  key={ci}
                  className={styles.colHeader}
                  style={columnWidths[ci + 1] ? { width: `${columnWidths[ci + 1]}px` } : undefined}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({ x: e.clientX, y: e.clientY, colNumber: ci + 1 })
                  }}
                >
                  {getColumnHeader(ci + 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowId ?? row.rowNumber}>
                <td
                  className={styles.rowHeader}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({ x: e.clientX, y: e.clientY, rowNumber: row.rowNumber })
                  }}
                >
                  {row.rowNumber}
                </td>
                {row.cells.map((cell) => {
                  const isActive = activeCell === cell.cellId
                  const isEditing = editingCell === cell.cellId
                  const isFormula = cell.cellType === 'FORMULA'
                  return (
                    <td
                      key={cell.cellId}
                      className={[
                        styles.cell,
                        isActive ? styles.cellActive : '',
                        isFormula && !isActive ? styles.cellFormula : '',
                      ].join(' ')}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveCell(cell.cellId)
                        if (!isEditing) commitEdit()
                      }}
                      onDoubleClick={() => startEdit(cell)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          className={styles.cellInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => handleKeyDown(e, cell)}
                        />
                      ) : (
                        <span className={styles.cellText}>{displayValue(cell)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.rowNumber !== undefined && (
            <>
              <button className={styles.menuItem} onClick={() => handleRowContextAction('ADD_ABOVE', contextMenu.rowNumber!)}>Insert row above</button>
              <button className={styles.menuItem} onClick={() => handleRowContextAction('ADD_BELOW', contextMenu.rowNumber!)}>Insert row below</button>
              <button className={styles.menuItem} onClick={() => handleRowContextAction('DUPLICATE', contextMenu.rowNumber!)}>Duplicate row</button>
              <div className={styles.menuDivider} />
              <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => handleRowContextAction('DELETE', contextMenu.rowNumber!)}>Delete row</button>
            </>
          )}
          {contextMenu.colNumber !== undefined && (
            <>
              <button className={styles.menuItem} onClick={() => handleColContextAction('ADD_LEFT', contextMenu.colNumber!)}>Insert column left</button>
              <button className={styles.menuItem} onClick={() => handleColContextAction('ADD_RIGHT', contextMenu.colNumber!)}>Insert column right</button>
              <button className={styles.menuItem} onClick={() => handleColContextAction('DUPLICATE', contextMenu.colNumber!)}>Duplicate column</button>
              <div className={styles.menuDivider} />
              <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => handleColContextAction('DELETE', contextMenu.colNumber!)}>Delete column</button>
            </>
          )}
        </div>
      )}

      {/* Find & Replace */}
      {findOpen && (
        <div className={styles.overlay} onClick={() => setFindOpen(false)}>
          <div className={styles.findDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.findTitle}>Find &amp; Replace</h3>
            <input
              className={styles.findInput}
              placeholder="Find"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
            />
            <input
              className={styles.findInput}
              placeholder="Replace with"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
            <div className={styles.findActions}>
              <Button variant="primary" size="sm" onClick={handleFindReplaceAll}>Replace All</Button>
              <Button variant="secondary" size="sm" onClick={() => setFindOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
