import {ScanReceipt} from "./ScanReceipt.tsx";
import {useEffect, useState} from "react";
import {budgetEntriesApi} from "../../api/investments.ts";

export function BudgetMobileScanPage() {
    const [categories, setCategories] = useState<string[]>([])

    useEffect(() => {
        budgetEntriesApi.getCategories().then(r => setCategories(r.data))
    }, [])

    const scanReceiptPost = () => {

    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20
        }}>

            <ScanReceipt
                categories={categories}
                onReload={scanReceiptPost}
            />
        </div>
    )
}