import {useNotification} from "../../components/ui/Notification.tsx";
import {useEffect, useMemo, useState} from "react";
import {budgetEntriesApi, BudgetEntry} from "../../api/investments.ts";
import {validateFields} from "../../api/entityConfig.ts";
import styles from "./BudgetEntriesPage.module.css";
import {Dialog} from '../../components/ui/Dialog'
import {DynamicForm} from '../../components/ui/DynamicForm'
import {fmt, getCategoryIcon, toPln} from "./BudgetEntriesPage.tsx";
import {ScanReceipt} from "./ScanReceipt";

function monthToDefaultDate(k: string): string {
    const {month, year} = parseMonthKey(k)
    const now = new Date()
    if (now.getFullYear() === year && now.getMonth() + 1 === month)
        return now.toISOString().slice(0, 10)
    const last = new Date(year, month, 0).getDate()
    return `${year}-${String(month).padStart(2, '0')}-${last}`
}

const PAYMENT_ICONS: Record<string, string> = {Cash: '💵', Card: '💳', Transfer: '🏦'}

const EMPTY_ENTRY: Partial<BudgetEntry> = {
    name: '', category: null, currency: 'PLN', value: 0,
    entryDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Card', entryType: 'Expense', isRecurring: false,
    tags: '',
    notes: ''
}

function parseMonthKey(k: string) {
    const [m, y] = k.split('-')
    return {month: parseInt(m), year: parseInt(y)}
}

function formatMonthKey(k: string): string {
    const {month, year} = parseMonthKey(k)
    return `${MONTH_NAMES[month - 1]} ${year}`
}

interface MonthGroup {
    key: string;
    label: string;
    balance: number;
    categories: CategoryGroup[]
}

function monthKey(e: BudgetEntry): string {
    if (!e.entryDate) return '0-0'
    const [y, m] = e.entryDate.split('-')
    return `${parseInt(m)}-${y}`
}

// ── Shared types & helpers ────────────────────────────────────────────────────

interface CategoryGroup {
    name: string;
    balance: number;
    items: BudgetEntry[]
}


const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Budget Tree Tab ───────────────────────────────────────────────────────────

interface TreeTabProps {
    entries: BudgetEntry[]
    categories: string[]
    onReload: () => void
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
            return {name, balance: bal, items}
        })
        return {key, label: formatMonthKey(key), balance: monthBalance, categories}
    })
}


export function BudgetTreeTab({entries, categories, onReload}: TreeTabProps) {
    const {showSuccess, showError} = useNotification()

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

    const [editOpen, setEditOpen] = useState(false)
    const [bulkEditOpen, setBulkEditOpen] = useState(false)
    const [bulkEditField, setBulkEditField] = useState<keyof BudgetEntry>("id")
    const [bulkEditValue, setBulkEditValue] = useState<unknown>(null)
    const [editItem, setEditItem] = useState<Partial<BudgetEntry>>(EMPTY_ENTRY)
    const [bulkEditItems, setBulkEditItems] = useState<Array<BudgetEntry>>([])
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

    const toggle = <T, >(set: Set<T>, k: T): Set<T> => {
        const s = new Set(set);
        s.has(k) ? s.delete(k) : s.add(k);
        return s
    }

    const expandAll = () => {
        setExpandedMonths(new Set(tree.map(m => m.key)))
        const cats = new Set<string>()
        tree.forEach(m => m.categories.forEach(c => cats.add(`${m.key}::${c.name}`)))
        setExpandedCats(cats)
    }

    const collapseAll = () => {
        setExpandedMonths(new Set());
        setExpandedCats(new Set())
    }

    const bulkUpdateFields =
        [
            {name: "Name", field: "name"},
            {name: "Category", field: "category"},
            {name: "Value", field: "value"},
            {name: "Date", field: "entryDate"},
            {name: "Payment Method", field: "paymentMethod"},
            {name: "Entry Type", field: "entryType"},
            {name: "Notes", field: "notes"},
            {name: "Tags", field: "tags"},
            {name: "Is Recurring", field: "isRecurring"},
            {name: "Currency", field: "currency"}
        ]

    const openAdd = (date?: string, category?: string) => {
        setEditItem({
            ...EMPTY_ENTRY,
            entryDate: date ?? new Date().toISOString().slice(0, 10),
            category: category || null
        })
        setFormErrors({})
        setEditOpen(true)
    }

    const openEdit = () => {
        const e = entries.find(x => x.id === [...selectedIds][0])
        if (!e) return
        setEditItem({...e})
        setFormErrors({})
        setEditOpen(true)
    }

    const openBulkUpdate = () => {
        const selected = new Array<BudgetEntry>();

        for (const e of entries) {
            if (selectedIds.has(e.id)) {
                selected.push(e);
            }
        }

        console.log('selected', selected)
        if (!selected) return
        // setFormErrors({})
        setBulkEditItems(selected)
        setBulkEditOpen(true)
    }

    const handleBulkSave = async () => {
        const updatedItems = bulkEditItems.map(item => ({
            ...item,
            [bulkEditField]: bulkEditValue
        }))

        for (const bulkEditItem of updatedItems) {
            const errors = validateFields(
                'BudgetEntry',
                bulkEditItem as Record<string, unknown>,
                'edit'
            )

            if (Object.keys(errors).length > 0) {
                setFormErrors(errors)
                return
            }
        }

        try {
            for (const bulkEditItem of updatedItems) {
                await budgetEntriesApi.update(
                    bulkEditItem.id,
                    bulkEditItem
                )
            }

            showSuccess(`Updated ${updatedItems.length} item(s)`)
            setBulkEditOpen(false)
            setBulkEditItems([])
            setSelectedIds(new Set())
            onReload()

        } catch {
            showError('Failed to save')
        }
    }

    const handleSave = async () => {
        const errors = validateFields('BudgetEntry', editItem as Record<string, unknown>, editItem.id ? 'edit' : 'save')
        if (!editItem.category?.trim()) errors.category = 'Category is required'
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return
        }
        try {
            editItem.id
                ? await budgetEntriesApi.update(editItem.id, editItem)
                : await budgetEntriesApi.create(editItem)
            showSuccess('Saved')
            setEditOpen(false)
            setSelectedIds(new Set())
            onReload()
        } catch {
            showError('Failed to save')
        }
    }

    const handleDelete = async () => {
        if (!selectedIds.size) return
        try {
            for (const id of selectedIds) await budgetEntriesApi.delete(id)
            showSuccess(`Deleted ${selectedIds.size} item(s)`)
            setSelectedIds(new Set())
            onReload()
        } catch {
            showError('Failed to delete')
        }
    }

    const handleCopy = async () => {
        if (!copyDate) return
        try {
            for (const id of selectedIds) {
                const e = entries.find(x => x.id === id)
                if (e) await budgetEntriesApi.create({...e, id: undefined, entryDate: copyDate})
            }
            showSuccess('Copied')
            setCopyOpen(false)
            setCopyDate('')
            onReload()
        } catch {
            showError('Failed to copy')
        }
    }

    const handleMove = async () => {
        try {
            for (const id of selectedIds) {
                const e = entries.find(x => x.id === id)
                if (!e) continue
                const upd: Partial<BudgetEntry> = {...e}
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
        } catch {
            showError('Failed to move')
        }
    }

    const has = selectedIds.size > 0
    const single = selectedIds.size === 1

    return (
        <div className={styles.treeTabWrap}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <button className={styles.toolBtn} onClick={expandAll}>Expand All</button>
                <button className={styles.toolBtn} onClick={collapseAll}>Collapse All</button>
                <button className={`${styles.toolBtn} ${styles.danger}`} disabled={!has} onClick={handleDelete}>Delete
                </button>
                <button className={`${styles.toolBtn} ${styles.primary}`} disabled={!has} onClick={openBulkUpdate}>Bulk
                    Update
                </button>
                <button className={`${styles.toolBtn} ${styles.primary}`} disabled={!has}
                        onClick={() => setCopyOpen(true)}>Copy
                </button>
                <button className={`${styles.toolBtn} ${styles.primary}`} disabled={!single} onClick={openEdit}>Edit
                </button>
                <button className={`${styles.toolBtn} ${styles.warning}`} disabled={!has}
                        onClick={() => setMoveOpen(true)}>Move
                </button>
                <span>
                    <ScanReceipt
                        categories={categories}
                        onReload={onReload}
                    />
                </span>
                <button className={`${styles.toolBtn} ${styles.success}`} onClick={() => openAdd()}>+ New Entry</button>
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
                    <span className={styles.colCheck}/>
                </div>

                {tree.length === 0 && <div className={styles.stateMsg}>No entries</div>}

                {tree.map(month => {
                    const mExp = expandedMonths.has(month.key)
                    return (
                        <div key={month.key}>
                            <div className={`${styles.treeRow} ${styles.monthRow}`}
                                 onClick={() => setExpandedMonths(toggle(expandedMonths, month.key))}>
                <span className={styles.colName}>
                  <span className={styles.chevron}>{mExp ? '▼' : '▶'}</span>
                    {month.label}
                </span>
                                <span
                                    className={`${styles.colAmount} ${month.balance >= 0 ? styles.income : styles.expense}`}>
                  {month.balance >= 0 ? '' : '−'}{fmt(month.balance)}
                </span>
                                <span className={styles.colPayment}/><span className={styles.colDate}/><span
                                className={styles.colNotes}/>
                                <span className={styles.colCheck}>
                  <button className={styles.plusBtn}
                          onClick={e => {
                              e.stopPropagation();
                              openAdd(monthToDefaultDate(month.key), '')
                          }}>+</button>
                </span>
                            </div>

                            {mExp && month.categories.map(cat => {
                                const ck = `${month.key}::${cat.name}`
                                const cExp = expandedCats.has(ck)
                                return (
                                    <div key={ck}>
                                        <div className={`${styles.treeRow} ${styles.catRow}`}
                                             onClick={() => setExpandedCats(toggle(expandedCats, ck))}>
                      <span className={styles.colName}>
                        <span className={styles.catIndent}/>
                        <span className={styles.chevron}>{cExp ? '▼' : '▶'}</span>
                        <span className={styles.catIcon}>{getCategoryIcon(cat.name)}</span>
                          {cat.name}
                      </span>
                                            <span
                                                className={`${styles.colAmount} ${cat.balance >= 0 ? styles.income : styles.expense}`}>
                        {cat.balance >= 0 ? '' : '−'}{fmt(cat.balance)}
                      </span>
                                            <span className={styles.colPayment}/><span className={styles.colDate}/><span
                                            className={styles.colNotes}/>
                                            <span className={styles.colCheck}>
                        <button className={styles.plusBtn}
                                onClick={e => {
                                    e.stopPropagation();
                                    openAdd(monthToDefaultDate(month.key), cat.name)
                                }}>+</button>
                      </span>
                                        </div>

                                        {cExp && cat.items.map(item => (
                                            <div key={item.id}
                                                 className={`${styles.treeRow} ${styles.itemRow} ${selectedIds.has(item.id) ? styles.itemSelected : ''}`}
                                                 onClick={() => setSelectedIds(toggle(selectedIds, item.id))}>
                        <span className={styles.colName}>
                          <span className={styles.itemIndent}/>
                            {item.name}
                        </span>
                                                <span
                                                    className={`${styles.colAmount} ${item.entryType === 'Income' ? styles.income : styles.expense}`}>
                          {item.entryType === 'Income' ? '' : '−'}{fmt(Number(item.value), item.currency ?? 'PLN')}
                        </span>
                                                <span
                                                    className={styles.colPayment}>{PAYMENT_ICONS[item.paymentMethod ?? ''] ?? item.paymentMethod ?? ''}</span>
                                                <span
                                                    className={styles.colDate}>{item.entryDate ? item.entryDate.slice(5).replace('-', '.') : ''}</span>
                                                <span className={styles.colNotes}>{item.notes ?? ''}</span>
                                                <span className={styles.colCheck}>
                          <input type="checkbox" checked={selectedIds.has(item.id)}
                                 onChange={() => setSelectedIds(toggle(selectedIds, item.id))}
                                 onClick={e => e.stopPropagation()}/>
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
                    onClose={() => setEditOpen(false)} onConfirm={handleSave} width="min(90vw, 720px)">
                <div className={styles.dialogField}>
                    <label className={styles.dialogLabel} htmlFor="entry-category">Category</label>
                    <input
                        id="entry-category"
                        type="text"
                        list="entry-category-list"
                        className={styles.dialogInput}
                        value={editItem.category ?? ''}
                        onChange={e => setEditItem(s => ({...s, category: e.target.value || null}))}
                    />
                    <datalist id="entry-category-list">
                        {categories.map(c => <option key={c} value={c}/>)}
                    </datalist>
                    {formErrors.category && <span
                        style={{color: 'var(--color-danger, red)', fontSize: '0.8em'}}>{formErrors.category}</span>}
                </div>
                <DynamicForm entityName="BudgetEntry" mode={editItem.id ? 'edit' : 'save'}
                             values={editItem as Record<string, unknown>}
                             onChange={(field, value) => setEditItem(s => ({...s, [field]: value}))}
                             errors={formErrors} dynamicOptions={{category: categories}}/>
            </Dialog>

            <Dialog open={bulkEditOpen} title={'Bulk Update'}
                    onClose={() => setBulkEditOpen(false)} onConfirm={handleBulkSave} width="min(90vw, 720px)">
                <div className={styles.dialogField}>
                    <label className={styles.dialogLabel} htmlFor="entry-category">Field</label>
                    <select id="entry-bulk-update-field-list" value={undefined}
                            onChange={e => setBulkEditField(e.target.value as keyof BudgetEntry)}>
                        <option value="null">Select a field</option>
                        {bulkUpdateFields.map(c => <option key={c.field} value={c.field}>{c.name}</option>)}
                    </select>
                    {bulkEditField !== 'id' &&
                        <div className={styles.dialogField} style={{marginTop: 12}}>
                            <span>Set values:</span>
                            <br/>
                            <div>{bulkEditItems.map(e => (<div key={e.id}>{e[bulkEditField]}</div>))}</div>
                            <DynamicForm
                                entityName="BudgetEntry"
                                mode="edit"
                                values={{
                                    [bulkEditField]: bulkEditValue
                                }}
                                skip={bulkUpdateFields
                                    .filter(f => f.field !== bulkEditField)
                                    .map(f => f.field)}
                                onChange={(_, value) => {
                                    setBulkEditValue(value)
                                }}
                            />
                        </div>
                    }
                </div>
            </Dialog>

            <Dialog open={copyOpen} title="Copy to date" onClose={() => setCopyOpen(false)} onConfirm={handleCopy}>
                <div className={styles.dialogField}>
                    <label className={styles.dialogLabel}>New date</label>
                    <input type="date" className={styles.dialogInput} value={copyDate}
                           onChange={e => setCopyDate(e.target.value)}/>
                </div>
            </Dialog>

            <Dialog open={moveOpen} title="Move entries" onClose={() => setMoveOpen(false)} onConfirm={handleMove}>
                <div className={styles.dialogField}>
                    <label className={styles.dialogLabel}>New date (leave empty to keep)</label>
                    <input type="date" className={styles.dialogInput} value={moveDate}
                           onChange={e => setMoveDate(e.target.value)}/>
                </div>
                <div className={styles.dialogField} style={{marginTop: 12}}>
                    <label className={styles.dialogLabel}>New category (leave empty to keep)</label>
                    <input type="text" className={styles.dialogInput} list="move-cats" value={moveCategory}
                           onChange={e => setMoveCategory(e.target.value)}/>
                    <datalist id="move-cats">{categories.map(c => <option key={c} value={c}/>)}</datalist>
                </div>
            </Dialog>
        </div>
    )
}