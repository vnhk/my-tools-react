import client from './client'

export interface FieldConfig {
    field: string
    displayName: string
    internalName: string
    inSaveForm: boolean
    inEditForm: boolean
    inTable: boolean
    required: boolean
    min: number
    max: number
    wysiwyg: boolean
    sortable: boolean
    filterable: boolean
    fetchable: boolean
    strValues: string[] | null
    intValues: number[] | null
    dataType: string
    dynamicStrValues: boolean
    dynamicStrValuesList: string[] | null
}

export type EntityConfig = Record<string, FieldConfig>
export type AllEntityConfigs = Record<string, EntityConfig>

// Module-level cache — fetched once, reused everywhere
let cache: AllEntityConfigs | null = null
let pending: Promise<AllEntityConfigs> | null = null

export async function getEntityConfigs(): Promise<AllEntityConfigs> {
    if (cache) return cache
    if (pending) return pending
    pending = client.get<AllEntityConfigs>('/config').then((res) => {
        cache = res.data
        pending = null
        return cache
    })
    return pending
}

export function getEntityConfig(entityName: string): EntityConfig | undefined {
    return cache?.[entityName]
}

export function getTableColumns(entityName: string): FieldConfig[] {
    const config = cache?.[entityName]
    if (!config) return []
    return Object.values(config).filter((f) => f.inTable)
}

export function getSaveFormFields(entityName: string): FieldConfig[] {
    const config = cache?.[entityName]
    if (!config) return []
    return Object.values(config).filter((f) => f.inSaveForm)
}

export function getEditFormFields(entityName: string): FieldConfig[] {
    const config = cache?.[entityName]
    if (!config) return []
    return Object.values(config).filter((f) => f.inEditForm)
}

export function validateFields(entityName: string, values: Record<string, unknown>, mode?: 'save' | 'edit'): Record<string, string> {
    const config = cache?.[entityName]
    if (!config) return {}
    const errors: Record<string, string> = {}
    for (const [fieldName, col] of Object.entries(config)) {
        if (mode === 'save' && !col.inSaveForm) continue
        if (mode === 'edit' && !col.inEditForm) continue
        const val = values[fieldName]
        const str = val != null ? String(val) : ''
        if (col.required && !str.trim()) {
            errors[fieldName] = `${col.displayName} is required`
            continue
        }
        if (str.trim()) {
            if (str.length < col.min) errors[fieldName] = `${col.displayName} must be at least ${col.min} characters`
            else if (col.max > 0 && str.length > col.max) errors[fieldName] = `${col.displayName} must be at most ${col.max} characters`
        }
    }
    return errors
}
