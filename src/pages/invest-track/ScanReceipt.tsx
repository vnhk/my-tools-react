import {useNotification} from "../../components/ui/Notification.tsx";
import {useRef, useState} from "react";
import {budgetEntriesApi, BudgetEntry} from "../../api/investments.ts";
import {validateFields} from "../../api/entityConfig.ts";
import {DynamicFormDialog} from "../../components/ui/DynamicFormDialog.tsx";
import {DynamicForm} from "../../components/ui/DynamicForm";
import styles from "./BudgetEntriesPage.module.css";
import {LuChevronLeft, LuChevronRight, LuBan, LuCheck, LuScanLine} from 'react-icons/lu';

interface ScanReceiptProps {
    categories: string[]
    onReload: () => void
}

interface ScannedItem {
    entry: Partial<BudgetEntry>
    skipped: boolean
    errors: Record<string, string>
}

export function ScanReceipt({categories, onReload}: ScanReceiptProps) {
    const {showSuccess, showError} = useNotification()

    const scanInputRef = useRef<HTMLInputElement>(null)

    const [scanOpen, setScanOpen] = useState(false)
    const [scanPreview, setScanPreview] = useState<string | null>(null)
    const [scanDate] = useState(new Date().toISOString().slice(0, 10))

    const [items, setItems] = useState<ScannedItem[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)

    const handleCaptureImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = event => {
            const base64 = event.target?.result as string
            setScanPreview(base64)
            setScanOpen(true)
            void handleScanReceipt(base64)
        }
        reader.readAsDataURL(file)
    }

    const handleScanReceipt = async (imageBase64?: string) => {
        const payload = imageBase64 ?? scanPreview
        if (!payload) {
            showError("No image selected")
            return
        }

        try {
            const result = await budgetEntriesApi.scanReceipt(payload, scanDate)
            const rawItems: Partial<BudgetEntry>[] = (result as any)?.data ?? result

            if (Array.isArray(rawItems) && rawItems.length) {
                const prepared: ScannedItem[] = rawItems.map(item => ({
                    entry: {...item},
                    skipped: false,
                    errors: {}
                }))
                setItems(prepared)
                setCurrentIndex(0)
                showSuccess(`Successfully scanned ${rawItems.length} items`)
            } else {
                setItems([])
                showError("No items found on the receipt")
            }
        } catch {
            showError("Failed to scan receipt")
        }
    }

    const updateCurrentField = (field: string, value: unknown) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== currentIndex) return item
            const updatedEntry = {...item.entry, [field]: value}
            const updatedErrors = {...item.errors}
            delete updatedErrors[field]
            return {
                ...item,
                entry: updatedEntry,
                errors: updatedErrors
            }
        }))
    }

    const toggleCurrentSkip = () => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== currentIndex) return item
            return {
                ...item,
                skipped: !item.skipped,
                errors: {}
            }
        }))
    }

    const handleSaveAll = async () => {
        const activeItemsWithIndex = items
            .map((item, index) => ({item, index}))
            .filter(({item}) => !item.skipped)

        if (activeItemsWithIndex.length === 0) {
            showError("No entries to save (all items are skipped)")
            return
        }

        // Validate all active items
        let hasErrors = false
        let firstErrorIdx = -1

        const updatedItems = items.map((item, idx) => {
            if (item.skipped) return item
            const errors = validateFields(
                "BudgetEntry",
                item.entry as Record<string, unknown>,
                "save"
            )
            if (!item.entry.category?.trim()) {
                errors.category = "Category is required"
            }
            if (Object.keys(errors).length > 0) {
                hasErrors = true
                if (firstErrorIdx === -1) firstErrorIdx = idx
                return {...item, errors}
            }
            return {...item, errors: {}}
        })

        if (hasErrors) {
            setItems(updatedItems)
            if (firstErrorIdx !== -1) {
                setCurrentIndex(firstErrorIdx)
                showError(`Please fix validation errors on entry ${firstErrorIdx + 1}`)
            }
            return
        }

        try {
            for (const {item} of activeItemsWithIndex) {
                await budgetEntriesApi.create(item.entry)
            }

            const skippedCount = items.length - activeItemsWithIndex.length
            showSuccess(
                `Saved ${activeItemsWithIndex.length} entry/entries${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`
            )

            onReload()
            setScanOpen(false)
            setItems([])
            setCurrentIndex(0)
        } catch {
            showError("Failed to save scanned entries")
        }
    }

    const current = items[currentIndex]
    const activeCount = items.filter(i => !i.skipped).length
    const totalCount = items.length

    return (
        <div className={styles.treeTabWrap}>
            <button
                className={`${styles.toolBtn} ${styles.primary}`}
                onClick={() => {
                    setScanOpen(true)
                    setItems([])
                    setScanPreview(null)
                    setCurrentIndex(0)
                    scanInputRef.current?.click()
                }}
            >
                <LuScanLine size={14} /> Scan Receipt
            </button>

            <input
                ref={scanInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{display: "none"}}
                onChange={handleCaptureImage}
            />

            {/* Scan result dialog */}
            <DynamicFormDialog
                open={scanOpen && items.length > 0}
                title={`Receipt Items (${currentIndex + 1} of ${totalCount})`}
                confirmLabel={
                    activeCount > 0
                        ? `Save ${activeCount} ${activeCount === 1 ? 'Entry' : 'Entries'}`
                        : "No entries to save"
                }
                leftAdditionalButton={
                    <span style={{fontSize: '12px', color: 'var(--color-text-secondary)'}}>
                        To save: <strong style={{color: 'var(--color-text-primary)'}}>{activeCount}</strong> / {totalCount}
                    </span>
                }
                onClose={() => {
                    setScanOpen(false)
                    setItems([])
                    setCurrentIndex(0)
                }}
                onConfirm={handleSaveAll}
                width="min(90vw, 760px)">
                {current && (
                    <div className={styles.dialogField} style={{maxHeight: '65vh', overflowY: 'auto'}}>
                        {/* Stepper / Navigation controls */}
                        <div className={styles.scanNavRow}>
                            <div className={styles.scanNavLeft}>
                                <button
                                    type="button"
                                    className={styles.scanNavBtn}
                                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                                    disabled={currentIndex === 0}
                                    title="Previous item"
                                >
                                    <LuChevronLeft size={16} /> Prev
                                </button>

                                <div className={styles.scanPills}>
                                    {items.map((it, idx) => {
                                        const isCurrent = idx === currentIndex
                                        const hasErr = Object.keys(it.errors).length > 0
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={`
                                                    ${styles.scanPill}
                                                    ${isCurrent ? styles.scanPillActive : ''}
                                                    ${it.skipped ? styles.scanPillSkipped : ''}
                                                    ${hasErr ? styles.scanPillError : ''}
                                                `}
                                                onClick={() => setCurrentIndex(idx)}
                                                title={`Entry ${idx + 1}: ${it.skipped ? 'Skipped' : 'To be saved'}`}
                                            >
                                                {idx + 1}
                                            </button>
                                        )
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className={styles.scanNavBtn}
                                    onClick={() => setCurrentIndex(i => Math.min(items.length - 1, i + 1))}
                                    disabled={currentIndex === items.length - 1}
                                    title="Next item"
                                >
                                    Next <LuChevronRight size={16} />
                                </button>
                            </div>

                            <div className={styles.scanNavRight}>
                                {current.skipped ? (
                                    <span className={styles.scanStatusBadgeSkip}>
                                        <LuBan size={12} /> Skipped
                                    </span>
                                ) : (
                                    <span className={styles.scanStatusBadgeSave}>
                                        <LuCheck size={12} /> To be saved
                                    </span>
                                )}

                                <button
                                    type="button"
                                    className={`${styles.scanSkipActionBtn} ${current.skipped ? styles.isSkipped : ''}`}
                                    onClick={toggleCurrentSkip}
                                >
                                    {current.skipped ? (
                                        <>
                                            <LuCheck size={14} /> Include in save
                                        </>
                                    ) : (
                                        <>
                                            <LuBan size={14} /> Skip entry
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Form body */}
                        <div className={current.skipped ? styles.scanFormDisabled : ''}>
                            <div className={styles.dialogField}>
                                <label className={styles.dialogLabel} htmlFor="scan-category">Category</label>
                                <input
                                    id="scan-category"
                                    type="text"
                                    list="entry-category-list"
                                    className={styles.dialogInput}
                                    value={current.entry.category ?? ''}
                                    onChange={e => updateCurrentField('category', e.target.value || null)}
                                />
                                <datalist id="entry-category-list">
                                    {categories.map(c => <option key={c} value={c}/>)}
                                </datalist>
                                {current.errors.category && (
                                    <span style={{color: 'var(--color-danger, red)', fontSize: '0.8em'}}>
                                        {current.errors.category}
                                    </span>
                                )}
                            </div>

                            <DynamicForm
                                entityName="BudgetEntry"
                                mode="save"
                                values={current.entry as Record<string, unknown>}
                                onChange={(field, value) => updateCurrentField(field, value)}
                                errors={current.errors}
                                dynamicOptions={{category: categories}}
                                skip={['category']}
                            />
                        </div>
                    </div>
                )}
            </DynamicFormDialog>
        </div>
    )
}