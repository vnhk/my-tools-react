import {useEffect, useState} from 'react'

import {budgetEntriesApi, type BudgetEntry} from '../../api/investments'
import styles from './BudgetEntriesPage.module.css'
import {BudgetTreeTab} from "./BudgetTreeTab.tsx";
import {EntityFilters} from "../../components/ui/EntityFilters.tsx";
import {useEntityFilters} from "../../hooks/useEntityFilters.ts";
import {BudgetAnalyticsTab} from "./BudgetAnalyticsTab.tsx";


export function getCategoryIcon(name: string): string {
    const l = name.toLowerCase()
    if (l.includes('shop') || l.includes('shopping')) return '🛒'
    if (l.includes('food')) return '🍴'
    if (l.includes('house') || l.includes('rent')) return '🏠'
    if (l.includes('car')) return '🚗'
    if (l.includes('work')) return '💼'
    if (l.includes('wedding')) return '💍'
    if (l.includes('entertainment')) return '🎬'
    if (l.includes('subscription')) return '📀'
    if (l.includes('loan')) return '🏦'
    return '🏷️'
}

// TO BE CHANGED, USE BACKED TODO
export function toPln(value: number, currency: string): number {
    if (currency === 'EUR') return value * 4.34
    if (currency === 'USD') return value * 3.7
    return value
}

export function fmt(amount: number, currency = 'PLN'): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency', currency, maximumFractionDigits: 2,
    }).format(Math.abs(amount))
}

// ── Main page ─────────────────────────────────────────────────────────────────

type BudgetTab = 'Budget Tree' | 'Charts'
const TABS: BudgetTab[] = ['Budget Tree', 'Charts']

export function BudgetEntriesPage() {
    const [entries, setEntries] = useState<BudgetEntry[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState<BudgetTab>('Budget Tree')
    const {filters, setFilter, clearFilters} = useEntityFilters()

    const [loading, setLoading] = useState(true)
    const [initialLoading, setInitialLoading] = useState(true)

    const load = () => {
        setLoading(true)

        budgetEntriesApi
            .getAll({page: 0, size: 100000, ...filters})
            .then(res => setEntries((res.data as any).content ?? []))
            .finally(() => {
                setLoading(false)
                setInitialLoading(false)
            })
    }

    useEffect(() => {
        load()
    }, [JSON.stringify(filters)])

    useEffect(() => {
        budgetEntriesApi.getCategories().then(r => setCategories(r.data))
    }, [])

    return (
        <div className={styles.page}>
            {/* Inner tabs */}
            <div className={styles.innerTabRow}>
                {TABS.map(t => (
                    <button key={t}
                            className={`${styles.innerTabBtn} ${t === activeTab ? styles.innerTabActive : ''}`}
                            onClick={() => setActiveTab(t)}>{t}</button>
                ))}
            </div>

            {initialLoading ? (
                <div className={styles.stateMsg}>Loading…</div>
            ) : (
                <>
                    {loading && <div className={styles.refreshing}>Updating...</div>}
                    <span className={styles.filtersRow}>
                                <div className={styles.root}>
                                     <div className={styles.toolbar}>
                                    <EntityFilters entityName="BudgetEntry" filters={filters}
                                                   onFiltersChange={setFilter}
                                                   onClear={clearFilters}/>
                                     </div>
                                </div>
                            </span>
                    {activeTab === 'Budget Tree' && (
                        <div>
                            <BudgetTreeTab
                                entries={entries}
                                categories={categories}
                                onReload={load}
                            />
                        </div>
                    )}

                    {activeTab === 'Charts' && (
                        <BudgetAnalyticsTab entries={entries}/>
                    )}
                </>
            )}
        </div>
    )
}
