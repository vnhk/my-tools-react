import { useEffect, useRef, useState } from 'react'
import styles from './RichTextEditor.module.css'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  readOnly?: boolean
  height?: string
  placeholder?: string
}

declare global {
  interface Window {
    Quill: any
  }
}

function loadQuill(): Promise<void> {
  if (window.Quill) return Promise.resolve()

  return new Promise((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js'
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}

export function RichTextEditor({
  value = '',
  onChange,
  readOnly = false,
  height = '300px',
  placeholder,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<any>(null)
  const [viewMode, setViewMode] = useState(readOnly)
  const idRef = useRef(`rte-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let quill: any = null

    loadQuill().then(() => {
      if (!editorRef.current || quillRef.current) return

      quill = new window.Quill(`#${idRef.current}`, { theme: 'snow', placeholder })
      quillRef.current = quill

      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value)
      }

      quill.enable(!viewMode)

      quill.on('text-change', () => {
        if (onChange) onChange(quill.root.innerHTML)
      })

      quill.clipboard.addMatcher(Node.ELEMENT_NODE, (_node: any, delta: any) => {
        delta.ops.forEach((op: any) => {
          if (op.attributes?.color) {
            const c = op.attributes.color.toLowerCase().replace(/\s/g, '')
            if (['#000000', '#000', 'black', 'rgb(0,0,0)', 'rgba(0,0,0,1)'].includes(c)) {
              delete op.attributes.color
            }
          }
        })
        return delta
      })
    })

    return () => {
      quillRef.current = null
    }
  }, [])

  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!viewMode)
    }
  }, [viewMode])

  useEffect(() => {
    if (quillRef.current && value !== undefined) {
      const current = quillRef.current.root.innerHTML
      if (current !== value) {
        quillRef.current.clipboard.dangerouslyPasteHTML(value)
      }
    }
  }, [value])

  return (
    <div className={styles.wrapper}>
      {!readOnly && (
        <button
          className={styles.toggleBtn}
          onClick={() => setViewMode((v) => !v)}
          type="button"
        >
          {viewMode ? 'Switch to Edit Mode' : 'Switch to View Mode'}
        </button>
      )}
      <div style={{ height, overflow: 'hidden', borderRadius: '4px' }}>
        <div id={idRef.current} ref={editorRef} style={{ height: '100%' }} />
      </div>
    </div>
  )
}
