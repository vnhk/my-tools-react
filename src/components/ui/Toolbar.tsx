import { ReactNode } from 'react'
import styles from './Toolbar.module.css'

interface ToolbarProps {
    children: ReactNode
    className?: string
}

// Generic flex-wrap row for a page's top controls (Import/Export, EntityFilters,
// Add button, custom filters/toggles) so they sit in one row instead of each
// component stacking itself as a separate block.
export function Toolbar({ children, className = '' }: ToolbarProps) {
    return <div className={`${styles.toolbar} ${className}`}>{children}</div>
}
