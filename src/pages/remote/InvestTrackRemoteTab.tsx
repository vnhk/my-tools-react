import styles from './RemoteControlPage.module.css'

interface Props {
    connected: boolean
    send: (action: string, data?: Record<string, unknown>) => void
    months: { key: string; label: string }[]
    expandedKeys: string[]
}

// Read-only: navigation + expand/collapse only, nothing here can edit data.
export function InvestTrackRemoteTab({ connected, send, months, expandedKeys }: Props) {
    return (
        <div className={styles.controls}>
            <div className={styles.section}>
                <div className={styles.row}>
                    <button
                        className={styles.remoteBtn}
                        disabled={!connected}
                        onClick={() => send('NAVIGATE', { url: '/invest-track/dashboard' })}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        className={styles.remoteBtn}
                        disabled={!connected}
                        onClick={() => send('NAVIGATE', { url: '/invest-track/budget-tree' })}
                    >
                        🌳 Budget Tree
                    </button>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.row}>
                    <button
                        className={styles.remoteBtn}
                        disabled={!connected}
                        onClick={() => send('INVEST_EXPAND_ALL')}
                    >
                        ▼ Expand All
                    </button>
                    <button
                        className={styles.remoteBtn}
                        disabled={!connected}
                        onClick={() => send('INVEST_COLLAPSE_ALL')}
                    >
                        ▶ Collapse All
                    </button>
                </div>
            </div>

            {months.length > 0 && (
                <div className={styles.section}>
                    <div className={styles.searchLabel}>Months (open Budget Tree on the TV to see this list)</div>
                    <div className={styles.filterChips}>
                        {months.map((m) => (
                            <button
                                key={m.key}
                                className={expandedKeys.includes(m.key) ? styles.chipActive : styles.chip}
                                disabled={!connected}
                                onClick={() => send('INVEST_TOGGLE_MONTH', { key: m.key })}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
