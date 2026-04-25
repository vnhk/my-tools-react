import styles from './JsonLogViewer.module.css'

interface JsonLogViewerProps {
  value: string | null | undefined
}

function tryFormat(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

function highlightKeys(pretty: string): string {
  return pretty.replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>')
}

export function JsonLogViewer({ value }: JsonLogViewerProps) {
  if (!value) return null

  const formatted = tryFormat(value)

  if (formatted) {
    const highlighted = highlightKeys(formatted).replace(
      /("msg"\s*:\s*"[^"]*)\n([^"\n]*)/g,
      '$1<br>$2'
    )
    return (
      <div className={styles.viewer}>
        <pre
          className={styles.pre}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    )
  }

  return (
    <div className={styles.viewer}>
      <pre className={styles.pre}>{value}</pre>
    </div>
  )
}
