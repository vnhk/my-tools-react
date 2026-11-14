export type LogFormat = 'json' | 'text'

export function formatLog(raw: string, hidden: Set<string>, format: LogFormat, expanded = true) {
    let fields: Record<string, unknown>
    try {
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {text: raw, level: ''}
        fields = Object.fromEntries(Object.entries(parsed).filter(([key]) => !hidden.has(key)))
    } catch {
        return {text: raw, level: ''}
    }
    const value = (key: string) => {
        const item = fields[key]
        return item == null ? '' : typeof item === 'string' ? item : JSON.stringify(item)
    }
    const level = value('level')
    if (format === 'json') return {text: JSON.stringify(fields, null, expanded ? 2 : undefined), level}
    const source = [value('package'), value('class')].filter(Boolean).join('.')
    const method = value('method') + (value('line') ? '(' + value('line') + ')' : '')
    const location = [value('moduleName'), source, method].filter(Boolean).join(':')
    const prefix = [level ? '[' + level + ']' : '', value('date'), location].filter(Boolean).join(' ')
    const message = value('msg')
    const standard = new Set(['level', 'date', 'moduleName', 'package', 'class', 'method', 'line', 'msg'])
    const extra = Object.keys(fields).filter(key => !standard.has(key)).map(key => key + '=' + value(key))
    const text = prefix + (prefix && message ? ': ' : '') + message
    return {text: [text, ...extra].filter(Boolean).join(' '), level}
}
