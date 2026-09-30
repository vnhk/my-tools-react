import {useEffect, useState} from 'react'

import {budgetEntriesApi, MoneyFlow, type BudgetEntry} from '../../api/investments'
import styles from './BudgetEntriesPage.module.css'
import {BudgetTreeTab} from "./BudgetTreeTab.tsx";
import {EntityFilters} from "../../components/ui/EntityFilters.tsx";
import {useEntityFilters} from "../../hooks/useEntityFilters.ts";
import {BudgetAnalyticsTab} from "./BudgetAnalyticsTab.tsx";
import { MoneyFlowTab } from './MoneyFlowTab.tsx';


import type React from 'react'
import {
    LuShoppingCart,
    LuUtensils,
    LuHouse,
    LuCar,
    LuBriefcase,
    LuSparkles,
    LuClapperboard,
    LuDisc,
    LuLandmark,
    LuStethoscope,
    LuPlane,
    LuGraduationCap,
    LuTag,
} from 'react-icons/lu'

export function getCategoryIcon(name: string): React.ReactNode {
    const l = name.toLowerCase()
    if (l.includes('shop') || l.includes('shopping')) return <LuShoppingCart className={styles.catIcon} />
    if (l.includes('food') || l.includes('restaurant')) return <LuUtensils className={styles.catIcon} />
    if (l.includes('house') || l.includes('rent') || l.includes('home')) return <LuHouse className={styles.catIcon} />
    if (l.includes('car') || l.includes('fuel') || l.includes('transport')) return <LuCar className={styles.catIcon} />
    if (l.includes('work') || l.includes('salary')) return <LuBriefcase className={styles.catIcon} />
    if (l.includes('wedding')) return <LuSparkles className={styles.catIcon} />
    if (l.includes('entertainment') || l.includes('movie') || l.includes('cinema')) return <LuClapperboard className={styles.catIcon} />
    if (l.includes('subscription') || l.includes('media')) return <LuDisc className={styles.catIcon} />
    if (l.includes('loan') || l.includes('bank')) return <LuLandmark className={styles.catIcon} />
    if (l.includes('health') || l.includes('medicine') || l.includes('pharmacy')) return <LuStethoscope className={styles.catIcon} />
    if (l.includes('travel') || l.includes('vacation') || l.includes('trip') || l.includes('hotel')) return <LuPlane className={styles.catIcon} />
    if (l.includes('education') || l.includes('course') || l.includes('school')) return <LuGraduationCap className={styles.catIcon} />
    return <LuTag className={styles.catIcon} />
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

type BudgetTab = 'Budget Tree' | 'Charts' | 'Money Flow'
const TABS: BudgetTab[] = ['Budget Tree', 'Charts', 'Money Flow']

export function BudgetEntriesPage() {
    const [entries, setEntries] = useState<BudgetEntry[]>([])
    const [firstLoading, setFirstLoading] = useState(true)
    const [moneyFlowData, setMoneyFlowData] = useState<MoneyFlow>()
    const [categories, setCategories] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState<BudgetTab>('Budget Tree')
    const {filters, setFilter, clearFilters} = useEntityFilters()

    const [loading, setLoading] = useState(true)
    const [initialLoading, setInitialLoading] = useState(true)

    const load = () => {
        setLoading(true)

        const now = new Date()
        const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
        const defaultTo = now.toISOString().slice(0, 10);

        if (firstLoading) {
            setFilter("entryDate_from", defaultFrom);
            setFilter("entryDate_to", defaultTo);
            setFirstLoading(false);
        }

        budgetEntriesApi
            .getAll({page: 0, size: 100000, ...filters})
            .then(res => setEntries((res.data as any).content ?? []))
            .then( _ => budgetEntriesApi.getMoneyFlow(filters)
                .then(res => setMoneyFlowData(res.data)))
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
                    <div className={styles.filtersRow}>
                        <div className={styles.root}>
                            <div className={styles.toolbar}>
                                <EntityFilters entityName="BudgetEntry" filters={filters}
                                               onFiltersChange={setFilter}
                                               onClear={clearFilters}/>
                            </div>
                        </div>
                    </div>
                    {activeTab === 'Budget Tree' && (
                        <BudgetTreeTab
                            entries={entries}
                            categories={categories}
                            onReload={load}
                        />
                    )}

                    {activeTab === 'Charts' && (
                        <BudgetAnalyticsTab entries={entries}/>
                    )}

                    {activeTab === 'Money Flow' && (
                        <MoneyFlowTab data={moneyFlowData}/>
                    )}
                </>
            )}
        </div>
    )
}
