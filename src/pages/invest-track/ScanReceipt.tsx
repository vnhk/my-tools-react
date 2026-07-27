import {useNotification} from "../../components/ui/Notification.tsx";
import {useRef, useState} from "react";
import {budgetEntriesApi, BudgetEntry} from "../../api/investments.ts";
import {validateFields} from "../../api/entityConfig.ts";
import {Dialog} from "../../components/ui/Dialog";
import {DynamicForm} from "../../components/ui/DynamicForm";
import styles from "./BudgetEntriesPage.module.css";

interface ScanReceiptProps {
    categories: string[]
    onReload: () => void
}

export function ScanReceipt({categories, onReload}: ScanReceiptProps) {
    const {showSuccess, showError} = useNotification()

    const scanInputRef = useRef<HTMLInputElement>(null)

    const [scanOpen, setScanOpen] = useState(false)
    const [scanPreview, setScanPreview] = useState<string | null>(null)

    const [scanDate] = useState(
        new Date().toISOString().slice(0, 10)
    )

    const [scanResult, setScanResult] = useState<BudgetEntry[] | null>(null)
    const [scanIndex, setScanIndex] = useState(0)
    const [scanCurrent, setScanCurrent] =
        useState<Partial<BudgetEntry> | null>(null)

    const [scanFormErrors, setScanFormErrors] =
        useState<Record<string, string>>({})


    const handleCaptureImage = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
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


    const handleScanReceipt = async (
        imageBase64?: string
    ) => {

        const payload = imageBase64 ?? scanPreview

        if (!payload) {
            showError("No image selected")
            return
        }

        try {
            const result =
                await budgetEntriesApi.scanReceipt(
                    payload,
                    scanDate
                )
            const items =
                (result as any)?.data ?? result

            setScanResult(items)

            if (Array.isArray(items) && items.length) {

                setScanIndex(0)
                setScanCurrent({...items[0]})
                setScanFormErrors({})

            } else {
                setScanCurrent(null)
            }

            showSuccess(
                `Successfully scanned ${items.length} items`
            )

        } catch {

            showError(
                "Failed to scan receipt"
            )
        }
    }

    const handleSaveScanResult = async () => {
        if (!scanCurrent) return

        const errors =
            validateFields(
                "BudgetEntry",
                scanCurrent as Record<string, unknown>,
                "save"
            )

        if (!scanCurrent.category?.trim()) {
            errors.category =
                "Category is required"
        }

        if (Object.keys(errors).length) {
            setScanFormErrors(errors)
            return
        }

        try {
            await budgetEntriesApi.create(scanCurrent)

            const total =
                scanResult?.length ?? 0


            const next =
                scanIndex + 1


            if (
                scanResult &&
                next < total
            ) {

                setScanIndex(next)
                setScanCurrent({
                    ...scanResult[next]
                })

                setScanFormErrors({})

                showSuccess(
                    `Saved ${next} of ${total}`
                )

            } else {

                showSuccess(
                    "All entries saved"
                )

                onReload()

                setScanOpen(false)
                setScanResult(null)
                setScanCurrent(null)
                setScanIndex(0)
            }


        } catch {

            showError(
                "Failed to save scanned entry"
            )
        }
    }

    return (
        <div className={styles.treeTabWrap}>

            <button
                className={`${styles.toolBtn} ${styles.primary}`}
                onClick={() => {
                    setScanOpen(true)
                    setScanResult(null)
                    setScanPreview(null)

                    scanInputRef.current?.click()
                }}
            >
                Scan Receipt
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
            <Dialog
                open={scanOpen && !!scanCurrent}
                title={`Scanned entry ${scanIndex + 1} / ${scanResult?.length ?? 0}`}
                onClose={() => {
                    setScanOpen(false)
                    setScanCurrent(null)
                    setScanFormErrors({})
                }}
                onConfirm={handleSaveScanResult}
                width="min(90vw, 720px)">
                <div className={styles.dialogField} style={{maxHeight: '60vh', overflowY: 'auto'}}>
                    {scanCurrent ? (
                        <>
                            <div className={styles.dialogField}>
                                <label className={styles.dialogLabel} htmlFor="scan-category">Category</label>
                                <input
                                    id="scan-category"
                                    type="text"
                                    list="entry-category-list"
                                    className={styles.dialogInput}
                                    value={scanCurrent.category ?? ''}
                                    onChange={e =>
                                        setScanCurrent(prev => ({...(prev ?? {}), category: e.target.value || null}))
                                    }
                                />
                                <datalist id="entry-category-list">
                                    {categories.map(c => <option key={c} value={c}/>)}
                                </datalist>
                                {scanFormErrors.category && (
                                    <span style={{color: 'var(--color-danger, red)', fontSize: '0.8em'}}>
                    {scanFormErrors.category}
                  </span>)}
                            </div>

                            <DynamicForm
                                entityName="BudgetEntry"
                                mode="save"
                                values={scanCurrent as Record<string, unknown>}
                                onChange={(field, value) => {
                                    setScanCurrent(prev => ({...(prev ?? {}), [field]: value}))
                                }}
                                errors={scanFormErrors}
                                dynamicOptions={{category: categories}}
                                skip={['category']}
                            />
                        </>
                    ) : (
                        <div>No items scanned</div>
                    )}
                </div>
            </Dialog>

        </div>
    )
}