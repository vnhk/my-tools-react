/**
 * Stub until full logs viewer is wired (filters, pagination, API).
 * Keeps Docker / CI builds green when routes reference this module.
 */
export function LogsPage() {
  return (
    <div style={{ color: 'var(--color-text-secondary)' }}>
      Logs viewer — wire backend API here (time range, level, app, export).
    </div>
  )
}
