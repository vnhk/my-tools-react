import {useEffect, useRef, useState} from 'react'
import {
    type IngredientDto,
    ingredientsApi,
    type RecipeIngredientDto,
    recipesApi,
    type UnitOption,
} from '../../api/cookBook'
import {CustomSelect} from '../../components/fields/CustomSelect'
import {useNotification} from '../../components/ui/Notification'
import styles from './RecipeDetailPage.module.css'

interface IngredientDialogProps {
    recipeId: string
    existingCategories: string[]
    units: UnitOption[]
    editingIngredient?: RecipeIngredientDto | null
    defaultIndex?: number
    onSaved: () => void
    onClose: () => void
}

export function IngredientDialog({
    recipeId,
    existingCategories,
    units,
    editingIngredient,
    defaultIndex = 1,
    onSaved,
    onClose,
}: IngredientDialogProps) {
    const {showSuccess, showError} = useNotification()
    const isEdit = !!editingIngredient

    const [ingSearch, setIngSearch] = useState(editingIngredient?.ingredientName ?? '')
    const [suggestions, setSuggestions] = useState<IngredientDto[]>([])
    const [selectedIng, setSelectedIng] = useState<IngredientDto | null>(null)
    const [qty, setQty] = useState(editingIngredient?.quantity != null ? String(editingIngredient.quantity) : '')
    const [unit, setUnit] = useState(editingIngredient?.unit ?? 'GRAM')
    const [category, setCategory] = useState(editingIngredient?.category ?? '')
    const [originalText, setOriginalText] = useState(editingIngredient?.originalText ?? '')
    const [variableName, setVariableName] = useState(editingIngredient?.variableName ?? '')
    const [optional, setOptional] = useState(editingIngredient?.optional ?? false)
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (isEdit) return
        if (debounce.current) clearTimeout(debounce.current)
        debounce.current = setTimeout(() => {
            if (!ingSearch.trim()) {
                setSuggestions([])
                return
            }
            ingredientsApi.list({
                page: 0,
                size: 50,
                sort: 'name',
                direction: 'desc',
                name: ingSearch,
            }).then(r => setSuggestions(r.data.content))
                .catch(() => {})
        }, 200)
    }, [ingSearch, isEdit])

    const handleSave = () => {
        const name = selectedIng?.name ?? ingSearch.trim()
        if (!name) {
            showError('Enter ingredient name')
            return
        }

        const payload = {
            ingredientId: selectedIng?.id ?? editingIngredient?.ingredientId ?? null,
            ingredientName: name,
            quantity: qty !== '' ? Number(qty) : null,
            unit: unit || null,
            category: category || null,
            originalText: originalText || null,
            variableName: variableName.trim() || null,
            optional,
        }

        if (isEdit && editingIngredient) {
            recipesApi.updateIngredient(recipeId, editingIngredient.id, payload)
                .then(() => {
                    showSuccess('Ingredient updated')
                    onSaved()
                    onClose()
                })
                .catch(() => showError('Failed to update ingredient'))
        } else {
            recipesApi.addIngredient(recipeId, payload)
                .then(() => {
                    showSuccess('Ingredient added')
                    onSaved()
                    onClose()
                })
                .catch(() => showError('Failed to add ingredient'))
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                <div className={styles.dialogHeader}>
                    <span className={styles.dialogTitle}>
                        {isEdit ? 'Edit Ingredient' : 'Add Ingredient'}
                    </span>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <label className={styles.dialogLabel}>Ingredient</label>
                    <input
                        className={styles.dialogInput}
                        value={ingSearch}
                        onChange={e => {
                            setIngSearch(e.target.value)
                            setSelectedIng(null)
                        }}
                        placeholder="Type to search..."
                    />
                    {suggestions.length > 0 && !selectedIng && (
                        <div className={styles.suggestions}>
                            {suggestions.map(s => (
                                <div
                                    key={s.id}
                                    className={styles.suggestion}
                                    onClick={() => {
                                        setSelectedIng(s)
                                        setIngSearch(s.name)
                                        setSuggestions([])
                                    }}
                                >
                                    {s.icon && <span>{s.icon} </span>}{s.name}
                                    {s.category && <span className={styles.suggCat}> · {s.category}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={styles.dialogRow}>
                        <div className={styles.dialogField}>
                            <label className={styles.dialogLabel}>Quantity</label>
                            <input
                                className={styles.dialogInput}
                                type="number"
                                step="any"
                                value={qty}
                                onChange={e => setQty(e.target.value)}
                            />
                        </div>
                        <div className={styles.dialogField}>
                            <label className={styles.dialogLabel}>Unit</label>
                            <CustomSelect
                                className={styles.dialogSelect}
                                options={units.map(u => ({value: u.value, label: u.label}))}
                                value={unit}
                                onChange={setUnit}
                            />
                        </div>
                    </div>

                    <div className={styles.dialogField}>
                        <label className={styles.dialogLabel}>
                            Variable Name (for instructions)
                        </label>
                        <input
                            className={styles.dialogInput}
                            value={variableName}
                            onChange={e => setVariableName(e.target.value)}
                            placeholder={`e.g. ingredient${defaultIndex} or flour`}
                        />
                        <span style={{fontSize: 10, color: 'var(--color-text-secondary)'}}>
                            Used as &#123;{variableName.trim() || `ingredient${defaultIndex}`}&#125; in recipe steps for dynamic scaling.
                        </span>
                    </div>

                    <label className={styles.dialogLabel}>Category (e.g., Na ciasto)</label>
                    <input
                        className={styles.dialogInput}
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        list="cats"
                        placeholder="Optional grouping"
                    />
                    <datalist id="cats">{existingCategories.map(c => <option key={c} value={c}/>)}</datalist>

                    <label className={styles.dialogLabel}>Original text</label>
                    <input
                        className={styles.dialogInput}
                        value={originalText}
                        onChange={e => setOriginalText(e.target.value)}
                        placeholder="e.g., 2 szklanki mąki pszennej"
                    />

                    <label className={styles.checkLabel}>
                        <input
                            type="checkbox"
                            checked={optional}
                            onChange={e => setOptional(e.target.checked)}
                        />
                        Optional ingredient
                    </label>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={handleSave}>
                        {isEdit ? 'Save Changes' : 'Add'}
                    </button>
                    <button className={styles.btn} onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
